import stat

import pytest
from pydantic import ValidationError

from config import Settings


def test_unset_secret_is_generated_once_and_reused(tmp_path, monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    secret_file = tmp_path / "data" / ".jwt_secret"

    first = Settings(_env_file=None, jwt_secret_file=secret_file)
    second = Settings(_env_file=None, jwt_secret_file=secret_file)

    assert len(first.jwt_secret) >= 32
    assert first.jwt_secret == second.jwt_secret
    assert stat.S_IMODE(secret_file.stat().st_mode) == 0o600


def test_short_secret_is_rejected(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "too-short")
    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings(_env_file=None)


def test_explicit_secret_is_used_as_is(tmp_path, monkeypatch):
    secret = "s" * 40
    monkeypatch.setenv("JWT_SECRET", secret)
    settings = Settings(_env_file=None, jwt_secret_file=tmp_path / ".jwt_secret")
    assert settings.jwt_secret == secret
    assert not (tmp_path / ".jwt_secret").exists()
