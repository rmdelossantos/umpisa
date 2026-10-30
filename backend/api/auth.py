import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from auth.dependencies import ACTIVE, COOKIE_NAME, get_current_user
from auth.schemas import DemoInfo, LoginRequest
from auth.security import create_access_token
from config import settings
from database import get_db
from rate_limit import LOGIN_FAILURES_PER_EMAIL, limiter
from user import service
from user.models import User
from user.schemas import UserRead
from user.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# Verified against when the email is unknown, so both failure paths take the same time
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


@router.post("/login", response_model=UserRead)
@limiter.limit(settings.rate_limit_login)
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    # Same check for known and unknown emails, so a 429 doesn't reveal which accounts exist
    email_key = payload.email.lower()
    if limiter.enabled and not limiter.limiter.test(LOGIN_FAILURES_PER_EMAIL, "login-fail", email_key):
        reset_at, _ = limiter.limiter.get_window_stats(LOGIN_FAILURES_PER_EMAIL, "login-fail", email_key)
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many failed attempts. Try again later.",
            headers={"Retry-After": str(max(1, int(reset_at - time.time())))},
        )

    user = service.get_user_by_email(db, payload.email)
    # Unknown emails and unusable hashes (the "!" backfill) still run a full scrypt,
    # so every failure path takes the same time
    usable = user is not None and user.password.startswith("scrypt$")
    password_ok = verify_password(payload.password, user.password if usable else _DUMMY_HASH) and usable
    if not password_ok or user.status != ACTIVE:
        if limiter.enabled:
            limiter.limiter.hit(LOGIN_FAILURES_PER_EMAIL, "login-fail", email_key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    service.record_login(db, user)
    response.set_cookie(
        COOKIE_NAME,
        create_access_token(user.id),
        max_age=settings.access_token_ttl_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api",
    )
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(
        COOKIE_NAME, path="/api", httponly=True, secure=settings.cookie_secure, samesite="lax"
    )


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user


# Demo accounts the login page advertises: one admin and one regular user from the seed file
DEMO_ACCOUNTS = [
    {"email": "admin@example.com", "role": "admin"},
    {"email": "juan@example.com", "role": "user"},
]


@router.get("/demo", response_model=DemoInfo)
def demo():
    """Tells the login page whether demo accounts were seeded, and how to sign in to them."""
    if not settings.seed_demo:
        return DemoInfo(enabled=False)
    return DemoInfo(enabled=True, password=settings.demo_password, accounts=DEMO_ACCOUNTS)
