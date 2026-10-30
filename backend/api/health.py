from fastapi import APIRouter, Request

from rate_limit import limiter

router = APIRouter(tags=["health"])


@router.get("/health")
@limiter.exempt
def health(request: Request) -> dict[str, str]:
    return {"status": "ok"}
