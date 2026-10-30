import os
import secrets
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

MIN_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Umpisa API"
    database_url: str = "sqlite:///./data/app.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Leave JWT_SECRET unset to have one generated once and kept in jwt_secret_file,
    # so the app runs out of the box and logins survive restarts
    jwt_secret: str = ""
    jwt_secret_file: Path = Path("data/.jwt_secret")
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 30
    cookie_secure: bool = False  # set true when served over HTTPS

    anilist_url: str = "https://graphql.anilist.co"

    # Demo accounts from scripts/seed_users.json, created on startup when enabled (Compose turns it on)
    seed_demo: bool = False
    demo_password: str = "umpisa-demo"

    rate_limit_enabled: bool = True
    rate_limit_default: str = "120/minute"  # every endpoint, per IP
    rate_limit_login: str = "5/minute"  # /auth/login, per IP, every attempt
    rate_limit_login_failures_per_email: str = "10 per 15 minutes"  # failed logins only

    @model_validator(mode="after")
    def _ensure_jwt_secret(self) -> "Settings":
        if not self.jwt_secret:
            self.jwt_secret = _read_or_create_secret(self.jwt_secret_file)
        # An empty or short key would let anyone forge a session token
        if len(self.jwt_secret) < MIN_SECRET_LENGTH:
            raise ValueError(
                f"JWT_SECRET must be at least {MIN_SECRET_LENGTH} characters (leave it unset to auto-generate one)"
            )
        return self


def _read_or_create_secret(path: Path) -> str:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            # O_EXCL: when two processes start together, exactly one writes the secret
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        else:
            with os.fdopen(fd, "w") as f:
                f.write(secrets.token_urlsafe(48))
    return path.read_text().strip()


settings = Settings()
