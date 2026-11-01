import time
from collections import defaultdict
from typing import Dict, List
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Appends OWASP recommended defense-in-depth security headers
    and high-resolution response timing metrics.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = (time.perf_counter() - start_time) * 1000

        # Performance timing header (e.g. X-Response-Time: 1.84ms)
        response.headers["X-Response-Time"] = f"{process_time:.2f}ms"

        # OWASP Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"

        # Enable HSTS on secure HTTPS connections
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window in-memory rate limiter protecting endpoints from DDoS,
    scraping, and API quota abuse.
    """

    def __init__(self, app, max_requests: int = 180, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # client_ip -> list of timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Exclude internal health checks from rate limiting
        if request.url.path in ("/health", "/api/health", "/docs", "/openapi.json"):
            return await call_next(request)

        # Get client IP address
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host if request.client else "unknown"

        now = time.time()
        window_start = now - self.window_seconds

        # Prune older requests
        timestamps = [t for t in self.requests[client_ip] if t > window_start]
        self.requests[client_ip] = timestamps

        if len(timestamps) >= self.max_requests:
            retry_after = int(timestamps[0] + self.window_seconds - now) + 1
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": "Rate limit exceeded. Please slow down your requests.",
                    "retry_after_seconds": max(1, retry_after),
                },
                headers={
                    "Retry-After": str(max(1, retry_after)),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        # Record this request
        timestamps.append(now)
        response = await call_next(request)

        # Append rate limit status headers
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.max_requests - len(timestamps)))
        return response

