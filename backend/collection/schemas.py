from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from catalog.schemas import MediaType

EntryStatus = Literal["planning", "in_progress", "done"]


class EntryCreate(BaseModel):
    """Only the id and status come from the client; title metadata is fetched from AniList server-side."""

    media_type: MediaType
    anilist_id: int = Field(gt=0)
    status: EntryStatus


class EntryUpdate(BaseModel):
    status: EntryStatus


class EntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    media_type: MediaType
    anilist_id: int
    status: EntryStatus
    title: str
    image_url: str | None
    kind: str | None
    units: int | None
    year: int | None
    created_at: datetime
    updated_at: datetime
