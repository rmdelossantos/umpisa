from typing import Literal

from pydantic import BaseModel

MediaType = Literal["anime", "manga"]


class CatalogItem(BaseModel):
    """A title from AniList, trimmed to what the shelf and search results need."""

    media_type: MediaType
    anilist_id: int
    title: str
    image_url: str | None
    kind: str | None  # AniList's format, labelled: TV, Movie, Manga, Light Novel…
    units: int | None  # episodes for anime, chapters for manga
    year: int | None


class CatalogPage(BaseModel):
    items: list[CatalogItem]
    page: int
    has_next_page: bool
