import ipaddress
import time
from collections import OrderedDict, deque
from typing import Deque, Dict, Optional, Tuple
from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


def _extract_client_ip(scope: Scope, headers: Headers, trust_proxy_headers: bool) -> str:
    """
    Extracts client IP safely:
    - When behind a reverse proxy (e.g. Render/Vercel), inspects the rightmost valid IP
      in X-Forwarded-For (which the trusted edge appends, preventing leftmost header spoofing)
      before falling back to X-Real-IP and socket peer IP.
    """
    if trust_proxy_headers:
        xff = headers.get("x-forwarded-for")
        if xff:
            parts = [p.strip() for p in xff.split(",") if p.strip()]
            for candidate in reversed(parts):
                if len(candidate) <= 64:
                    try:
                        ipaddress.ip_address(candidate)
                        return candidate
                    except ValueError:
                        continue
        x_real = headers.get("x-real-ip", "").strip()
        if x_real and len(x_real) <= 64:
            try:
                ipaddress.ip_address(x_real)
                return x_real
            except ValueError:
                pass

    client: Optional[Tuple[str, int]] = scope.get("client")
    if client and client[0]:
        return str(client[0])[:64]
    return "unknown"


class SecurityHeadersMiddleware:
    """
    Pure ASGI middleware appending OWASP defense-in-depth security headers
    and high-resolution X-Response-Time without BaseHTTPMiddleware buffering overhead.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.perf_counter()
        headers_in = Headers(scope=scope)
        is_https = scope.get("scheme") == "https" or headers_in.get("x-forwarded-proto", "").lower() == "https"

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                process_time = (time.perf_counter() - start_time) * 1000
                mutable_headers = MutableHeaders(scope=message)
                mutable_headers["X-Response-Time"] = f"{process_time:.2f}ms"
                mutable_headers["X-Content-Type-Options"] = "nosniff"
                mutable_headers["X-Frame-Options"] = "DENY"
                mutable_headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                mutable_headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
                mutable_headers["Cross-Origin-Resource-Policy"] = "cross-origin"

                if is_https:
                    mutable_headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

                if "cache-control" not in mutable_headers and scope.get("method") != "GET":
                    mutable_headers["Cache-Control"] = "no-store"

            await send(message)

        await self.app(scope, receive, send_wrapper)


class RateLimitMiddleware:
    """
    Pure ASGI O(1) sliding-window rate limiter with bounded client tracking
    (LRU eviction + periodic expiry sweep) to prevent DDoS and memory exhaustion.
    """

    def __init__(
        self,
        app: ASGIApp,
        max_requests: int = 180,
        window_seconds: int = 60,
        max_tracked_clients: int = 10000,
        trust_proxy_headers: bool = True,
    ):
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_tracked_clients = max_tracked_clients
        self.trust_proxy_headers = trust_proxy_headers
        self.requests: "OrderedDict[str, Deque[float]]" = OrderedDict()
        self._last_sweep = time.monotonic()

    def _evict_if_needed(self, now: float, window_start: float) -> None:
        # Periodic sweep every 60s to purge idle IPs
        if now - self._last_sweep >= max(30.0, float(self.window_seconds)):
            self._last_sweep = now
            stale_ips = [
                ip for ip, dq in self.requests.items()
                if not dq or dq[-1] <= window_start
            ]
            for ip in stale_ips:
                self.requests.pop(ip, None)

        while len(self.requests) >= self.max_tracked_clients:
            self.requests.popitem(last=False)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if scope.get("method") == "OPTIONS":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path in ("/health", "/api/health", "/docs", "/redoc", "/openapi.json"):
            await self.app(scope, receive, send)
            return

        headers_in = Headers(scope=scope)
        client_ip = _extract_client_ip(scope, headers_in, self.trust_proxy_headers)

        now = time.monotonic()
        window_start = now - self.window_seconds

        dq = self.requests.get(client_ip)
        if dq is None:
            self._evict_if_needed(now, window_start)
            dq = deque()
            self.requests[client_ip] = dq
        else:
            self.requests.move_to_end(client_ip)

        while dq and dq[0] <= window_start:
            dq.popleft()

        if len(dq) >= self.max_requests:
            retry_after = max(1, int(dq[0] + self.window_seconds - now) + 1)
            response = JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": "Rate limit exceeded. Please slow down your requests.",
                    "retry_after_seconds": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )
            await response(scope, receive, send)
            return

        dq.append(now)
        remaining = str(max(0, self.max_requests - len(dq)))

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                mutable_headers = MutableHeaders(scope=message)
                mutable_headers["X-RateLimit-Limit"] = str(self.max_requests)
                mutable_headers["X-RateLimit-Remaining"] = remaining
            await send(message)

        await self.app(scope, receive, send_wrapper)

