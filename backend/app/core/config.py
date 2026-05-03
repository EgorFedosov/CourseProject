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
    neo4j_database: str = "neo4j"
    neo4j_init_on_startup: bool = True
    neo4j_assets_path: str = "../neo4j"

    ai_provider: str | None = None
    ai_api_key: str | None = None
    ai_model: str | None = None

    @property
    def has_neo4j_config(self) -> bool:
        return bool(self.neo4j_uri and self.neo4j_user and self.neo4j_password)


@lru_cache
def get_settings() -> Settings:
    return Settings()
