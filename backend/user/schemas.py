from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["user", "admin"]
Status = Literal["active", "inactive"]


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    birthdate: date | None = None


class UserUpdate(BaseModel):
    """Partial update: only fields that are sent are changed."""

    email: EmailStr | None = None
    username: str | None = Field(default=None, min_length=3, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    first_name: str | None = Field(default=None, min_length=1, max_length=255)
    last_name: str | None = Field(default=None, min_length=1, max_length=255)
    birthdate: date | None = None
    role: Role | None = None
    status: Status | None = None


class UserDetailsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    first_name: str
    last_name: str
    birthdate: date | None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    username: str
    role: str
    status: str
    created_at: datetime
    last_logged_in: datetime | None
    details: UserDetailsRead | None
