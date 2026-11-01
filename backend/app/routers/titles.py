import re
from typing import List
from fastapi import APIRouter, HTTPException, Path, Query, Request
from app.services.tmdb import (
    TitleOut,
    format_tmdb_item,
    tmdb_request,
)
from app.core.cache import catalog_cache, search_cache, details_cache

router = APIRouter(prefix="/titles", tags=["titles"])


@router.get("/trending", response_model=List[TitleOut])
async def get_trending():
    """Fetch live trending movies and TV shows from TMDB with 1-hour cache."""
    data = await tmdb_request("/trending/all/week", cache_store=catalog_cache, ttl=3600)
    return [format_tmdb_item(i) for i in data.get("results", []) if i.get("backdrop_path")]


@router.get("/movies", response_model=List[TitleOut])
async def get_popular_movies():
    """Fetch live popular movies from TMDB with 1-hour cache."""
    data = await tmdb_request("/movie/popular", cache_store=catalog_cache, ttl=3600)
    return [format_tmdb_item(i, "movie") for i in data.get("results", []) if i.get("backdrop_path")]


@router.get("/tv", response_model=List[TitleOut])
async def get_popular_tv():
    """Fetch live popular TV shows from TMDB with 1-hour cache."""
    data = await tmdb_request("/tv/popular", cache_store=catalog_cache, ttl=3600)
    return [format_tmdb_item(i, "tv") for i in data.get("results", []) if i.get("backdrop_path")]


@router.get("/search", response_model=List[TitleOut])
async def search_titles(
    q: str = Query(..., min_length=1, max_length=80, description="Search term for movies or TV shows"),
):
    """
    Search movies and TV shows securely with input sanitization and 15-minute search cache.
    """
    # Sanitize input: strip and remove harmful control characters
    sanitized = re.sub(r"[\x00-\x1f\x7f]", "", q).strip()
    if not sanitized:
        return []

    data = await tmdb_request(
        "/search/multi",
        params={"query": sanitized, "include_adult": "false"},
        cache_store=search_cache,
        ttl=900,
    )

    results = []
    for item in data.get("results", []):
        media_type = item.get("media_type")
        if media_type in ("movie", "tv") and (item.get("backdrop_path") or item.get("poster_path")):
            results.append(format_tmdb_item(item, media_type))

    return results


@router.get("/{media_type}/{tmdb_id}", response_model=TitleOut)
async def get_title_details(
    media_type: str = Path(..., pattern="^(movie|tv)$", description="Type: movie or tv"),
    tmdb_id: int = Path(..., gt=0, lt=100000000, description="Valid TMDB identifier"),
):
    """
    Fetch complete metadata, cast, and external IDs with 24-hour cache.
    """
    endpoint = f"/{media_type}/{tmdb_id}"
    data = await tmdb_request(
        endpoint,
        params={"append_to_response": "credits,external_ids"},
        cache_store=details_cache,
        ttl=86400,
    )
    return format_tmdb_item(data, media_type)


@router.get("/proxy/{path:path}")
async def proxy_tmdb(
    path: str,
    request: Request,
):
    """
    Secure backend proxy for TMDB endpoints.
    Keeps the TMDB API key strictly on the server and applies caching and rate limiting.
    """
    params = dict(request.query_params)
    endpoint = f"/{path.lstrip('/')}"
    return await tmdb_request(endpoint, params=params, cache_store=catalog_cache, ttl=1800)

