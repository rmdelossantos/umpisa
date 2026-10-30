from sqlalchemy import select
from sqlalchemy.orm import Session

from catalog.schemas import CatalogItem
from collection.models import CollectionEntry
from collection.schemas import EntryStatus


def list_entries(db: Session, user_id: int) -> list[CollectionEntry]:
    query = select(CollectionEntry).where(CollectionEntry.user_id == user_id)
    return list(db.scalars(query.order_by(CollectionEntry.updated_at.desc(), CollectionEntry.id.desc())))


def get_entry(db: Session, user_id: int, entry_id: int) -> CollectionEntry | None:
    """Another user's entry reads as missing, so ids don't leak across shelves."""
    entry = db.get(CollectionEntry, entry_id)
    return entry if entry is not None and entry.user_id == user_id else None


def is_saved(db: Session, user_id: int, media_type: str, anilist_id: int) -> bool:
    query = select(CollectionEntry.id).where(
        CollectionEntry.user_id == user_id,
        CollectionEntry.media_type == media_type,
        CollectionEntry.anilist_id == anilist_id,
    )
    return db.scalar(query) is not None


def add_entry(db: Session, user_id: int, item: CatalogItem, status: EntryStatus) -> CollectionEntry:
    entry = CollectionEntry(user_id=user_id, status=status, **item.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_status(db: Session, entry: CollectionEntry, status: EntryStatus) -> CollectionEntry:
    entry.status = status
    db.commit()
    db.refresh(entry)
    return entry


def remove_entry(db: Session, entry: CollectionEntry) -> None:
    db.delete(entry)
    db.commit()
