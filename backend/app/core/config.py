import ast
import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings


DEFAULT_CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://localhost",
    "http://localhost",
    "capacitor://localhost",
]


class Settings(BaseSettings):
    PROJECT_NAME: str = "Vybe API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "production"
    ENABLE_DOCS: bool = True
    TMDB_API_KEY: str = "4e44d9029b1270a757cddc766a1bcb63"
    TRUST_PROXY_HEADERS: bool = True
    RATE_LIMIT_MAX_REQUESTS: int = 180
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    CORS_ORIGINS: Union[List[str], str] = DEFAULT_CORS_ORIGINS
    CORS_ORIGIN_REGEX: str = (
        r"^https://([a-z0-9-]+\.)?vercel\.app$|"
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|"
        r"^capacitor://localhost$"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        origins: List[str] = []
        if isinstance(v, str):
            raw = v.strip()
            if raw.startswith("[") and raw.endswith("]"):
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        origins = [str(item).strip() for item in parsed]
                except Exception:
                    try:
                        parsed = ast.literal_eval(raw)
                        if isinstance(parsed, list):
                            origins = [str(item).strip() for item in parsed]
                    except Exception:
                        origins = []
            elif raw:
                origins = [item.strip() for item in raw.split(",") if item.strip()]
        elif isinstance(v, (list, tuple)):
            origins = [str(item).strip() for item in v]

        # Reject wildcard origins when allow_credentials=True and merge safe local/native defaults
        filtered = [o for o in origins if o and o != "*"]
        merged = list(dict.fromkeys([*filtered, *DEFAULT_CORS_ORIGINS]))
        return merged

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = ".env"


settings = Settings()

