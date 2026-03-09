from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ResNex AI API"
    app_version: str = "0.1.0"
    app_env: str = "development"
    api_port: int = 8000
    api_v1_prefix: str = "/api/v1"
    redis_url: str = "redis://redis:6379/0"
    database_url: str = "postgresql+psycopg://postgres:postgres@postgres:5432/resnex"
    worker_queue_name: str = "resnex"

    # LLM (OpenRouter or any OpenAI-compatible provider)
    llm_api_key: str = ""
    llm_api_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "google/gemini-2.5-flash-lite"

    # OpenAI (used for embeddings if available; also fallback for LLM)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # Storage
    upload_dir: str = "/app/uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()