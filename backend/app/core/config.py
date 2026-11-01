from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Vybe API"
    API_V1_STR: str = "/api/v1"
    TMDB_API_KEY: str = "4e44d9029b1270a757cddc766a1bcb63"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",
    ]

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = ".env"


settings = Settings()

