import json

import pytest

from scripts.seed_users import DEFAULT_FILE, load_entries, seed
from user import service
from user.models import User

PASSWORD = "seed-pass-123"


def test_default_file_is_valid():
    entries = load_entries(DEFAULT_FILE, PASSWORD)
    assert entries
    assert any(role == "admin" for _, role in entries)


def test_seed_creates_users_and_is_idempotent(session_factory):
    entries = load_entries(DEFAULT_FILE, PASSWORD)
    with session_factory() as db:
        created, skipped = seed(db, entries)
        assert len(created) == len(entries) and skipped == []

        created, skipped = seed(db, load_entries(DEFAULT_FILE, PASSWORD))
        assert created == [] and len(skipped) == len(entries)

        users = service.list_users(db)
        assert len(users) == len(entries)
        admin = next(u for u in users if u.username == "admin")
        assert admin.role == "admin" and admin.status == "active"
        assert all(u.details is not None for u in users)


def test_seeded_user_can_log_in(client, session_factory):
    with session_factory() as db:
        seed(db, load_entries(DEFAULT_FILE, PASSWORD))
    res = client.post("/api/v1/auth/login", json={"email": "juan@example.com", "password": PASSWORD})
    assert res.status_code == 200
    assert res.json()["details"]["last_name"] == "Dela Cruz"


def test_existing_user_is_skipped_not_overwritten(session_factory, make_user):
    make_user(email="maria@example.com", username="someone-else")
    with session_factory() as db:
        created, skipped = seed(db, load_entries(DEFAULT_FILE, PASSWORD))
        assert skipped == ["maria@example.com"]
        assert db.query(User).filter_by(email="maria@example.com").one().username == "someone-else"


def test_invalid_file_seeds_nothing(tmp_path, session_factory):
    bad = tmp_path / "users.json"
    bad.write_text(
        json.dumps(
            [
                {"email": "ok@example.com", "username": "okay", "first_name": "O", "last_name": "K"},
                {"email": "not-an-email", "username": "bad", "first_name": "B", "last_name": "D"},
            ]
        )
    )
    with pytest.raises(ValueError, match="entry 1"):
        load_entries(bad, PASSWORD)

    bad.write_text(
        json.dumps(
            [
                {"email": "ok@example.com", "username": "okay", "first_name": "O", "last_name": "K", "role": "root"},
            ]
        )
    )
    with pytest.raises(ValueError, match="unknown role"):
        load_entries(bad, PASSWORD)
