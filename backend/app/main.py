import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.core.config import settings
from app.core.cache import catalog_cache, search_cache, details_cache
from app.services.tmdb import get_async_client, close_async_client
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
from app.routers import items, titles

START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Warm up pooled async HTTP connection
    get_async_client()
    yield
    # Shutdown: Cleanly close connection pools
    await close_async_client()


docs_enabled = settings.ENABLE_DOCS

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="High-performance, secure streaming metadata backend for Vybe",
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if docs_enabled else None,
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    lifespan=lifespan,
)

# ── 1. Performance Compression Middleware ────────────────────────────
# Compresses JSON payloads > 500 bytes (70-85% size reduction)
app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=5)

# ── 2. Defense-in-depth Security Headers & Latency Timing (pure ASGI) ─
app.add_middleware(SecurityHeadersMiddleware)

# ── 3. Sliding-window Bounded Rate Limiter (pure ASGI) ───────────────
app.add_middleware(
    RateLimitMiddleware,
    max_requests=settings.RATE_LIMIT_MAX_REQUESTS,
    window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
    trust_proxy_headers=settings.TRUST_PROXY_HEADERS,
)

# ── 4. Strictly Scoped CORS Configuration ────────────────────────────
# Never allow wildcard origins with allow_credentials=True.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["X-Response-Time", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    max_age=600,
)


# ── 5. System Health & Diagnostics ───────────────────────────────────
@app.get("/health", tags=["system"])
@app.get("/api/health", tags=["system"])
def health_check():
    """
    Returns live service health, uptime, and multi-tier cache metrics.
    """
    uptime_seconds = int(time.time() - START_TIME)
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "uptime_seconds": uptime_seconds,
        "cache": {
            "catalog": catalog_cache.stats(),
            "search": search_cache.stats(),
            "details": details_cache.stats(),
        },
    }


# ── 6. Include API Routers ───────────────────────────────────────────
app.include_router(items.router, prefix=settings.API_V1_STR)
app.include_router(titles.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API v2.0",
        "api_v1": settings.API_V1_STR,
    }
