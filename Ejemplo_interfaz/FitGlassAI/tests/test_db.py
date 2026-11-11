"""Pruebas de la base de datos SQLite y de la API del armario (/api/wardrobe)."""
import base64
import json
import os
import threading
import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app import db as vitra_db
from app.api.auth import users_db
from app.main import app

client = TestClient(app)


@pytest.fixture
def temp_db(tmp_path):
    """Usa una base temporal y restaura la de la suite al terminar."""
    original = vitra_db.db_path()
    path = str(tmp_path / "t.db")
    vitra_db.use_database(path)
    yield path
    vitra_db.use_database(original)


# ---------------------------------------------------------------- capa SQLite
def test_migrates_legacy_json_once_and_renames(temp_db, tmp_path):
    legacy = tmp_path / "users_db.json"
    legacy.write_text(json.dumps({
        "A@x.com": {"email": "A@x.com", "hashed_password": "h1", "name": "A", "age": 20},
        "b@x.com": {"email": "b@x.com", "hashed_password": "h2", "name": "B"},
    }), encoding="utf-8")

    assert vitra_db.migrate_legacy_json([str(legacy)]) == 2
    users = vitra_db.load_users()
    assert set(users) == {"a@x.com", "b@x.com"}
    assert users["a@x.com"]["hashed_password"] == "h1"
    assert not legacy.exists() and (tmp_path / "users_db.json.migrated").exists()
    assert vitra_db.migrate_legacy_json([str(legacy)]) == 0  # idempotente


def test_invalid_legacy_json_is_left_untouched(temp_db, tmp_path):
    legacy = tmp_path / "users_db.json"
    legacy.write_text('{"a@x.com": {"email": ', encoding="utf-8")  # JSON truncado
    assert vitra_db.migrate_legacy_json([str(legacy)]) == 0
    assert legacy.exists()
    assert vitra_db.load_users() == {}


def test_users_survive_reopen(temp_db):
    users = {"a@x.com": {"email": "a@x.com", "hashed_password": "h", "name": "A", "color_profile": {"season": "Otoño"}}}
    vitra_db.save_users(users)
    vitra_db.use_database(temp_db)  # "reinicio"
    assert vitra_db.load_users() == users


def test_save_users_removes_absent_and_cascades(temp_db):
    vitra_db.save_users({"a@x.com": {"email": "a@x.com"}, "b@x.com": {"email": "b@x.com"}})
    vitra_db.upsert_item("garments", "b@x.com", "g1", {"id": "g1", "name": "Tee"}, 1)
    vitra_db.save_users({"a@x.com": {"email": "a@x.com"}})
    assert set(vitra_db.load_users()) == {"a@x.com"}
    assert vitra_db.list_items("garments", "b@x.com") == []


def test_corrupt_database_stops_startup_and_is_not_wiped(tmp_path):
    original = vitra_db.db_path()
    bad = tmp_path / "bad.db"
    bad.write_bytes(b"esto no es una base sqlite" * 100)
    before = bad.read_bytes()
    try:
        with pytest.raises(vitra_db.DatabaseError):
            vitra_db.use_database(str(bad))
        assert bad.read_bytes() == before  # no se sobrescribió
    finally:
        vitra_db.use_database(original)


def test_concurrent_writes_are_all_persisted(temp_db):
    users = {}
    errors = []

    def worker(i):
        try:
            email = f"t{i}@x.com"
            users[email] = {"email": email, "hashed_password": "h"}
            vitra_db.save_users(users)
            vitra_db.upsert_item("garments", email, f"g{i}", {"id": f"g{i}", "name": "Tee"}, vitra_db.now_ms())
        except Exception as e:  # pragma: no cover
            errors.append(repr(e))

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(50)]
    [t.start() for t in threads]
    [t.join() for t in threads]

    assert errors == []
    vitra_db.save_users(users)
    assert len(vitra_db.load_users()) == 50
    assert all(len(vitra_db.list_items("garments", f"t{i}@x.com")) == 1 for i in range(50))


def test_last_write_wins_and_tombstones(temp_db):
    vitra_db.save_users({"a@x.com": {"email": "a@x.com"}})
    assert vitra_db.upsert_item("garments", "a@x.com", "g", {"id": "g", "name": "nuevo"}, 200)
    assert not vitra_db.upsert_item("garments", "a@x.com", "g", {"id": "g", "name": "viejo"}, 100)
    assert vitra_db.list_items("garments", "a@x.com")[0]["name"] == "nuevo"

    assert not vitra_db.delete_item("garments", "a@x.com", "g", 150)   # borrado más viejo que la edición: ignorado
    assert vitra_db.delete_item("garments", "a@x.com", "g", 300)
    assert vitra_db.list_items("garments", "a@x.com") == []
    assert vitra_db.list_deleted_ids("garments", "a@x.com") == ["g"]
    assert not vitra_db.upsert_item("garments", "a@x.com", "g", {"id": "g", "name": "zombi"}, 250)


def test_table_name_is_whitelisted(temp_db):
    with pytest.raises(ValueError):
        vitra_db.list_items("users; DROP TABLE users", "a@x.com")


# ---------------------------------------------------------------- API /api/wardrobe
def _make_user():
    email = f"w_{uuid.uuid4().hex[:8]}@vitra.ai"
    assert client.post("/api/auth/register", json={"email": email, "password": "secret123", "name": "W"}).status_code == 201
    token = client.post("/api/auth/login", json={"email": email, "password": "secret123"}).json()["access_token"]
    return email, {"Authorization": f"Bearer {token}"}


@pytest.fixture
def two_users():
    a = _make_user()
    b = _make_user()
    yield a, b
    from app.api.auth import save_users_db
    for email, _ in (a, b):
        users_db.pop(email, None)
    save_users_db()


def test_wardrobe_requires_token():
    assert client.get("/api/wardrobe").status_code == 401
    assert client.put("/api/wardrobe/garments/x", json={"id": "x", "name": "n"}).status_code == 401
    assert client.post("/api/wardrobe/sync", json={}).status_code == 401


def test_garment_crud_and_user_isolation(two_users):
    (_, ha), (_, hb) = two_users
    g = {"id": "g1", "name": "Camiseta", "category": "Tops", "colorHex": "#112233", "updatedAt": 1000}
    r = client.put("/api/wardrobe/garments/g1", json=g, headers=ha)
    assert r.status_code == 200 and r.json()["applied"] is True

    mine = client.get("/api/wardrobe", headers=ha).json()
    assert [x["id"] for x in mine["garments"]] == ["g1"]
    assert mine["garments"][0]["colorHex"] == "#112233"           # campos extra conservados
    assert client.get("/api/wardrobe", headers=hb).json()["garments"] == []   # el otro usuario no lo ve

    # otro usuario no puede borrarla ni sobrescribirla (opera sobre SU propio espacio)
    client.delete("/api/wardrobe/garments/g1", headers=hb)
    assert len(client.get("/api/wardrobe", headers=ha).json()["garments"]) == 1

    old = dict(g, name="viejo", updatedAt=500)
    assert client.put("/api/wardrobe/garments/g1", json=old, headers=ha).json()["applied"] is False

    assert client.delete("/api/wardrobe/garments/g1?updatedAt=2000", headers=ha).json()["applied"] is True
    state = client.get("/api/wardrobe", headers=ha).json()
    assert state["garments"] == [] and state["deletedGarments"] == ["g1"]


def test_put_rejects_mismatched_id():
    _, h = _make_user()
    assert client.put("/api/wardrobe/garments/a", json={"id": "b", "name": "x"}, headers=h).status_code == 400


def test_sync_merges_and_returns_state(two_users):
    (_, ha), _ = two_users
    client.put("/api/wardrobe/garments/s1", json={"id": "s1", "name": "Servidor", "updatedAt": 5000}, headers=ha)
    payload = {
        "garments": [
            {"id": "s1", "name": "Cliente viejo", "updatedAt": 1000},   # pierde
            {"id": "c1", "name": "Cliente nuevo", "updatedAt": 3000},   # se añade
        ],
        "looks": [{"id": "l1", "title": "Look", "garments": [], "updatedAt": 10}],
        "deletedGarments": [{"id": "zz", "updatedAt": 10}],
        "categories": {"items": ["Todos", "Fiesta"], "updatedAt": 10},
    }
    res = client.post("/api/wardrobe/sync", json=payload, headers=ha)
    assert res.status_code == 200
    body = res.json()
    by_id = {g["id"]: g for g in body["garments"]}
    assert by_id["s1"]["name"] == "Servidor"
    assert by_id["c1"]["name"] == "Cliente nuevo"
    assert [l["id"] for l in body["looks"]] == ["l1"]
    assert body["categories"]["items"] == ["Todos", "Fiesta"]
    assert "zz" in body["deletedGarments"]


def test_garment_image_is_stored_privately_and_served(two_users):
    (email_a, ha), _ = two_users
    raw = b"\xff\xd8\xff" + b"i" * 300
    uri = "data:image/jpeg;base64," + base64.b64encode(raw).decode()
    r = client.put("/api/wardrobe/garments/img", json={"id": "img", "name": "Con foto", "imageUrl": uri}, headers=ha)
    assert r.status_code == 200
    url = r.json()["item"]["imageUrl"]
    assert "/api/wardrobe/image/" in url and not url.startswith("data:")

    # el JSON guardado en la BD no contiene la imagen en base64
    stored = vitra_db.list_items("garments", email_a)[0]
    assert stored["imageUrl"].startswith("photo://") and "base64" not in json.dumps(stored)
    served = client.get(url.replace("http://testserver", ""))
    assert served.status_code == 200 and served.content == raw
    assert client.get("/api/wardrobe/image/../../etc/passwd").status_code in (404, 422)
    assert client.get("/api/wardrobe/image/" + "0" * 24 + ".jpg").status_code == 404


def test_invalid_and_oversized_images_rejected(two_users):
    (_, ha), _ = two_users
    bad = client.put("/api/wardrobe/garments/x", json={"id": "x", "name": "n", "imageUrl": "data:image/gif;base64,AAAA"}, headers=ha)
    assert bad.status_code == 400
    huge = "data:image/png;base64," + "A" * 12_500_000
    assert client.put("/api/wardrobe/garments/y", json={"id": "y", "name": "n", "imageUrl": huge}, headers=ha).status_code == 413


def test_local_file_uri_is_not_stored_as_remote_image(two_users):
    (_, ha), _ = two_users
    r = client.put("/api/wardrobe/garments/f", json={"id": "f", "name": "n", "imageUrl": "file:///cache/x.jpg"}, headers=ha)
    assert r.json()["item"]["imageUrl"] is None


# ---------------------------------------------------------------- un fallo de guardado ya no es silencioso
def test_register_fails_loudly_when_db_save_fails():
    email = f"fail_{uuid.uuid4().hex[:6]}@vitra.ai"
    with patch("app.api.auth.vitra_db.save_users", side_effect=RuntimeError("disco lleno")):
        res = client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    assert res.status_code == 500
    assert email not in users_db   # no queda una cuenta fantasma solo en memoria
