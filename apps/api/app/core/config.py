"""Application settings loaded from environment variables via pydantic-settings."""

from __future__ import annotations

from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_service_role_key: str = Field(..., description="Supabase service-role secret key")
    supabase_jwt_secret: str = Field(..., description="Supabase JWT signing secret")

    # AI
    ai_provider: Literal["openai", "gemini", "anthropic", "groq", "ollama"] = Field(
        default="openai", description="LLM provider to use"
    )
    ai_model: str = Field(default="gpt-4o-mini", description="Model name for the chosen provider")

    # CORS — comma-separated list of allowed origins
    cors_origins: list[str] = Field(
        default=["http://localhost:5173"],
        description="Comma-separated list of allowed CORS origins",
    )

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", description="Minimum log level"
    )

    # Derived
    @property
    def is_production(self) -> bool:
        return self.log_level != "DEBUG"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


# Module-level singleton — import and use `settings` everywhere.
settings = Settings()  # type: ignore[call-arg]
