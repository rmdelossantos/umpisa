import pytest
from fastapi.testclient import TestClient

from main import app
from tests.conftest import PASSWORD


def login(client, email="ana@example.com", password=PASSWORD, ip=None):
    headers = {"x-test-client-ip": ip} if ip else {}
    return client.post("/api/v1/auth/login", json={"email": email, "password": password}, headers=headers)


@pytest.fixture
def multi_ip_client(client):
    """A client whose source IP can be set per request via the x-test-client-ip header."""

    async def asgi(scope, receive, send):
        ip = dict(scope.get("headers", [])).get(b"x-test-client-ip")
        if ip:
            scope = {**scope, "client": (ip.decode(), 50000)}
        await app(scope, receive, send)

    # `client` installs the test database override on `app`
    return TestClient(asgi)


def test_login_limited_per_ip(client, make_user):
    make_user()
    for _ in range(5):
        assert login(client, password="wrong-password").status_code == 401
    res = login(client, password="wrong-password")
    assert res.status_code == 429
    assert "retry-after" in res.headers


def test_failed_logins_capped_per_email(multi_ip_client, make_user):
    make_user()
    # Each attempt from a different IP, so only the per-email rule can trigger
    for i in range(10):
        assert login(multi_ip_client, password="wrong-password", ip=f"10.0.0.{i}").status_code == 401
    res = login(multi_ip_client, ip="10.0.0.99")  # right password, but the email is locked
    assert res.status_code == 429
    assert int(res.headers["retry-after"]) > 0


def test_unknown_email_capped_the_same_way(multi_ip_client):
    for i in range(10):
        res = login(multi_ip_client, email="nobody@example.com", ip=f"10.0.0.{i}")
        assert res.status_code == 401
    assert login(multi_ip_client, email="nobody@example.com", ip="10.0.0.99").status_code == 429


def test_successful_logins_do_not_count_toward_email_cap(multi_ip_client, make_user):
    make_user()
    for i in range(15):
        assert login(multi_ip_client, ip=f"10.0.1.{i}").status_code == 200


def test_default_limit_applies_to_all_api_routes(logged_in_client):
    statuses = [logged_in_client.get("/api/v1/users").status_code for _ in range(121)]
    assert statuses[:120] == [200] * 120
    assert statuses[120] == 429


def test_health_is_exempt(client):
    assert all(client.get("/api/health").status_code == 200 for _ in range(200))
