from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Umpisa API"
    database_url: str = "sqlite:///./data/app.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    jwt_secret: str  # required, no default: app fails to start without it
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 30
    cookie_secure: bool = False  # set true when served over HTTPS

    anilist_url: str = "https://graphql.anilist.co"

    rate_limit_enabled: bool = True
    rate_limit_default: str = "120/minute"  # every endpoint, per IP
    rate_limit_login: str = "5/minute"  # /auth/login, per IP, every attempt
    rate_limit_login_failures_per_email: str = "10 per 15 minutes"  # failed logins only


settings = Settings()
