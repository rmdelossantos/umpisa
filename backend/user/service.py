from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from user.models import User, UserDetails
from user.schemas import UserCreate
from user.security import hash_password


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def email_or_username_taken(db: Session, email: str, username: str) -> bool:
    return db.scalar(select(User.id).where(or_(User.email == email, User.username == username))) is not None


def create_user(db: Session, data: UserCreate, role: str = "user") -> User:
    user = User(
        email=data.email,
        username=data.username,
        password=hash_password(data.password),
        role=role,
        status="active",
        details=UserDetails(first_name=data.first_name, last_name=data.last_name, birthdate=data.birthdate),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def record_login(db: Session, user: User) -> None:
    user.last_logged_in = datetime.now(UTC).replace(tzinfo=None)
    db.commit()
    db.refresh(user)
