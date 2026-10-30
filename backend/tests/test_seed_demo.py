import pytest

from collection.models import CollectionEntry
from config import settings
from scripts import seed_demo
from user.models import User


@pytest.fixture
def demo_db(session_factory, monkeypatch):
    monkeypatch.setattr(seed_demo, "SessionLocal", session_factory)
    monkeypatch.setattr(settings, "seed_demo", True)
    return session_factory


def test_disabled_seeds_nothing(session_factory, monkeypatch):
    monkeypatch.setattr(seed_demo, "SessionLocal", session_factory)
    monkeypatch.setattr(settings, "seed_demo", False)
    assert seed_demo.main() == 0
    with session_factory() as db:
        assert db.query(User).count() == 0


def test_seeds_accounts_and_juans_shelf_once(demo_db, client):
    seed_demo.main()
    with demo_db() as db:
        emails = {u.email for u in db.query(User)}
        juan = db.query(User).filter_by(email="juan@example.com").one()
        shelf = db.query(CollectionEntry).filter_by(user_id=juan.id).all()
    assert {"admin@example.com", "juan@example.com"} <= emails
    assert len(shelf) == 8

    # Demo password works through the real login
    res = client.post("/api/v1/auth/login", json={"email": "juan@example.com", "password": settings.demo_password})
    assert res.status_code == 200

    # A title juan removes stays removed on the next start
    with demo_db() as db:
        db.delete(db.query(CollectionEntry).filter_by(user_id=juan.id).first())
        db.commit()
    seed_demo.main()
    with demo_db() as db:
        assert db.query(User).count() == len(emails)
        assert db.query(CollectionEntry).filter_by(user_id=juan.id).count() == 7
