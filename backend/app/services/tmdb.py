import asyncio
import importlib.util
import logging
import re
from typing import Any, Dict, Optional
import httpx
from fastapi import HTTPException
from pydantic import BaseModel
from app.core.config import settings
from app.core.cache import catalog_cache

logger = logging.getLogger("vybe.tmdb")

TMDB_BASE_URL = "https://api.themoviedb.org/3"
_HTTP2_AVAILABLE = importlib.util.find_spec("h2") is not None

# Strict read-only endpoint allowlist to prevent SSRF / path traversal
_ALLOWED_ENDPOINT_PATTERNS = (
    re.compile(r"^/trending/(all|movie|tv)/(day|week)$"),
    re.compile(r"^/movie/(popular|top_rated|now_playing|upcoming)$"),
    re.compile(r"^/tv/(popular|top_rated|on_the_air|airing_today)$"),
    re.compile(r"^/discover/(movie|tv)$"),
    re.compile(r"^/search/(multi|movie|tv)$"),
    re.compile(r"^/genre/(movie|tv)/list$"),
    re.compile(r"^/(movie|tv)/[1-9]\d{0,8}$"),
)

_ALLOWED_QUERY_KEYS = frozenset({
    "language",
    "page",
    "query",
    "include_adult",
    "sort_by",
    "with_genres",
    "with_original_language",
    "vote_count.gte",
    "region",
    "append_to_response",
})

_ALLOWED_APPEND_TOKENS = frozenset({
    "credits",
    "videos",
    "similar",
    "external_ids",
    "images",
    "recommendations",
})

# Shared AsyncClient reference initialized during FastAPI lifespan
_async_client: Optional[httpx.AsyncClient] = None


def get_async_client() -> httpx.AsyncClient:
    global _async_client
    if _async_client is None or _async_client.is_closed:
        _async_client = httpx.AsyncClient(
            http2=_HTTP2_AVAILABLE,
            timeout=httpx.Timeout(8.0, connect=3.5, read=6.0),
            limits=httpx.Limits(
                max_keepalive_connections=50,
                max_connections=200,
                keepalive_expiry=30.0,
            ),
            headers={"User-Agent": "Vybe-Streaming/2.0", "Accept": "application/json"},
        )
    return _async_client


async def close_async_client() -> None:
    global _async_client
    if _async_client and not _async_client.is_closed:
        await _async_client.aclose()
        _async_client = None


def validate_tmdb_endpoint(path: str) -> str:
    raw = (path or "").strip()
    lower = raw.lower()
    if (
        not raw
        or ".." in raw
        or "%2e" in lower
        or "\\" in raw
        or "://" in raw
        or "@" in raw
        or any(ord(ch) < 32 for ch in raw)
    ):
        raise HTTPException(status_code=400, detail="Invalid metadata endpoint")

    normalized = "/" + raw.lstrip("/")
    if not any(pattern.fullmatch(normalized) for pattern in _ALLOWED_ENDPOINT_PATTERNS):
        raise HTTPException(status_code=404, detail="Unsupported metadata endpoint")
    return normalized


def sanitize_tmdb_params(params: Optional[Dict[str, Any]]) -> Dict[str, str]:
    sanitized: Dict[str, str] = {"language": "en-US"}
    if not params:
        return sanitized

    for key, val in params.items():
        if key not in _ALLOWED_QUERY_KEYS or val is None:
            continue
        text = re.sub(r"[\x00-\x1f\x7f]", "", str(val)).strip()
        if not text:
            continue

        if key == "page":
            if text.isdigit():
                page_num = max(1, min(500, int(text)))
                sanitized[key] = str(page_num)
            continue

        if key == "include_adult":
            sanitized[key] = "true" if text.lower() == "true" else "false"
            continue

        if key == "append_to_response":
            tokens = [t.strip() for t in text.split(",") if t.strip() in _ALLOWED_APPEND_TOKENS]
            if tokens:
                sanitized[key] = ",".join(dict.fromkeys(tokens))
            continue

        if key in ("query", "sort_by", "with_genres", "with_original_language", "vote_count.gte", "region", "language"):
            sanitized[key] = text[:80]

    return sanitized


class TitleOut(BaseModel):
    id: str
    tmdbId: int
    imdbId: Optional[str] = None
    type: str
    name: str
    synopsis: str = ""
    year: int = 2024
    rating: float = 7.0
    popularity: float = 0.0
    backdrop: str = ""
    poster: str = ""
    videoUrl: str = ""


def format_tmdb_item(item: Dict[str, Any], default_type: str = "movie") -> TitleOut:
    media_type = item.get("media_type") or default_type
    name = item.get("title") or item.get("name") or "Untitled"
    tmdb_id = int(item.get("id", 0))
    date_str = item.get("release_date") or item.get("first_air_date") or ""
    year = int(date_str[:4]) if len(date_str) >= 4 and date_str[:4].isdigit() else 2024

    backdrop_path = item.get("backdrop_path")
    poster_path = item.get("poster_path")

    backdrop = (
        f"https://image.tmdb.org/t/p/w1280{backdrop_path}"
        if backdrop_path
        else f"https://image.tmdb.org/t/p/w500{poster_path}"
        if poster_path
        else ""
    )
    poster = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else ""

    # Direct VidLink PRO stream URL
    video_url = (
        f"https://vidlink.pro/movie/{tmdb_id}?primaryColor=e50914&autoplay=true"
        if media_type == "movie"
        else f"https://vidlink.pro/tv/{tmdb_id}/1/1?primaryColor=e50914&autoplay=true"
    )

    return TitleOut(
        id=f"{media_type}-{tmdb_id}",
        tmdbId=tmdb_id,
        imdbId=item.get("imdb_id"),
        type=media_type,
        name=name,
        synopsis=item.get("overview") or "",
        year=year,
        rating=round(float(item.get("vote_average", 7.0)), 1),
        popularity=round(float(item.get("popularity", 0.0)), 1),
        backdrop=backdrop,
        poster=poster,
        videoUrl=video_url,
    )


async def tmdb_request(
    endpoint: str,
    params: Optional[Dict[str, str]] = None,
    cache_store=catalog_cache,
    ttl: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Executes an asynchronous, pooled HTTP request to TMDB with LRU TTL caching,
    singleflight request coalescing, and sanitized upstream errors.
    """
    safe_endpoint = validate_tmdb_endpoint(endpoint)
    safe_params = sanitize_tmdb_params(params)

    # Canonical cache key excluding api_key
    cache_key = f"{safe_endpoint}?" + "&".join(f"{k}={v}" for k, v in sorted(safe_params.items()))

    async def _fetch_from_tmdb() -> Dict[str, Any]:
        query_params = {**safe_params, "api_key": settings.TMDB_API_KEY}
        client = get_async_client()
        url = f"{TMDB_BASE_URL}{safe_endpoint}"

        for attempt in range(2):
            try:
                response = await client.get(url, params=query_params)
                if response.status_code == 200:
                    return response.json()
                if response.status_code == 404:
                    raise HTTPException(status_code=404, detail="Title not found")
                if response.status_code == 429:
                    if attempt == 0:
                        await asyncio.sleep(0.8)
                        continue
                    raise HTTPException(status_code=429, detail="Metadata rate limit reached, please retry shortly")

                logger.warning("TMDB upstream returned HTTP %s for %s", response.status_code, safe_endpoint)
                raise HTTPException(status_code=502, detail="Upstream metadata service unavailable")
            except httpx.RequestError as exc:
                logger.warning("TMDB request failed (%s) on attempt %d", type(exc).__name__, attempt + 1)
                if attempt == 0:
                    await asyncio.sleep(0.35)
                    continue
                raise HTTPException(status_code=502, detail="Unable to reach upstream metadata service")

        raise HTTPException(status_code=502, detail="Failed to retrieve metadata")

    return await cache_store.get_or_load(cache_key, _fetch_from_tmdb, ttl=ttl)

