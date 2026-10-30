from datetime import UTC, datetime, timedelta

import jwt

from auth.dependencies import COOKIE_NAME
from auth.security import create_access_token
from config import settings
from tests.conftest import PASSWORD
from user.models import User


def login(client, email="ana@example.com", password=PASSWORD):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_login_sets_httponly_cookie(client, make_user):
    make_user()
    res = login(client)
    assert res.status_code == 200
    assert res.json()["email"] == "ana@example.com"
    assert res.json()["last_logged_in"] is not None
    assert "password" not in res.json()

    cookie = res.headers["set-cookie"].lower()
    assert cookie.startswith(f"{COOKIE_NAME}=")
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "path=/api" in cookie


def test_wrong_password_and_unknown_email_look_identical(client, make_user):
    make_user()
    wrong = login(client, password="wrong-password")
    unknown = login(client, email="nobody@example.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Invalid email or password"}


def test_backfilled_user_cannot_log_in(client, session_factory):
    # Migration 0002 backfills existing rows with password "!"
    with session_factory() as db:
        db.add(User(email="legacy@example.com", username="legacy", password="!", role="user", status="active"))
        db.commit()
    assert login(client, email="legacy@example.com", password="!").status_code == 401


def test_every_login_failure_runs_scrypt(client, make_user, session_factory, monkeypatch):
    # Equal work on every failure path, so response time doesn't reveal which accounts exist
    import user.security

    make_user()
    with session_factory() as db:
        db.add(User(email="legacy@example.com", username="legacy", password="!", role="user", status="active"))
        db.commit()

    calls = []
    real_scrypt = user.security.hashlib.scrypt

    def counting_scrypt(*args, **kwargs):
        calls.append(1)
        return real_scrypt(*args, **kwargs)

    monkeypatch.setattr(user.security.hashlib, "scrypt", counting_scrypt)
    for email in ["ana@example.com", "nobody@example.com", "legacy@example.com"]:
        calls.clear()
        assert login(client, email=email, password="wrong-password").status_code == 401
        assert len(calls) == 1, email


def test_inactive_user_cannot_log_in_or_use_token(client, make_user, session_factory):
    user = make_user()
    login(client)
    with session_factory() as db:
        db.get(User, user.id).status = "disabled"
        db.commit()
    assert client.get("/api/v1/auth/me").status_code == 401
    assert login(client).status_code == 401


def test_me(client, make_user):
    assert client.get("/api/v1/auth/me").status_code == 401
    make_user()
    login(client)
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 200
    assert res.json()["username"] == "ana"
    assert res.json()["details"]["first_name"] == "Ana"
    assert "password" not in res.json()


def _me_with_token(client, token):
    client.cookies.set(COOKIE_NAME, token)
    return client.get("/api/v1/auth/me")


def test_expired_token_rejected(client, make_user, monkeypatch):
    user = make_user()
    monkeypatch.setattr(settings, "access_token_ttl_minutes", -1)
    assert _me_with_token(client, create_access_token(user.id)).status_code == 401


def test_token_signed_with_other_secret_rejected(client, make_user):
    user = make_user()
    exp = datetime.now(UTC) + timedelta(minutes=5)
    token = jwt.encode({"sub": str(user.id), "exp": exp}, "other-secret", algorithm="HS256")
    assert _me_with_token(client, token).status_code == 401


def test_alg_none_token_rejected(client, make_user):
    user = make_user()
    token = jwt.encode({"sub": str(user.id)}, None, algorithm="none")
    assert _me_with_token(client, token).status_code == 401


def test_token_for_deleted_user_rejected(client, make_user, session_factory):
    user = make_user()
    token = create_access_token(user.id)
    with session_factory() as db:
        db.delete(db.get(User, user.id))
        db.commit()
    assert _me_with_token(client, token).status_code == 401


def test_logout_clears_cookie(logged_in_client):
    res = logged_in_client.post("/api/v1/auth/logout")
    assert res.status_code == 204
    cookie = res.headers["set-cookie"].lower()
    assert cookie.startswith(f"{COOKIE_NAME}=")
    assert "max-age=0" in cookie
    assert logged_in_client.get("/api/v1/auth/me").status_code == 401
