from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class DemoAccount(BaseModel):
    email: str
    role: str


class DemoInfo(BaseModel):
    enabled: bool
    password: str | None = None
    accounts: list[DemoAccount] = []
