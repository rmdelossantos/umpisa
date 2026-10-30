from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.security import decode_access_token
from database import get_db
from user.models import User

COOKIE_NAME = "access_token"
ACTIVE = "active"


def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_access_token(access_token) if access_token else None
    user = db.get(User, user_id) if user_id is not None else None
    if user is None or user.status != ACTIVE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user
