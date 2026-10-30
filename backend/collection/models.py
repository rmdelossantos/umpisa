from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class CollectionEntry(Base):
    """A title on a user's shelf. Title metadata is a snapshot from AniList taken when it was saved."""

    __tablename__ = "collection_entries"
    __table_args__ = (UniqueConstraint("user_id", "media_type", "anilist_id", name="uq_entry_user_title"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    media_type: Mapped[str] = mapped_column(String(10))
    anilist_id: Mapped[int]
    status: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(500))
    image_url: Mapped[str | None] = mapped_column(String(1000))
    kind: Mapped[str | None] = mapped_column(String(50))
    units: Mapped[int | None]
    year: Mapped[int | None]
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
