# AniList API

The catalog comes from AniList's public GraphQL API at `https://graphql.anilist.co` (`ANILIST_URL`). Reading needs no account or API key. The app first used Jikan (an unofficial MyAnimeList API), and switched when Jikan's server stopped responding.

The backend is the only caller (`backend/catalog/anilist.py`), so the browser never talks to AniList, and every user shares one cache.

## Queries

All three select the same fields: `id title { english romaji } format episodes chapters startDate { year } coverImage { large }`.

| Use | Query | Cache |
|---|---|---|
| Popular list (`/catalog/popular`) | `Page(page, perPage: 20) { pageInfo { hasNextPage } media(type, isAdult: false, sort: [POPULARITY_DESC]) }` | 1 hour |
| Search (`/catalog/search`) | same, plus `search: $q` and `sort: [SEARCH_MATCH, POPULARITY_DESC]` | 10 minutes |
| One title (adding to a shelf) | `Media(id, type, isAdult: false)` | 24 hours |

- **Adult titles:** always excluded (`isAdult: false`).
- **Titles:** the English title is preferred, falling back to romaji.
- **Formats:** shown with readable labels (`TV_SHORT` → "TV Short", `NOVEL` → "Light Novel", `ONE_SHOT` → "One-shot").
- **Units:** episodes for anime, chapters for manga.

## Limits and failures

- **Rate limit:** AniList allows 90 requests a minute, currently lowered to 30 (see the `X-RateLimit-Limit` header). A 429 gets one retry after a second.
- **Errors:** after that, a timeout (8 seconds), a 5xx or a repeated 429 becomes `503 The anime database isn't responding` from our API, and Search shows a retry.
- **Unknown title:** a missing or adult `Media` comes back from AniList as HTTP 404, and our API answers 404 `No anime with that id`.
- **Snapshot:** when a title is added to a shelf, its metadata is stored with the entry, so the shelf itself never calls AniList.
