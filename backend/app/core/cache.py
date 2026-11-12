import asyncio
import time
from collections import OrderedDict
from typing import Any, Awaitable, Callable, Dict, Optional, Tuple


def _consume_future_exception(fut: asyncio.Future) -> None:
    if not fut.cancelled():
        try:
            fut.exception()
        except Exception:
            pass


class LRUTTLCache:
    """
    High-speed in-memory LRU Cache with Time-To-Live (TTL) expiration,
    bounded capacity, stale fallback window, and in-flight request coalescing
    to prevent cache stampedes under high concurrency.
    """

    def __init__(self, max_size: int = 1000, default_ttl: int = 3600, stale_ttl: int = 86400):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.stale_ttl = stale_ttl
        # OrderedDict stores key -> (value, fresh_until_ts, stale_until_ts)
        self._store: OrderedDict[str, Tuple[Any, float, float]] = OrderedDict()
        # key -> in-flight Task/Future for request deduplication (singleflight)
        self._in_flight: Dict[str, asyncio.Future] = {}
        self.hits = 0
        self.misses = 0
        self.coalesced = 0

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            self.misses += 1
            return None

        val, fresh_until, stale_until = entry
        now = time.monotonic()

        if now > fresh_until:
            # Remove completely only if past stale window too; otherwise keep stale entry for fallback
            if now > stale_until:
                self._store.pop(key, None)
            self.misses += 1
            return None

        self._store.move_to_end(key)
        self.hits += 1
        return val

    def get_stale(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        val, _fresh_until, stale_until = entry
        if time.monotonic() > stale_until:
            self._store.pop(key, None)
            return None
        return val

    def set(self, key: str, val: Any, ttl: Optional[int] = None) -> None:
        now = time.monotonic()
        effective_ttl = ttl if ttl is not None else self.default_ttl
        fresh_until = now + effective_ttl
        stale_until = now + max(effective_ttl, self.stale_ttl)

        if key in self._store:
            self._store.move_to_end(key)
        self._store[key] = (val, fresh_until, stale_until)

        # Prune oldest entries once max_size is exceeded
        while len(self._store) > self.max_size:
            self._store.popitem(last=False)

    def purge_expired(self) -> int:
        now = time.monotonic()
        expired_keys = [k for k, (_, _, stale_until) in self._store.items() if now > stale_until]
        for k in expired_keys:
            self._store.pop(k, None)
        return len(expired_keys)

    async def get_or_load(
        self,
        key: str,
        loader: Callable[[], Awaitable[Any]],
        ttl: Optional[int] = None,
    ) -> Any:
        """
        Singleflight cache lookup:
        - Returns cached fresh entry immediately if available.
        - Otherwise deduplicates concurrent loaders for the same key so only 1 upstream call runs.
        """
        cached = self.get(key)
        if cached is not None:
            return cached

        existing_future = self._in_flight.get(key)
        if existing_future is not None:
            self.coalesced += 1
            return await asyncio.shield(existing_future)

        loop = asyncio.get_running_loop()
        future: asyncio.Future = loop.create_future()
        future.add_done_callback(_consume_future_exception)
        self._in_flight[key] = future

        try:
            value = await loader()
            self.set(key, value, ttl=ttl)
            if not future.done():
                future.set_result(value)
            return value
        except Exception as exc:
            stale = self.get_stale(key)
            if stale is not None:
                if not future.done():
                    future.set_result(stale)
                return stale
            if not future.done():
                future.set_exception(exc)
            raise
        finally:
            if self._in_flight.get(key) is future:
                self._in_flight.pop(key, None)

    def clear(self) -> None:
        self._store.clear()
        self._in_flight.clear()

    def stats(self) -> Dict[str, Any]:
        total = self.hits + self.misses
        hit_ratio = round((self.hits / total * 100), 2) if total > 0 else 0.0
        return {
            "size": len(self._store),
            "max_size": self.max_size,
            "in_flight": len(self._in_flight),
            "hits": self.hits,
            "misses": self.misses,
            "coalesced": self.coalesced,
            "hit_ratio_percent": hit_ratio,
        }


# Global shared cache instances
# Catalog / trending cache (TTL: 1 hour)
catalog_cache = LRUTTLCache(max_size=500, default_ttl=3600, stale_ttl=86400)
# Search query cache (TTL: 15 minutes)
search_cache = LRUTTLCache(max_size=500, default_ttl=900, stale_ttl=14400)
# Title details cache (TTL: 24 hours)
details_cache = LRUTTLCache(max_size=1000, default_ttl=86400, stale_ttl=172800)

