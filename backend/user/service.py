from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from user.models import User, UserDetails
from user.schemas import UserCreate, UserUpdate
from user.security import hash_password


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def email_or_username_taken(db: Session, email: str, username: str, exclude_id: int | None = None) -> bool:
    query = select(User.id).where(or_(User.email == email, User.username == username))
    if exclude_id is not None:
        query = query.where(User.id != exclude_id)
    return db.scalar(query) is not None


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


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    changes = data.model_dump(exclude_unset=True)
    for field in ("email", "username", "role", "status"):
        if field in changes:
            setattr(user, field, changes[field])
    if changes.get("password"):
        user.password = hash_password(changes["password"])

    detail_changes = {k: changes[k] for k in ("first_name", "last_name", "birthdate") if k in changes}
    if detail_changes:
        if user.details is None:
            user.details = UserDetails(first_name="", last_name="")
        for field, value in detail_changes.items():
            setattr(user.details, field, value)

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()
