from limits import parse
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings

# In-memory counters: correct only with a single uvicorn worker
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.rate_limit_default],
    headers_enabled=True,
    enabled=settings.rate_limit_enabled,
    storage_uri="memory://",
)
LOGIN_FAILURES_PER_EMAIL = parse(settings.rate_limit_login_failures_per_email)
