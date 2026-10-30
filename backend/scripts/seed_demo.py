"""Create the demo accounts and a starter shelf, so a fresh install can be logged into right away.

Runs on every container start (see the Dockerfile CMD) and does nothing unless SEED_DEMO=true.
Accounts come from scripts/seed_users.json, all with DEMO_PASSWORD. Existing accounts are skipped,
and juan's starter shelf is only added the run that creates juan, so titles he removes stay removed.
"""
import json
import sys
from pathlib import Path

from catalog.schemas import CatalogItem
from collection.service import add_entry
from config import settings
from database import SessionLocal
from scripts.seed_users import DEFAULT_FILE, load_entries, seed
from user import service

DEMO_SHELF = Path(__file__).with_name("demo_shelf.json")  # a snapshot of real AniList titles
SHELF_OWNER = "juan@example.com"


def main() -> int:
    if not settings.seed_demo:
        return 0

    entries = load_entries(DEFAULT_FILE, settings.demo_password)
    with SessionLocal() as db:
        created, _ = seed(db, entries)
        if SHELF_OWNER in created:
            owner = service.get_user_by_email(db, SHELF_OWNER)
            for row in json.loads(DEMO_SHELF.read_text()):
                status = row.pop("status")
                add_entry(db, owner.id, CatalogItem(**row), status)

    print(f"demo seed: {len(created)} account(s) created")
    return 0


if __name__ == "__main__":
    sys.exit(main())
