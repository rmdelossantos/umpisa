import os

os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import user.models  # noqa: F401
from database import Base, get_db
from main import app
from rate_limit import limiter
from user import service
from user.schemas import UserCreate

PASSWORD = "correct-horse"


@pytest.fixture(autouse=True)
def reset_rate_limits():
    limiter.reset()


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(session_factory):
    def _make(email="ana@example.com", username="ana", password=PASSWORD):
        data = UserCreate(
            email=email, username=username, password=password, first_name="Ana", last_name="Cruz"
        )
        with session_factory() as db:
            return service.create_user(db, data)

    return _make


@pytest.fixture
def logged_in_client(client, make_user):
    make_user()
    res = client.post("/api/v1/auth/login", json={"email": "ana@example.com", "password": PASSWORD})
    assert res.status_code == 200
    return client
