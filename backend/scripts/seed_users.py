"""Seed the initial user list from scripts/seed_users.json.

Usage:
    docker compose exec backend python -m scripts.seed_users
    docker compose exec -e SEED_PASSWORD=... backend python -m scripts.seed_users --file other.json

Every seeded user gets the same password: SEED_PASSWORD if set, otherwise prompted (getpass),
so no password is stored in the repo. Users whose email or username already exists are skipped,
so it is safe to run more than once.
"""

import argparse
import getpass
import json
import os
import sys
from pathlib import Path

from pydantic import ValidationError
from sqlalchemy.orm import Session

from database import SessionLocal
from user import service
from user.schemas import UserCreate

DEFAULT_FILE = Path(__file__).with_name("seed_users.json")
ROLES = {"user", "admin"}


def load_entries(path: Path, password: str) -> list[tuple[UserCreate, str]]:
    """Validate every entry before anything is written, so a bad file seeds nothing."""
    entries = []
    for i, raw in enumerate(json.loads(path.read_text())):
        role = raw.pop("role", "user")
        if role not in ROLES:
            raise ValueError(f"entry {i}: unknown role {role!r} (expected one of {sorted(ROLES)})")
        try:
            entries.append((UserCreate(**raw, password=password), role))
        except ValidationError as e:
            raise ValueError(f"entry {i} ({raw.get('email')}): {e}") from e
    return entries


def seed(db: Session, entries: list[tuple[UserCreate, str]]) -> tuple[list[str], list[str]]:
    created, skipped = [], []
    for data, role in entries:
        if service.email_or_username_taken(db, data.email, data.username):
            skipped.append(data.email)
        else:
            service.create_user(db, data, role=role)
            created.append(data.email)
    return created, skipped


def read_password() -> str:
    if password := os.environ.get("SEED_PASSWORD"):
        return password
    password = getpass.getpass("Password for seeded users: ")
    if password != getpass.getpass("Confirm password: "):
        raise ValueError("Passwords do not match")
    return password


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE, help="JSON list of users")
    args = parser.parse_args()

    try:
        entries = load_entries(args.file, read_password())
    except (ValueError, OSError) as e:
        print(e, file=sys.stderr)
        return 1

    with SessionLocal() as db:
        created, skipped = seed(db, entries)
    for email in created:
        print(f"created  {email}")
    for email in skipped:
        print(f"skipped  {email} (already exists)")
    print(f"{len(created)} created, {len(skipped)} skipped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
