# Umpisa Technical Interview

| Layer    | Tech                                        |
|----------|---------------------------------------------|
| Frontend | React 18 + Vite + React Router, served by nginx |
| Backend  | FastAPI + SQLAlchemy 2 + Alembic            |
| Auth     | JWT (PyJWT, HS256) in an httpOnly cookie     |
| Database | SQLite (Docker volume `sqlite-data`)        |
| Runtime  | Docker Compose                              |

## Quickstart

Requires Docker. No `.env` file or setup step is needed.

```bash
docker compose up --build
```

Open http://localhost:3000 and log in with a demo account (the login page lists them too):

| Email | Password | Role |
|---|---|---|
| `juan@example.com` | `umpisa-demo` | user, with a starter shelf of 8 titles |
| `admin@example.com` | `umpisa-demo` | admin (adds the Users page) |

- API docs: http://localhost:3000/api/docs
- Port 3000 taken? `APP_PORT=3100 docker compose up --build`
- What happens on first start:
  - Migrations run (`alembic upgrade head`).
  - A JWT signing secret is generated into the data volume, unless you set `JWT_SECRET` (at least 32 characters).
  - The accounts in `backend/scripts/seed_users.json` are created with `DEMO_PASSWORD`. Restarts skip existing accounts.
  - Turn the demo accounts off with `SEED_DEMO=false`. They're for local evaluation only; don't use them for a real deployment. Changing a demo user's password in the app doesn't change the hint on the login page.
- Optional overrides go in a `.env` file. See `.env.example`.

The backend port isn't published in this mode. Only nginx can reach it, because the backend trusts nginx's `X-Forwarded-For` header to find the client IP for rate limiting.

Dev mode with hot reload (Vite on :5173, uvicorn `--reload`, backend also on :8000):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Accounts

There's no sign-up page. Admins add, edit and delete users from the **Users** page. To create an account from the CLI (it prompts for the password):

```bash
docker compose exec backend python -m scripts.create_user \
  --email ana@example.com --username ana --first-name Ana --last-name Cruz --role admin
```

To promote (or demote) an existing account:

```bash
docker compose exec backend python -m scripts.set_role --email someone@example.com --role admin
```

### Roles

| | `user` | `admin` |
|---|---|---|
| Log in, Shelf, Search, My account | ✓ | ✓ |
| **Users** page and `/api/v1/users` (list, add, edit, delete) | — (403) | ✓ |

Admins can't delete their own account or change their own role or status, so the app can't lose its last admin by accident.

### Seeding the initial users

`backend/scripts/seed_users.json` holds the initial user list (one `admin`, the rest `user`). Every seeded user gets the same password, from `SEED_PASSWORD` or a prompt, so no password is stored in the repo:

```bash
docker compose exec -e SEED_PASSWORD='choose-one' backend python -m scripts.seed_users
# or pass another list: ... python -m scripts.seed_users --file path/to/users.json
```

- The whole file is validated before anything is written, so one bad entry means nothing is seeded.
- Users whose email or username already exists are skipped, not updated, so it's safe to run again.

Each entry takes `email`, `username`, `first_name`, `last_name`, and optionally `birthdate` (`YYYY-MM-DD`) and `role` (`user` | `admin`).

Users that existed before the auth migration have no usable password and can't log in.

## Authentication

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/auth/login` | `{email, password}` → sets the `access_token` cookie |
| POST | `/api/v1/auth/logout` | clears the cookie |
| GET  | `/api/v1/auth/me` | current user, or 401 |
| GET / POST | `/api/v1/users` | admin only: list / create |
| PATCH / DELETE | `/api/v1/users/{id}` | admin only: partial update (incl. role, status, password) / delete |

## Anime and manga catalog

Titles come from the public [AniList GraphQL API](https://docs.anilist.co/) (`https://graphql.anilist.co`, set by `ANILIST_URL`). Reads need no AniList account or key. The backend is the only caller, so every user shares one cache: searches are kept 10 minutes, the popular list an hour, and single titles a day. A 429 gets one retry, adult titles are always excluded, and when AniList is down these routes return 503 with a readable message.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/catalog/popular?type=anime\|manga&page=` | most popular first, 20 per page (pages 1–20) |
| GET | `/api/v1/catalog/search?type=anime\|manga&q=&page=` | `q` is 2–100 characters |
| GET / POST | `/api/v1/collection` | your shelf / add `{media_type, anilist_id, status}` |
| PATCH / DELETE | `/api/v1/collection/{id}` | change `status` / remove (your own entries only) |

`status` is `planning`, `in_progress` or `done` (shown as plan to watch/read, watching/reading, watched/read). When a title is added, the server looks it up on AniList itself and stores its title, cover, format, episode or chapter count and year with the entry, so the shelf loads from the database alone and still works when AniList is unreachable.

- The token lasts 30 minutes (`ACCESS_TOKEN_TTL_MINUTES`); there's no refresh token.
- The cookie is `HttpOnly; SameSite=Lax; Path=/api`. Set `COOKIE_SECURE=true` when serving over HTTPS.
- Logout clears the cookie only; a copied token stays valid until it expires.
- Only users with `status = active` can log in.

## Rate limiting

| Applies to | Counted per | Default | Setting |
|---|---|---|---|
| Every `/api/*` route except `/api/health` | client IP | 120/minute | `RATE_LIMIT_DEFAULT` |
| Login | client IP | 5/minute | `RATE_LIMIT_LOGIN` |
| Login, failed attempts only | email | 10 per 15 minutes | `RATE_LIMIT_LOGIN_FAILURES_PER_EMAIL` |

Counters are kept in memory, so **run the backend with a single uvicorn worker**. A restart resets the counters. To scale out, move the limiter's `storage_uri` to Redis.

## Run locally without Docker

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head            # a JWT secret is generated into data/.jwt_secret
SEED_DEMO=true python -m scripts.seed_demo   # optional demo accounts
uvicorn main:app --reload        # http://localhost:8000/api/docs

# frontend (separate terminal)
cd frontend
npm install
npm run dev                       # http://localhost:5173, proxies /api to :8000
```

## Tests

```bash
cd backend && pytest
```

## Layout

```
backend/
  main.py          FastAPI app, rate-limit middleware, CORS, router mount at /api
  config.py        settings (env: DATABASE_URL, JWT_SECRET, COOKIE_SECURE, RATE_LIMIT_*, ANILIST_URL)
  database.py      engine, session, Base, get_db dependency
  rate_limit.py    slowapi limiter + per-email login failure limit
  api/             routes: /api/health, /api/v1/auth, /api/v1/users, /api/v1/catalog, /api/v1/collection
  auth/            JWT encode/decode, get_current_user, login schema
  user/            user domain: models, schemas, service, password hashing
  catalog/         AniList client (search, popular, lookup) with an in-memory cache
  collection/      shelf entries: model, schemas, service
  migrations/      Alembic env + versions
  scripts/         create_user, set_role and seed_users CLIs
  tests/           pytest (in-memory SQLite)
frontend/
  src/             entry, routes, api client, auth context, pages (Shelf, Search, My account, Users, Login)
  components/      app shell, route guards, spines and shelf, status menu, user form/list, dialog, icons
  nginx.conf       prod static serving + /api proxy
docker-compose.yml       prod-like stack
docker-compose.dev.yml   hot-reload overrides
```

API routes follow `docs/ROUTING.md`: `/api/v<number>/<domain>`.

## Adding a migration

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```
