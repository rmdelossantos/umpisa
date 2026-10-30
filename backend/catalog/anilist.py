import time

import httpx

from catalog.schemas import CatalogItem, CatalogPage, MediaType
from config import settings

SEARCH_TTL_SECONDS = 10 * 60
DETAIL_TTL_SECONDS = 24 * 60 * 60
PAGE_SIZE = 20

# AniList's format enum, as the shelf shows it
FORMATS = {
    "TV": "TV",
    "TV_SHORT": "TV Short",
    "MOVIE": "Movie",
    "SPECIAL": "Special",
    "OVA": "OVA",
    "ONA": "ONA",
    "MUSIC": "Music",
    "MANGA": "Manga",
    "NOVEL": "Light Novel",
    "ONE_SHOT": "One-shot",
}

MEDIA_FIELDS = "id title { english romaji } format episodes chapters startDate { year } coverImage { large }"

SEARCH_QUERY = f"""
query ($q: String, $type: MediaType, $page: Int, $perPage: Int) {{
  Page(page: $page, perPage: $perPage) {{
    pageInfo {{ hasNextPage }}
    media(search: $q, type: $type, isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) {{ {MEDIA_FIELDS} }}
  }}
}}
"""

GET_QUERY = f"""
query ($id: Int, $type: MediaType) {{
  Media(id: $id, type: $type, isAdult: false) {{ {MEDIA_FIELDS} }}
}}
"""


class CatalogUnavailable(Exception):
    """AniList timed out, errored, or kept rate-limiting us."""


class CatalogNotFound(Exception):
    """AniList has no title with that id (or it's an adult title, which we never serve)."""


def normalize(media_type: MediaType, raw: dict) -> CatalogItem:
    title = raw.get("title") or {}
    return CatalogItem(
        media_type=media_type,
        anilist_id=raw["id"],
        title=title.get("english") or title["romaji"],
        image_url=(raw.get("coverImage") or {}).get("large"),
        kind=FORMATS.get(raw.get("format"), raw.get("format")),
        units=raw.get("episodes") if media_type == "anime" else raw.get("chapters"),
        year=(raw.get("startDate") or {}).get("year"),
    )


class AniListClient:
    """Read-only AniList GraphQL client (no account or token needed) with an in-memory TTL cache.

    The cache is per process, which is fine with the single uvicorn worker.
    """

    def __init__(self, url: str, timeout: float = 8.0):
        self._http = httpx.Client(timeout=timeout)
        self._url = url
        self._cache: dict[tuple, tuple[float, object]] = {}

    def search(self, media_type: MediaType, q: str, page: int = 1) -> CatalogPage:
        key = ("search", media_type, q.strip().lower(), page)
        if (hit := self._cached(key)) is not None:
            return hit
        variables = {"q": q, "type": media_type.upper(), "page": page, "perPage": PAGE_SIZE}
        data = self._query(SEARCH_QUERY, variables)["Page"]
        result = CatalogPage(
            items=[normalize(media_type, raw) for raw in data["media"]],
            page=page,
            has_next_page=bool(data["pageInfo"]["hasNextPage"]),
        )
        self._store(key, result, SEARCH_TTL_SECONDS)
        return result

    def get(self, media_type: MediaType, anilist_id: int) -> CatalogItem:
        key = ("get", media_type, anilist_id)
        if (hit := self._cached(key)) is not None:
            return hit
        data = self._query(GET_QUERY, {"id": anilist_id, "type": media_type.upper()})
        if not data.get("Media"):
            raise CatalogNotFound(anilist_id)
        result = normalize(media_type, data["Media"])
        self._store(key, result, DETAIL_TTL_SECONDS)
        return result

    def _query(self, query: str, variables: dict) -> dict:
        for attempt in range(2):
            try:
                res = self._http.post(self._url, json={"query": query, "variables": variables})
            except httpx.HTTPError as e:
                raise CatalogUnavailable(str(e)) from e
            # AniList allows 30-90 requests/minute; one short retry absorbs a burst
            if res.status_code == 429 and attempt == 0:
                time.sleep(1)
                continue
            # GraphQL reports a missing Media as an HTTP 404 with an errors array
            if res.status_code == 404:
                raise CatalogNotFound(variables.get("id"))
            if res.status_code != 200:
                raise CatalogUnavailable(f"AniList returned {res.status_code}")
            return res.json()["data"]
        raise CatalogUnavailable("AniList rate limit")

    def _cached(self, key: tuple):
        entry = self._cache.get(key)
        if entry and entry[0] > time.monotonic():
            return entry[1]
        return None

    def _store(self, key: tuple, value: object, ttl: int) -> None:
        self._cache[key] = (time.monotonic() + ttl, value)


_client = AniListClient(settings.anilist_url)


def get_catalog() -> AniListClient:
    """FastAPI dependency; tests override it with a fake."""
    return _client
