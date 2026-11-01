import os
import asyncio
from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field
from app.core.config import settings
from app.core.cache import catalog_cache, search_cache, details_cache

TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Shared AsyncClient reference initialized during FastAPI lifespan
_async_client: Optional[httpx.AsyncClient] = None


def get_async_client() -> httpx.AsyncClient:
    global _async_client
    if _async_client is None or _async_client.is_closed:
        _async_client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=50, max_connections=200),
            headers={"User-Agent": "Vybe-Streaming/2.0", "Accept": "application/json"},
        )
    return _async_client


async def close_async_client() -> None:
    global _async_client
    if _async_client and not _async_client.is_closed:
        await _async_client.aclose()
        _async_client = None


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
    Executes an asynchronous, pooled HTTP request to TMDB with intelligent LRU TTL caching.
    """
    api_key = settings.TMDB_API_KEY
    query_params: Dict[str, str] = {"api_key": api_key, "language": "en-US"}
    if params:
        query_params.update(params)

    # Cache key includes endpoint and sorted parameters
    cache_key = f"{endpoint}?" + "&".join(f"{k}={v}" for k, v in sorted(query_params.items()) if k != "api_key")

    cached_data = cache_store.get(cache_key)
    if cached_data is not None:
        return cached_data

    client = get_async_client()
    url = f"{TMDB_BASE_URL}{endpoint}"

    # Asynchronous request with 1 automatic retry on transient failure
    for attempt in range(2):
        try:
            response = await client.get(url, params=query_params)
            if response.status_code == 200:
                data = response.json()
                cache_store.set(cache_key, data, ttl=ttl)
                return data
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail="Title not found on TMDB")
            elif response.status_code == 429:
                if attempt == 0:
                    await asyncio.sleep(1.0)
                    continue
                raise HTTPException(status_code=429, detail="TMDB rate limit reached, please retry momentarily")
            else:
                raise HTTPException(status_code=response.status_code, detail=f"TMDB API error: {response.text}")
        except httpx.RequestError as exc:
            if attempt == 0:
                await asyncio.sleep(0.5)
                continue
            raise HTTPException(status_code=502, detail=f"TMDB Gateway connection error: {str(exc)}")

    raise HTTPException(status_code=502, detail="Failed to retrieve data from TMDB")

