from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.dependencies import get_current_user
from catalog.anilist import AniListClient, CatalogUnavailable, get_catalog
from catalog.schemas import CatalogPage, MediaType

CATALOG_DOWN = "The anime database isn't responding. Try again in a moment."

router = APIRouter(prefix="/catalog", tags=["catalog"], dependencies=[Depends(get_current_user)])


@router.get("/popular", response_model=CatalogPage)
def popular(
    type: MediaType,
    page: int = Query(default=1, ge=1, le=20),
    catalog: AniListClient = Depends(get_catalog),
):
    try:
        return catalog.popular(type, page)
    except CatalogUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, CATALOG_DOWN)


@router.get("/search", response_model=CatalogPage)
def search(
    type: MediaType,
    q: str = Query(min_length=2, max_length=100),
    page: int = Query(default=1, ge=1, le=20),
    catalog: AniListClient = Depends(get_catalog),
):
    try:
        return catalog.search(type, q, page)
    except CatalogUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, CATALOG_DOWN)
