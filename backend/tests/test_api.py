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


def _create(client, **overrides):
    res = client.post("/api/v1/users", json={**NEW_USER, **overrides})
    assert res.status_code == 201
    return res.json()


def test_non_admin_cannot_manage_users(user_client):
    assert user_client.get("/api/v1/users").status_code == 403
    assert user_client.post("/api/v1/users", json=NEW_USER).status_code == 403
    assert user_client.patch("/api/v1/users/1", json={"first_name": "X"}).status_code == 403
    assert user_client.delete("/api/v1/users/1").status_code == 403
    # Their own session still works
    assert user_client.get("/api/v1/auth/me").status_code == 200


def test_admin_edits_user(logged_in_client):
    bo = _create(logged_in_client)
    res = logged_in_client.patch(
        f"/api/v1/users/{bo['id']}",
        json={"first_name": "Bob", "email": "bob@example.com", "role": "admin", "status": "inactive"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["details"]["first_name"] == "Bob"
    assert body["details"]["last_name"] == "Reyes"  # untouched fields stay
    assert (body["email"], body["role"], body["status"]) == ("bob@example.com", "admin", "inactive")


def test_admin_resets_password(client, logged_in_client):
    bo = _create(logged_in_client)
    logged_in_client.patch(f"/api/v1/users/{bo['id']}", json={"password": "brand-new-pass"})
    logged_in_client.post("/api/v1/auth/logout")
    res = client.post("/api/v1/auth/login", json={"email": "bo@example.com", "password": "brand-new-pass"})
    assert res.status_code == 200


def test_edit_rejects_taken_email_or_invalid_values(logged_in_client):
    bo = _create(logged_in_client)
    url = f"/api/v1/users/{bo['id']}"
    assert logged_in_client.patch(url, json={"email": "ana@example.com"}).status_code == 409
    assert logged_in_client.patch(url, json={"username": "ana"}).status_code == 409
    assert logged_in_client.patch(url, json={"role": "root"}).status_code == 422
    assert logged_in_client.patch(url, json={"password": "short"}).status_code == 422
    # Keeping your own email isn't a conflict
    assert logged_in_client.patch(url, json={"email": "bo@example.com"}).status_code == 200


def test_admin_cannot_lock_themselves_out(logged_in_client):
    me = logged_in_client.get("/api/v1/auth/me").json()
    url = f"/api/v1/users/{me['id']}"
    assert logged_in_client.patch(url, json={"role": "user"}).status_code == 400
    assert logged_in_client.patch(url, json={"status": "inactive"}).status_code == 400
    assert logged_in_client.delete(url).status_code == 400
    # Editing their own other details is fine
    assert logged_in_client.patch(url, json={"first_name": "Anabel"}).status_code == 200


def test_admin_deletes_user(logged_in_client):
    bo = _create(logged_in_client)
    assert logged_in_client.delete(f"/api/v1/users/{bo['id']}").status_code == 204
    assert [u["username"] for u in logged_in_client.get("/api/v1/users").json()] == ["ana"]
    assert logged_in_client.delete(f"/api/v1/users/{bo['id']}").status_code == 404
    assert logged_in_client.patch(f"/api/v1/users/{bo['id']}", json={"first_name": "X"}).status_code == 404


def test_deleted_users_session_ends(client, logged_in_client):
    bo = _create(logged_in_client)
    from auth.security import create_access_token

    token = create_access_token(bo["id"])
    logged_in_client.delete(f"/api/v1/users/{bo['id']}")
    client.cookies.clear()
    client.cookies.set("access_token", token)
    assert client.get("/api/v1/auth/me").status_code == 401
