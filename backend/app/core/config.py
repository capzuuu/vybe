import ast
import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Vybe API"
    API_V1_STR: str = "/api/v1"
    TMDB_API_KEY: str = "4e44d9029b1270a757cddc766a1bcb63"
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ["*"]
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return parsed
                except Exception:
                    try:
                        parsed = ast.literal_eval(v)
                        if isinstance(parsed, list):
                            return parsed
                    except Exception:
                        pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return ["*"]

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = ".env"


settings = Settings()

