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


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="High-performance, secure streaming metadata backend for Vybe",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── 1. Performance Compression Middleware ────────────────────────────
# Automatically compresses JSON payloads > 500 bytes (70-85% size reduction)
app.add_middleware(GZipMiddleware, minimum_size=500)

# ── 2. Defense-in-depth Security Headers & Latency Timing ─────────────
app.add_middleware(SecurityHeadersMiddleware)

# ── 3. Sliding-window Rate Limiter (180 requests/min/IP) ─────────────
app.add_middleware(RateLimitMiddleware, max_requests=180, window_seconds=60)

# ── 4. CORS Configuration ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Response-Time", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
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
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
    }
