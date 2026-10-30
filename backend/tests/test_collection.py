from collection import service
from collection.models import CollectionEntry
from tests.conftest import PASSWORD


def add(client, anilist_id=154587, status="planning", media_type="anime"):
    return client.post(
        "/api/v1/collection", json={"media_type": media_type, "anilist_id": anilist_id, "status": status}
    )


def test_collection_requires_auth(client, catalog):
    assert client.get("/api/v1/collection").status_code == 401
    assert add(client).status_code == 401


def test_add_list_update_remove(user_client, catalog):
    catalog.add()

    res = add(user_client)
    assert res.status_code == 201
    entry = res.json()
    assert entry["title"] == "Frieren: Beyond Journey's End"
    assert (entry["status"], entry["units"], entry["kind"]) == ("planning", 28, "TV")

    assert [e["id"] for e in user_client.get("/api/v1/collection").json()] == [entry["id"]]

    res = user_client.patch(f"/api/v1/collection/{entry['id']}", json={"status": "in_progress"})
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"

    assert user_client.delete(f"/api/v1/collection/{entry['id']}").status_code == 204
    assert user_client.get("/api/v1/collection").json() == []


def test_metadata_comes_from_catalog_not_the_client(user_client, catalog):
    catalog.add()
    res = user_client.post(
        "/api/v1/collection",
        json={"media_type": "anime", "anilist_id": 154587, "status": "done", "title": "Spoofed", "image_url": "x"},
    )
    assert res.status_code == 201
    assert res.json()["title"] == "Frieren: Beyond Journey's End"
    assert res.json()["image_url"] != "x"


def test_duplicate_title_conflicts(user_client, catalog):
    catalog.add()
    assert add(user_client).status_code == 201
    assert add(user_client, status="done").status_code == 409


def test_same_id_as_anime_and_manga_are_different_titles(user_client, catalog):
    catalog.add(anilist_id=2, title="Anime Two")
    catalog.add(media_type="manga", anilist_id=2, title="Berserk")
    assert add(user_client, anilist_id=2).status_code == 201
    assert add(user_client, anilist_id=2, media_type="manga").status_code == 201


def test_unknown_title_and_catalog_down(user_client, catalog):
    assert add(user_client, anilist_id=999).status_code == 404
    catalog.add()
    catalog.down = True
    assert add(user_client).status_code == 503


def test_invalid_status_rejected(user_client, catalog):
    catalog.add()
    assert add(user_client, status="dropped").status_code == 422
    entry = add(user_client).json()
    assert user_client.patch(f"/api/v1/collection/{entry['id']}", json={"status": "on_hold"}).status_code == 422


def test_shelves_are_private(client, make_user, catalog):
    catalog.add()
    make_user()
    make_user(email="bo@example.com", username="bobby")

    client.post("/api/v1/auth/login", json={"email": "ana@example.com", "password": PASSWORD})
    entry = add(client).json()

    client.post("/api/v1/auth/login", json={"email": "bo@example.com", "password": PASSWORD})
    assert client.get("/api/v1/collection").json() == []
    assert client.patch(f"/api/v1/collection/{entry['id']}", json={"status": "done"}).status_code == 404
    assert client.delete(f"/api/v1/collection/{entry['id']}").status_code == 404


def test_deleting_a_user_removes_their_shelf(logged_in_client, make_user, session_factory, catalog):
    bo = make_user(email="bo@example.com", username="bobby")
    with session_factory() as db:
        service.add_entry(db, bo.id, catalog.add(), "done")

    assert logged_in_client.delete(f"/api/v1/users/{bo.id}").status_code == 204
    with session_factory() as db:
        assert db.query(CollectionEntry).count() == 0
