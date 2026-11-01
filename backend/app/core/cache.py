import time
from typing import Any, Dict, Optional, Tuple
from collections import OrderedDict


class LRUTTLCache:
    """
    High-speed in-memory LRU Cache with Time-To-Live (TTL) expiration.
    Thread-safe for asyncio event loop operations.
    """

    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        # OrderedDict stores key -> (value, expire_at_timestamp)
        self._store: OrderedDict[str, Tuple[Any, float]] = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        if key not in self._store:
            self.misses += 1
            return None

        val, expire_at = self._store[key]
        now = time.time()

        if now > expire_at:
            # Expired
            del self._store[key]
            self.misses += 1
            return None

        # Move to end (most recently used)
        self._store.move_to_end(key)
        self.hits += 1
        return val

    def set(self, key: str, val: Any, ttl: Optional[int] = None) -> None:
        now = time.time()
        expire_at = now + (ttl if ttl is not None else self.default_ttl)

        if key in self._store:
            self._store.move_to_end(key)
        self._store[key] = (val, expire_at)

        # Evict oldest entry if size exceeded
        while len(self._store) > self.max_size:
            self._store.popitem(last=False)

    def clear(self) -> None:
        self._store.clear()

    def stats(self) -> Dict[str, Any]:
        total = self.hits + self.misses
        hit_ratio = round((self.hits / total * 100), 2) if total > 0 else 0.0
        return {
            "size": len(self._store),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio_percent": hit_ratio,
        }


# Global shared cache instances
# Catalog / trending cache (TTL: 1 hour)
catalog_cache = LRUTTLCache(max_size=500, default_ttl=3600)
# Search query cache (TTL: 15 minutes)
search_cache = LRUTTLCache(max_size=500, default_ttl=900)
# Title details cache (TTL: 24 hours)
details_cache = LRUTTLCache(max_size=1000, default_ttl=86400)

