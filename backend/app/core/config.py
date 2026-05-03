from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "dev"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    api_v1_prefix: str = "/api/v1"

    neo4j_uri: str | None = None
    neo4j_user: str | None = None
    neo4j_password: str | None = None

    ai_provider: str | None = None
    ai_api_key: str | None = None
    ai_model: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
