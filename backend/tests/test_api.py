NEW_USER = {
    "email": "bo@example.com",
    "username": "bobby",
    "password": "password123",
    "first_name": "Bo",
    "last_name": "Reyes",
    "birthdate": "1990-05-01",
}


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_users_require_auth(client):
    assert client.get("/api/v1/users").status_code == 401
    assert client.post("/api/v1/users", json=NEW_USER).status_code == 401


def test_create_and_list_users(logged_in_client):
    res = logged_in_client.post("/api/v1/users", json=NEW_USER)
    assert res.status_code == 201
    body = res.json()
    assert body["username"] == "bobby"
    assert body["role"] == "user"
    assert body["status"] == "active"
    assert body["details"] == {"first_name": "Bo", "last_name": "Reyes", "birthdate": "1990-05-01"}
    assert "password" not in body

    res = logged_in_client.get("/api/v1/users")
    assert [u["username"] for u in res.json()] == ["ana", "bobby"]
    assert all("password" not in u for u in res.json())


def test_duplicate_email_or_username_conflicts(logged_in_client):
    dup_email = {**NEW_USER, "email": "ana@example.com"}
    dup_username = {**NEW_USER, "username": "ana"}
    assert logged_in_client.post("/api/v1/users", json=dup_email).status_code == 409
    assert logged_in_client.post("/api/v1/users", json=dup_username).status_code == 409


def test_short_password_rejected(logged_in_client):
    assert logged_in_client.post("/api/v1/users", json={**NEW_USER, "password": "short"}).status_code == 422
