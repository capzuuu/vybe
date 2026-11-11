import re
from typing import List
from fastapi import APIRouter, Path, Query, Request, Response
from app.services.tmdb import (
    TitleOut,
    format_tmdb_item,
    tmdb_request,
    validate_tmdb_endpoint,
)
from app.core.cache import catalog_cache, search_cache, details_cache

router = APIRouter(prefix="/titles", tags=["titles"])

_CATALOG_CACHE_CONTROL = "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600"
_SEARCH_CACHE_CONTROL = "public, max-age=120, s-maxage=600, stale-while-revalidate=1800"
_DETAILS_CACHE_CONTROL = "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400"


@router.get("/trending", response_model=List[TitleOut])
async def get_trending(response: Response):
    """Fetch live trending movies and TV shows from TMDB with 1-hour cache."""
    response.headers["Cache-Control"] = _CATALOG_CACHE_CONTROL
    data = await tmdb_request("/trending/all/week", cache_store=catalog_cache, ttl=3600)
    return [format_tmdb_item(i) for i in data.get("results", []) if i.get("backdrop_path")]


@router.get("/movies", response_model=List[TitleOut])
async def get_popular_movies(response: Response):
    """Fetch live popular movies from TMDB with 1-hour cache."""
    response.headers["Cache-Control"] = _CATALOG_CACHE_CONTROL
    data = await tmdb_request("/movie/popular", cache_store=catalog_cache, ttl=3600)
    return [format_tmdb_item(i, "movie") for i in data.get("results", []) if i.get("backdrop_path")]


@router.get("/tv", response_model=List[TitleOut])
async def get_popular_tv(response: Response):
    """Fetch live popular TV shows from TMDB with 1-hour cache."""
    response.headers["Cache-Control"] = _CATALOG_CACHE_CONTROL
    data = await tmdb_request("/tv/popular", cache_store=catalog_cache, ttl=3600)
    return [format_tmdb_item(i, "tv") for i in data.get("results", []) if i.get("backdrop_path")]


@router.get("/search", response_model=List[TitleOut])
async def search_titles(
    response: Response,
    q: str = Query(..., min_length=1, max_length=80, description="Search term for movies or TV shows"),
):
    """
    Search movies and TV shows securely with input sanitization and 15-minute search cache.
    """
    response.headers["Cache-Control"] = _SEARCH_CACHE_CONTROL
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


@router.get("/proxy/{path:path}")
async def proxy_tmdb(
    path: str,
    request: Request,
    response: Response,
):
    """
    Allowlisted backend proxy for read-only TMDB catalog endpoints.
    Prevents SSRF/path traversal, strips unauthorized query keys, and enables edge caching.
    """
    endpoint = validate_tmdb_endpoint(path)
    is_search = endpoint.startswith("/search/")
    is_details = bool(re.fullmatch(r"^/(movie|tv)/[1-9]\d{0,8}$", endpoint))

    cache_store = search_cache if is_search else details_cache if is_details else catalog_cache
    ttl = 900 if is_search else 86400 if is_details else 1800
    response.headers["Cache-Control"] = (
        _SEARCH_CACHE_CONTROL if is_search else _DETAILS_CACHE_CONTROL if is_details else _CATALOG_CACHE_CONTROL
    )

    params = dict(request.query_params)
    return await tmdb_request(endpoint, params=params, cache_store=cache_store, ttl=ttl)


@router.get("/{media_type}/{tmdb_id}", response_model=TitleOut)
async def get_title_details(
    response: Response,
    media_type: str = Path(..., pattern="^(movie|tv)$", description="Type: movie or tv"),
    tmdb_id: int = Path(..., gt=0, lt=100000000, description="Valid TMDB identifier"),
):
    """
    Fetch complete metadata, cast, and external IDs with 24-hour cache.
    """
    response.headers["Cache-Control"] = _DETAILS_CACHE_CONTROL
    endpoint = f"/{media_type}/{tmdb_id}"
    data = await tmdb_request(
        endpoint,
        params={"append_to_response": "credits,external_ids"},
        cache_store=details_cache,
        ttl=86400,
    )
    return format_tmdb_item(data, media_type)

