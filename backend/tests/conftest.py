import os

os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import collection.models  # noqa: F401
from catalog.anilist import CatalogNotFound, CatalogUnavailable, get_catalog
from catalog.schemas import CatalogItem, CatalogPage
import user.models  # noqa: F401
from database import Base, enable_sqlite_foreign_keys, get_db
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
    enable_sqlite_foreign_keys(engine)
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
    def _make(email="ana@example.com", username="ana", password=PASSWORD, role="user"):
        data = UserCreate(
            email=email, username=username, password=password, first_name="Ana", last_name="Cruz"
        )
        with session_factory() as db:
            return service.create_user(db, data, role=role)

    return _make


@pytest.fixture
def logged_in_client(client, make_user):
    """Logged in as ana, an admin."""
    make_user(role="admin")
    res = client.post("/api/v1/auth/login", json={"email": "ana@example.com", "password": PASSWORD})
    assert res.status_code == 200
    return client


@pytest.fixture
def user_client(client, make_user):
    """Logged in as ana, a regular user."""
    make_user(role="user")
    res = client.post("/api/v1/auth/login", json={"email": "ana@example.com", "password": PASSWORD})
    assert res.status_code == 200
    return client


class FakeCatalog:
    """Stands in for catalog.anilist.AniListClient so tests never call the network."""

    def __init__(self):
        self.titles: dict[tuple[str, int], CatalogItem] = {}
        self.down = False

    def add(self, media_type="anime", anilist_id=154587, title="Frieren: Beyond Journey's End", **extra):
        item = CatalogItem(
            media_type=media_type,
            anilist_id=anilist_id,
            title=title,
            image_url=extra.get("image_url", f"https://s4.anilist.co/file/anilistcdn/media/{anilist_id}.jpg"),
            kind=extra.get("kind", "TV"),
            units=extra.get("units", 28),
            year=extra.get("year", 2023),
        )
        self.titles[(media_type, anilist_id)] = item
        return item

    def search(self, media_type, q, page=1):
        if self.down:
            raise CatalogUnavailable("down")
        items = [i for (t, _), i in self.titles.items() if t == media_type and q.lower() in i.title.lower()]
        return CatalogPage(items=items, page=page, has_next_page=False)

    def get(self, media_type, anilist_id):
        if self.down:
            raise CatalogUnavailable("down")
        if (media_type, anilist_id) not in self.titles:
            raise CatalogNotFound(anilist_id)
        return self.titles[(media_type, anilist_id)]


@pytest.fixture
def catalog():
    fake = FakeCatalog()
    app.dependency_overrides[get_catalog] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_catalog, None)
