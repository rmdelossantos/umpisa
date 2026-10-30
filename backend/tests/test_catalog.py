from catalog.anilist import normalize


def test_search_requires_auth(client, catalog):
    assert client.get("/api/v1/catalog/search?type=anime&q=frieren").status_code == 401


def test_search_returns_matches(user_client, catalog):
    catalog.add()
    catalog.add(media_type="manga", anilist_id=2, title="Berserk", kind="Manga", units=None, year=1989)

    res = user_client.get("/api/v1/catalog/search?type=anime&q=frieren")
    assert res.status_code == 200
    body = res.json()
    assert [i["title"] for i in body["items"]] == ["Frieren: Beyond Journey's End"]
    assert body["has_next_page"] is False

    res = user_client.get("/api/v1/catalog/search?type=manga&q=berserk")
    assert [i["anilist_id"] for i in res.json()["items"]] == [2]


def test_search_validates_input(user_client, catalog):
    assert user_client.get("/api/v1/catalog/search?type=anime&q=f").status_code == 422
    assert user_client.get("/api/v1/catalog/search?type=novel&q=frieren").status_code == 422
    assert user_client.get("/api/v1/catalog/search?type=anime&q=frieren&page=0").status_code == 422


def test_search_when_catalog_is_down(user_client, catalog):
    catalog.down = True
    res = user_client.get("/api/v1/catalog/search?type=anime&q=frieren")
    assert res.status_code == 503
    assert "isn't responding" in res.json()["detail"]


def test_popular_lists_titles_by_type(user_client, catalog):
    catalog.add()
    catalog.add(media_type="manga", anilist_id=30002, title="Berserk", kind="Manga", units=None, year=1989)

    res = user_client.get("/api/v1/catalog/popular?type=manga")
    assert res.status_code == 200
    assert [i["title"] for i in res.json()["items"]] == ["Berserk"]
    assert user_client.get("/api/v1/catalog/popular?type=manga&page=21").status_code == 422


def test_popular_requires_auth_and_reports_outage(client, user_client, catalog):
    catalog.down = True
    assert user_client.get("/api/v1/catalog/popular?type=anime").status_code == 503
    user_client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/catalog/popular?type=anime").status_code == 401


def test_normalize_prefers_english_title_and_labels_format():
    raw = {
        "id": 154587,
        "title": {"english": "Frieren: Beyond Journey's End", "romaji": "Sousou no Frieren"},
        "format": "TV",
        "episodes": 28,
        "chapters": None,
        "startDate": {"year": 2023},
        "coverImage": {"large": "https://s4.anilist.co/frieren.jpg"},
    }
    item = normalize("anime", raw)
    assert item.anilist_id == 154587
    assert item.title == "Frieren: Beyond Journey's End"
    assert item.image_url == "https://s4.anilist.co/frieren.jpg"
    assert (item.kind, item.units, item.year) == ("TV", 28, 2023)


def test_normalize_manga_falls_back_to_romaji_and_chapters():
    raw = {
        "id": 30002,
        "title": {"english": None, "romaji": "Berserk"},
        "format": "NOVEL",
        "episodes": None,
        "chapters": None,
        "startDate": {"year": 1989},
        "coverImage": None,
    }
    item = normalize("manga", raw)
    assert item.title == "Berserk"
    assert item.image_url is None
    assert (item.kind, item.units, item.year) == ("Light Novel", None, 1989)
