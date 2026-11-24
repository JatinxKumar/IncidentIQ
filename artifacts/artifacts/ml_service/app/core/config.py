"""
app/core/config.py — Application Configuration
================================================
Pydantic Settings model that reads all configuration from environment
variables, with safe defaults for local development.

Production values are injected via Replit Secrets.

The async_database_url property converts the standard PostgreSQL URL
(postgres:// or postgresql://) to the asyncpg dialect URL
(postgresql+asyncpg://) required by SQLAlchemy async engine.

Usage:
    from app.core.config import settings
    print(settings.PORT)
    print(settings.async_database_url)
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration for the IncidentIQ backend.

    Pydantic Settings reads from (highest to lowest priority):
      1. Actual environment variables
      2. .env file in the working directory
      3. Default values defined below

    Field names are case-insensitive when reading from env vars.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unrecognised env vars — never raise
    )

    # ─── Server ───────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # ─── Logging ──────────────────────────────────────────────────────────────
    # Valid values: DEBUG | INFO | WARNING | ERROR | CRITICAL
    LOG_LEVEL: str = "INFO"

    # ─── Database ─────────────────────────────────────────────────────────────
    # Standard PostgreSQL URL, e.g.:
    #   postgresql://user:pass@localhost:5432/incidentiq
    # Auto-provisioned by Replit; overridable for local dev via .env
    DATABASE_URL: str = ""

    # ─── CORS ─────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins.
    # Set to "*" for development. Production should list exact origins.
    # Example: "https://incidentiq.replit.app,http://localhost:5173"
    ALLOWED_ORIGINS: str = "*"

    # ─── Internal Services ────────────────────────────────────────────────────
    # Node.js API server URL — used for callbacks and webhook events
    API_SERVER_URL: str = "http://localhost:5000"

    # ─── Security ─────────────────────────────────────────────────────────────
    # JWT secret — used in Module 6 (Authentication)
    # Must be set in production. Min 32 characters.
    SECRET_KEY: str = "change-this-before-deploying-to-production"

    # JWT token expiry (minutes)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── Model Storage ────────────────────────────────────────────────────────
    # Directory where trained model files (.joblib) are persisted
    MODEL_STORE_PATH: str = "./trained_models"

    # ─── ML Training Defaults ─────────────────────────────────────────────────
    DEFAULT_TEST_SIZE: float = 0.2
    DEFAULT_RANDOM_STATE: int = 42
    DEFAULT_CV_FOLDS: int = 5
    MAX_MODEL_VERSIONS_PER_ALGO: int = 10

    # ─── Ensemble Weights ─────────────────────────────────────────────────────
    ENSEMBLE_WEIGHT_RANDOM_FOREST: float = 0.40
    ENSEMBLE_WEIGHT_SVM: float = 0.30
    ENSEMBLE_WEIGHT_KNN: float = 0.20
    ENSEMBLE_WEIGHT_DECISION_TREE: float = 0.10

    # ─── Pagination ───────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # ─── Derived Properties ───────────────────────────────────────────────────

    @property
    def async_database_url(self) -> str:
        """
        Convert the standard PostgreSQL URL to the asyncpg dialect.
        SQLAlchemy's async engine requires the postgresql+asyncpg:// scheme.

        Handles both postgres:// (Heroku/Replit format) and postgresql://.
        """
        url = self.DATABASE_URL
        if not url:
            return ""
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        # Already in asyncpg format or a custom scheme
        return url

    @property
    def allowed_origins_list(self) -> list[str]:
        """
        Parse ALLOWED_ORIGINS into a list.
        Handles the wildcard "*" and comma-separated origin strings.
        """
        if self.ALLOWED_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        """True when DEBUG is False — used for stricter security checks."""
        return not self.DEBUG


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return the cached Settings singleton.
    The cache ensures .env is read only once per process.
    Use this in dependency injection:
        settings_dep = Annotated[Settings, Depends(get_settings)]
    """
    return Settings()


# Module-level singleton — import this everywhere
settings = get_settings()
