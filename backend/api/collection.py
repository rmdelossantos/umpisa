from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.catalog import CATALOG_DOWN
from auth.dependencies import get_current_user
from catalog.anilist import AniListClient, CatalogNotFound, CatalogUnavailable, get_catalog
from collection import service
from collection.models import CollectionEntry
from collection.schemas import EntryCreate, EntryRead, EntryUpdate
from database import get_db
from user.models import User

# Every route works on the current user's own shelf
router = APIRouter(prefix="/collection", tags=["collection"])


def _get_or_404(db: Session, user: User, entry_id: int) -> CollectionEntry:
    entry = service.get_entry(db, user.id, entry_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Title not on your shelf")
    return entry


@router.get("", response_model=list[EntryRead])
def list_entries(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.list_entries(db, user.id)


@router.post("", response_model=EntryRead, status_code=status.HTTP_201_CREATED)
def add_entry(
    payload: EntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    catalog: AniListClient = Depends(get_catalog),
):
    if service.is_saved(db, user.id, payload.media_type, payload.anilist_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "That title is already on your shelf")
    try:
        item = catalog.get(payload.media_type, payload.anilist_id)
    except CatalogNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No {payload.media_type} with that id") from None
    except CatalogUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, CATALOG_DOWN) from None
    return service.add_entry(db, user.id, item, payload.status)


@router.patch("/{entry_id}", response_model=EntryRead)
def update_entry(
    entry_id: int,
    payload: EntryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.update_status(db, _get_or_404(db, user, entry_id), payload.status)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_entry(entry_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    service.remove_entry(db, _get_or_404(db, user, entry_id))
