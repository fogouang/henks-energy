"""Application configuration using Pydantic Settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Feature Flags
    ENABLE_MVP_MODE: bool = True
    ENABLE_MULTI_TENANT: bool = False
    ENABLE_GENERATOR: bool = False
    ENABLE_EV_CHARGERS: bool = False
    ENABLE_REVENUE_ANALYTICS: bool = False

    # Database
    DATABASE_URL: str

    # MQTT
    MQTT_BROKER_URL: str
    MQTT_BROKER_TLS_URL: str | None = None
    MQTT_USERNAME: str | None = None
    MQTT_PASSWORD: str | None = None

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # EPEX API
    EPEX_API_KEY: str | None = None
    EPEX_API_URL: str = "https://api.epex.com"

    # OpenWeather API
    OPEN_WEATHER_API_KEY: str | None = None

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Admin (MVP mode)
    ADMIN_EMAIL: str = "admin@jsenergy.nl"
    ADMIN_PASSWORD_HASH: str | None = None

    # Application
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api"

    # CORS
    # Comma-separated list of allowed origins, or "*" for all origins
    # Default includes common development and production origins
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://jsenergy.aitech.work,https://jsenergyapi.aitech.work,https://app.jsenergypowerhub.nl"

    # Soketi (Pusher-compatible WebSocket server)
    # These values are read from environment variables with defaults for development
    SOKETI_APP_ID: str = "jsenergy-app-id"
    SOKETI_APP_KEY: str = "jsenergy-app-key"
    SOKETI_APP_SECRET: str = "jsenergy-app-secret"
    SOKETI_HOST: str = "soketi"  # Use 'soketi' in Docker, 'localhost' for local dev
    SOKETI_PORT: int = 6001  # HTTP API port (WebSocket is on 6002)
    SOKETI_CLUSTER: str = "mt1"

    # Firmware uploads
    FIRMWARE_UPLOAD_DIR: str = "/app/firmware"

    # Reverse SSH
    # Systemwide hostname for reverse SSH connections (same for all devices)
    REVERSE_SSH_HOST: str = "support.jsenergy.nl"
    REVERSE_SSH_USER: str = "rpi-tunnel"
    REVERSE_SSH_PORT: int = 22


settings = Settings()

