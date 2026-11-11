"""El avatar generado en segundo plano se guarda en el perfil del usuario que inició la tarea."""
import base64
import time
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.auth import users_db, save_users_db
from app.main import app
from app.services.auth_service import create_access_token

client = TestClient(app)
IMG = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff" + b"b" * 300).decode()
GLB = "http://testserver/static/models/avatar_opt.glb"


@pytest.fixture
def two_users():
    a, b = (f"avatar_{uuid.uuid4().hex[:6]}@vitra.ai" for _ in range(2))
    for email in (a, b):
        users_db[email] = {"email": email, "name": email, "avatar_type": "preset"}
    save_users_db()
    yield a, b
    for email in (a, b):
        users_db.pop(email, None)
    save_users_db()


def _auth(email):
    return {"Authorization": f"Bearer {create_access_token({'sub': email, 'email': email})}"}


def _run_job(headers=None):
    with patch("app.api.avatar.generate_3d_model", new_callable=AsyncMock, return_value="https://m.com/raw.glb"), \
         patch("app.api.avatar.optimize_3d_model", new_callable=AsyncMock, return_value=GLB):
        start = client.post("/api/avatar/start", json={"image": IMG}, headers=headers or {})
        assert start.status_code == 200
        task_id = start.json()["task_id"]
        status = {}
        for _ in range(50):
            status = client.get(f"/api/avatar/status/{task_id}").json()
            if status["status"] in ("completed", "failed"):
                break
            time.sleep(0.1)
        return status


def test_avatar_is_saved_in_the_profile_of_the_token_owner(two_users):
    a, b = two_users
    status = _run_job(_auth(a))
    assert status["status"] == "completed" and status["avatar_url"] == GLB
    assert users_db[a]["avatar_url"] == GLB
    assert users_db[a]["avatar_type"] == "custom_3d"
    assert users_db[a]["body_image"].startswith("photo://")
    # el otro usuario no se toca
    assert "avatar_url" not in users_db[b]
    # /me devuelve el avatar guardado, así la app ya no lo revierte al preset
    me = client.get("/api/auth/me", headers=_auth(a)).json()
    assert me["avatar_url"].endswith("avatar_opt.glb") and me["avatar_type"] == "custom_3d"


def test_without_token_nothing_is_saved_and_owner_is_not_leaked(two_users):
    a, b = two_users
    status = _run_job()
    assert status["status"] == "completed"
    assert "avatar_url" not in users_db[a] and "avatar_url" not in users_db[b]
    assert a not in str(status) and "owner" not in status


def test_invalid_token_is_ignored(two_users):
    a, _ = two_users
    status = _run_job({"Authorization": "Bearer token-invalido"})
    assert status["status"] == "completed"
    assert "avatar_url" not in users_db[a]
