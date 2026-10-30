FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN useradd --create-home appuser && mkdir -p /app/data && chown -R appuser /app/data
USER appuser

EXPOSE 8000

# Apply migrations, seed the demo accounts (a no-op unless SEED_DEMO=true), then serve
# --proxy-headers trusts X-Forwarded-For from any host: safe only because nginx is the
# sole client on the compose network and overwrites the header with the real client IP
CMD ["sh", "-c", "alembic upgrade head && python -m scripts.seed_demo && uvicorn main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips '*'"]
