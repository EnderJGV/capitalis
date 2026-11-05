import os

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 720
    #: Orígenes permitidos separados por coma (p. ej., el dominio de la Vercel).
    cors_origins: str = "http://localhost:5173"
    #: Regex opcional de orígenes extra, p. ej. las vistas previas de la Vercel:
    #: ^https://capitalis-frontend(-[a-z0-9-]+)?\.vercel\.app$
    cors_origin_regex: str | None = None
    #: Aplicar las migraciones al arrancar. En la Vercel (variable VERCEL) no: varias instancias
    #: podrían arrancar a la vez; allí las aplica el build de producción (scripts/vercel_build.py).
    run_migrations_on_startup: bool = Field(default_factory=lambda: "VERCEL" not in os.environ)

    @field_validator("database_url")
    @classmethod
    def _use_psycopg(cls, url: str) -> str:
        """Supabase y Render dan URLs "postgresql://" o "postgres://"; SQLAlchemy usa el driver psycopg 3."""
        for prefix in ("postgresql://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url


settings = Settings()
