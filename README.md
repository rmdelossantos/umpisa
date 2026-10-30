# Umpisa Technical Interview

| Layer    | Tech                                        |
|----------|---------------------------------------------|
| Frontend | React 18 + Vite + React Router, served by nginx |
| Backend  | FastAPI + SQLAlchemy 2 + Alembic            |
| Auth     | JWT (PyJWT, HS256) in an httpOnly cookie     |
| Database | SQLite (Docker volume `sqlite-data`)        |
| Runtime  | Docker Compose                              |

## Run with Docker

```bash
cp .env.example .env
# set JWT_SECRET in .env:
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

docker compose up --build
```

- App: http://localhost:3000 (nginx proxies `/api` to the backend)
- API docs: http://localhost:3000/api/docs

The backend port isn't published in this mode: only nginx can reach it, because the backend trusts nginx's `X-Forwarded-For` header to find the client IP for rate limiting.

Dev mode with hot reload (Vite on :5173, uvicorn `--reload`, backend also on :8000):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Migrations run automatically when the backend container starts (`alembic upgrade head`).

## First login

There's no sign-up page. Create the first account from the CLI (prompts for the password):

```bash
docker compose exec backend python -m scripts.create_user \
  --email admin@example.com --username admin --first-name Ada --last-name Admin
```

Then open http://localhost:3000/login. Logged-in users can add more users from the home page.

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
cp .env.example .env              # set JWT_SECRET
alembic upgrade head
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
  config.py        settings (env: DATABASE_URL, JWT_SECRET, COOKIE_SECURE, RATE_LIMIT_*)
  database.py      engine, session, Base, get_db dependency
  rate_limit.py    slowapi limiter + per-email login failure limit
  api/             routes: /api/health, /api/v1/auth, /api/v1/users
  auth/            JWT encode/decode, get_current_user, login schema
  user/            user domain: models, schemas, service, password hashing
  migrations/      Alembic env + versions
  scripts/         create_user CLI
  tests/           pytest (in-memory SQLite)
frontend/
  src/             entry, routes, api client, auth context, pages
  components/      React components (ProtectedRoute, UserForm, UserList)
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
