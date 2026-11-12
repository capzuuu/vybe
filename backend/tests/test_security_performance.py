import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.core.cache import LRUTTLCache
from app.main import app
from app.middleware.security import RateLimitMiddleware


class SecurityAndSpeedTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_and_security_headers(self):
        res = self.client.get("/health", headers={"X-Forwarded-Proto": "https"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "healthy")
        self.assertIn("cache", body)
        self.assertEqual(res.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(res.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(res.headers.get("Cross-Origin-Resource-Policy"), "cross-origin")
        self.assertEqual(res.headers.get("Cache-Control"), "no-store")
        self.assertIn("max-age=31536000", res.headers.get("Strict-Transport-Security", ""))
        self.assertIn("X-Response-Time", res.headers)

        items_res = self.client.get("/api/v1/items")
        self.assertEqual(items_res.status_code, 200)
        self.assertEqual(items_res.headers.get("Cache-Control"), "no-store")

    def test_cors_blocks_untrusted_origin_and_allows_trusted(self):
        evil = self.client.options(
            "/api/v1/items",
            headers={
                "Origin": "https://evil-phishing.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertIsNone(evil.headers.get("access-control-allow-origin"))

        native = self.client.options(
            "/api/v1/items",
            headers={
                "Origin": "https://localhost",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(native.headers.get("access-control-allow-origin"), "https://localhost")

        vercel = self.client.options(
            "/api/v1/items",
            headers={
                "Origin": "https://vybe-stream.vercel.app",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(
            vercel.headers.get("access-control-allow-origin"),
            "https://vybe-stream.vercel.app",
        )

    def test_proxy_rejects_ssrf_and_traversal_paths(self):
        for bad_path in [
            "/api/v1/titles/proxy/..%2faccount",
            "/api/v1/titles/proxy/authentication/token/new",
            "/api/v1/titles/proxy/account",
            "/api/v1/titles/proxy/https://evil.com/steal",
        ]:
            res = self.client.get(bad_path)
            self.assertIn(res.status_code, (400, 404), f"Expected rejection for {bad_path}, got {res.status_code}")

    def test_proxy_strips_disallowed_params_and_sets_cache_control(self):
        mock_payload = {"results": []}
        with patch("app.routers.titles.tmdb_request", new=AsyncMock(return_value=mock_payload)) as mock_req:
            res = self.client.get(
                "/api/v1/titles/proxy/trending/all/week?api_key=ATTACKER&evil=1&page=2"
            )
            self.assertEqual(res.status_code, 200)
            self.assertIn("public,", res.headers.get("Cache-Control", ""))
            self.assertIn("stale-while-revalidate=", res.headers.get("Cache-Control", ""))
            called_endpoint = mock_req.call_args.args[0]
            self.assertEqual(called_endpoint, "/trending/all/week")

    def test_cache_coalesces_concurrent_requests(self):
        cache = LRUTTLCache(max_size=10, default_ttl=60)
        calls = 0

        async def slow_loader():
            nonlocal calls
            calls += 1
            await asyncio.sleep(0.03)
            return {"ok": True}

        async def run_burst():
            return await asyncio.gather(*[cache.get_or_load("k1", slow_loader) for _ in range(25)])

        results = asyncio.run(run_burst())
        self.assertEqual(calls, 1)
        self.assertEqual(len(results), 25)
        self.assertTrue(all(r == {"ok": True} for r in results))
        self.assertEqual(cache.coalesced, 24)

    def test_rate_limiter_bounds_memory_and_enforces_429(self):
        async def ok_app(scope, receive, send):
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"ok"})

        limiter = RateLimitMiddleware(ok_app, max_requests=2, window_seconds=60, max_tracked_clients=5)

        async def send_req(ip: str):
            statuses = []
            async def receive():
                return {"type": "http.request", "body": b""}
            async def send(msg):
                if msg["type"] == "http.response.start":
                    statuses.append(msg["status"])
            scope = {
                "type": "http",
                "method": "GET",
                "path": "/api/v1/titles/trending",
                "headers": [],
                "client": (ip, 12345),
            }
            await limiter(scope, receive, send)
            return statuses[0]

        async def scenario():
            # OPTIONS preflights should not consume rate limit quota
            preflight_statuses = []
            async def receive():
                return {"type": "http.request", "body": b""}
            async def send(msg):
                if msg["type"] == "http.response.start":
                    preflight_statuses.append(msg["status"])
            await limiter(
                {
                    "type": "http",
                    "method": "OPTIONS",
                    "path": "/api/v1/titles/trending",
                    "headers": [],
                    "client": ("10.0.0.1", 12345),
                },
                receive,
                send,
            )

            s1 = await send_req("10.0.0.1")
            s2 = await send_req("10.0.0.1")
            s3 = await send_req("10.0.0.1")
            for idx in range(12):
                await send_req(f"10.0.1.{idx}")
            return preflight_statuses[0], s1, s2, s3, len(limiter.requests)

        pre, s1, s2, s3, tracked_count = asyncio.run(scenario())
        self.assertEqual((pre, s1, s2, s3), (200, 200, 200, 429))
        self.assertLessEqual(tracked_count, 5)

    def test_cache_failure_cleans_in_flight_without_poisoning(self):
        cache = LRUTTLCache(max_size=10, default_ttl=60)

        async def failing_loader():
            raise RuntimeError("upstream down")

        async def scenario():
            with self.assertRaises(RuntimeError):
                await cache.get_or_load("bad-key", failing_loader)
            self.assertEqual(cache.stats()["in_flight"], 0)

        asyncio.run(scenario())


if __name__ == "__main__":
    unittest.main()

