from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from user import service
from user.schemas import UserCreate, UserRead

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    return service.list_users(db)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if service.email_or_username_taken(db, payload.email, payload.username):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already registered")
    return service.create_user(db, payload)
