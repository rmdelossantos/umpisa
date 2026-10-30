from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.dependencies import require_admin
from database import get_db
from user import service
from user.models import User
from user.schemas import UserCreate, UserRead, UserUpdate

# Managing users is admin-only, including listing them
router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


def _get_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    return service.list_users(db)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if service.email_or_username_taken(db, payload.email, payload.username):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already registered")
    return service.create_user(db, payload)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = _get_or_404(db, user_id)
    # Stops an admin from locking themselves out (and the app from losing its last admin)
    if user.id == admin.id and (
        (payload.role is not None and payload.role != user.role)
        or (payload.status is not None and payload.status != user.status)
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't change your own role or status")
    email = payload.email or user.email
    username = payload.username or user.username
    if service.email_or_username_taken(db, email, username, exclude_id=user.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already registered")
    return service.update_user(db, user, payload)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = _get_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't delete your own account")
    service.delete_user(db, user)
