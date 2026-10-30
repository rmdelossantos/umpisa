from fastapi import APIRouter

from api import auth, catalog, collection, health, users

# Domain routes are versioned per docs/ROUTING.md: /api/v<number>/<domain>
v1_router = APIRouter(prefix="/v1")
v1_router.include_router(auth.router)
v1_router.include_router(users.router)
v1_router.include_router(catalog.router)
v1_router.include_router(collection.router)

api_router = APIRouter()
api_router.include_router(health.router)  # unversioned: the Docker health check depends on it
api_router.include_router(v1_router)
