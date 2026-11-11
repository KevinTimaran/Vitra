"""Pruebas del probador en cascada (/api/tryon/cascade*) y de colorimetría de usuario.

Todos los servicios externos (Replicate, CodeFormer, Tripo3D, optimizador, Gemini) están simulados.
Incluye regresiones de bugs ya corregidos (calzado/accesorios y estado de tarea con fallback).
"""
import time
import uuid
import pytest
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.api import tryon as tryon_api
from app.api.auth import users_db, save_users_db
from app.services.auth_service import create_access_token

client = TestClient(app)

HUMAN = "https://example.com/person.png"
OPT_URL = "http://testserver/static/models/look_opt.glb"


def _garments():
    # Orden deliberadamente desordenado: la cascada debe vestir pantalón -> camiseta -> chaqueta
    return [
        {"image": "https://example.com/blazer.png", "category": "upper_body", "name": "Blazer"},
        {"image": "https://example.com/tee.png", "category": "upper_body", "name": "Tee"},
        {"image": "https://example.com/pants.png", "category": "lower_body", "name": "Trousers"},
    ]


def _patches(vton=None, restore="https://mock.com/hd.png", tripo="https://mock.com/raw.glb", opt=OPT_URL):
    return (
        patch("app.api.tryon.generate_vton", new_callable=AsyncMock),
        patch("app.api.tryon.restore_image_quality", new_callable=AsyncMock),
        patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock),
        patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock),
    )


# ---------------------------------------------------------------- /cascade (síncrono)
def test_cascade_success_orders_chains_and_calls_tripo_once():
    p_vton, p_restore, p_tripo, p_opt = _patches()
    with p_vton as vton, p_restore as restore, p_tripo as tripo, p_opt as opt:
        vton.side_effect = ["https://m.com/s1.png", "https://m.com/s2.png", "https://m.com/s3.png"]
        restore.return_value = "https://m.com/hd.png"
        tripo.return_value = "https://m.com/raw.glb"
        opt.return_value = OPT_URL

        res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": _garments(), "allow_fallback": False})
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["status"] == "completed"
        assert data["model_3d_url"] == OPT_URL
        assert data["total_garments_applied"] == 3
        assert data["final_dressed_image_url"] == "https://m.com/hd.png"

        names = [c.kwargs["garment_description"] for c in vton.call_args_list]
        assert names == ["Trousers", "Tee", "Blazer"]

        cats = [c.kwargs["category"] for c in vton.call_args_list]
        assert cats[0] == "lower_body"

        # Cada paso recibe el lienzo del paso anterior
        humans = [c.kwargs["human_image_url"] for c in vton.call_args_list]
        assert humans == [HUMAN, "https://m.com/s1.png", "https://m.com/s2.png"]

        assert tripo.call_count == 1
        tripo.assert_called_once_with(image_url="https://m.com/hd.png")


def test_cascade_rejects_empty_garments():
    res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": []})
    assert res.status_code == 400


def test_cascade_rejects_missing_human_and_user():
    res = client.post("/api/tryon/cascade", json={"garments": _garments()})
    assert res.status_code == 400


def test_cascade_strict_mode_propagates_vton_error():
    p_vton, p_restore, p_tripo, p_opt = _patches()
    with p_vton as vton, p_restore, p_tripo as tripo, p_opt:
        vton.side_effect = HTTPException(status_code=502, detail="GPU error")
        res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": _garments(), "allow_fallback": False})
        assert res.status_code == 502
        assert "GPU error" in res.json()["detail"]
        tripo.assert_not_called()


def test_cascade_fallback_all_steps_fail_returns_502_without_3d():
    p_vton, p_restore, p_tripo, p_opt = _patches()
    with p_vton as vton, p_restore, p_tripo as tripo, p_opt:
        vton.side_effect = HTTPException(status_code=502, detail="boom")
        res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": _garments(), "allow_fallback": True})
        assert res.status_code == 502
        tripo.assert_not_called()


def test_cascade_fallback_partial_applies_remaining_garments():
    p_vton, p_restore, p_tripo, p_opt = _patches()
    with p_vton as vton, p_restore as restore, p_tripo as tripo, p_opt as opt:
        vton.side_effect = [HTTPException(status_code=502, detail="x"), "https://m.com/s2.png", "https://m.com/s3.png"]
        restore.return_value = "https://m.com/hd.png"
        tripo.return_value = "https://m.com/raw.glb"
        opt.return_value = OPT_URL
        res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": _garments(), "allow_fallback": True})
        assert res.status_code == 200
        assert res.json()["total_garments_applied"] == 2


def test_cascade_tripo_failure_propagates():
    p_vton, p_restore, p_tripo, p_opt = _patches()
    with p_vton as vton, p_restore as restore, p_tripo as tripo, p_opt:
        vton.return_value = "https://m.com/s.png"
        restore.return_value = "https://m.com/hd.png"
        tripo.side_effect = HTTPException(status_code=503, detail="Tripo caído")
        res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": _garments()[:1]})
        assert res.status_code == 503
        assert "Tripo" in res.json()["detail"]


def test_cascade_optimizer_failure_keeps_raw_glb():
    p_vton, p_restore, p_tripo, p_opt = _patches()
    with p_vton as vton, p_restore as restore, p_tripo as tripo, p_opt as opt:
        vton.return_value = "https://m.com/s.png"
        restore.return_value = "https://m.com/hd.png"
        tripo.return_value = "https://m.com/raw.glb"
        opt.side_effect = RuntimeError("gltf-transform no disponible")
        res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": _garments()[:1]})
        assert res.status_code == 200
        assert res.json()["model_3d_url"] == "https://m.com/raw.glb"


def test_cascade_restore_failure_keeps_vton_image():
    p_vton, p_restore, p_tripo, p_opt = _patches()
    with p_vton as vton, p_restore as restore, p_tripo as tripo, p_opt as opt:
        vton.return_value = "https://m.com/s.png"
        restore.side_effect = RuntimeError("codeformer down")
        tripo.return_value = "https://m.com/raw.glb"
        opt.return_value = OPT_URL
        res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": _garments()[:1]})
        assert res.status_code == 200
        tripo.assert_called_once_with(image_url="https://m.com/s.png")


# ---------------------------------------------------------------- /cascade/start + status
def test_cascade_async_flow_completes_and_unknown_task_404():
    p_vton, p_restore, p_tripo, p_opt = _patches()
    with p_vton as vton, p_restore as restore, p_tripo as tripo, p_opt as opt:
        vton.return_value = "https://m.com/s.png"
        restore.return_value = "https://m.com/hd.png"
        tripo.return_value = "https://m.com/raw.glb"
        opt.return_value = OPT_URL

        start = client.post("/api/tryon/cascade/start", json={"human_image": HUMAN, "garments": _garments()[:1]})
        assert start.status_code == 200
        task_id = start.json()["task_id"]

        final = None
        for _ in range(50):
            final = client.get(f"/api/tryon/cascade/status/{task_id}").json()
            if final["status"] in ("completed", "failed"):
                break
            time.sleep(0.1)
        assert final["status"] == "completed", final
        assert final["model_3d_url"] == OPT_URL

    assert client.get("/api/tryon/cascade/status/no-existe").status_code == 404


def test_cascade_start_validates_before_queueing():
    assert client.post("/api/tryon/cascade/start", json={"human_image": HUMAN, "garments": []}).status_code == 400


# ---------------------------------------------------------------- regresiones de bugs corregidos
# Con allow_fallback=True un paso fallido NO debe marcar la tarea como 'failed' (el cliente abortaría).
@pytest.mark.anyio
async def test_cascade_fallback_does_not_mark_task_failed_midway():
    tid = "t-" + uuid.uuid4().hex[:6]
    tryon_api._async_tasks[tid] = {"task_id": tid, "status": "processing", "created_at": time.time()}
    seen = {}

    async def vton(**kwargs):
        if "Trousers" == kwargs["garment_description"]:
            raise HTTPException(status_code=502, detail="x")
        seen["status_after_failure"] = tryon_api._async_tasks[tid]["status"]
        return "https://m.com/s.png"

    payload = tryon_api.CascadeTryOnRequest(human_image=HUMAN, garments=_garments(), allow_fallback=True)
    with patch("app.api.tryon.generate_vton", side_effect=vton), \
         patch("app.api.tryon.restore_image_quality", new_callable=AsyncMock, return_value="https://m.com/hd.png"), \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock, return_value="https://m.com/raw.glb"), \
         patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock, return_value=OPT_URL):
        await tryon_api._execute_waterfall_cascade(payload, "http://testserver", task_id=tid)
    tryon_api._async_tasks.pop(tid, None)
    assert seen["status_after_failure"] != "failed"


def test_cascade_only_shoes_returns_400():
    garments = [{"image": "https://example.com/shoes.png", "category": "shoes", "name": "Sneakers"}]
    res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": garments})
    assert res.status_code == 400


# Calzado y accesorios no se envían a IDM-VTON como si fueran una camiseta.
def test_cascade_skips_shoes_and_accessories():
    p_vton, p_restore, p_tripo, p_opt = _patches()
    garments = [
        {"image": "https://example.com/tee.png", "category": "upper_body", "name": "Tee"},
        {"image": "https://example.com/shoes.png", "category": "shoes", "name": "Sneakers"},
    ]
    with p_vton as vton, p_restore as restore, p_tripo as tripo, p_opt as opt:
        vton.return_value = "https://m.com/s.png"
        restore.return_value = "https://m.com/hd.png"
        tripo.return_value = "https://m.com/raw.glb"
        opt.return_value = OPT_URL
        res = client.post("/api/tryon/cascade", json={"human_image": HUMAN, "garments": garments})
        assert res.status_code == 200
        assert vton.call_count == 1


# ---------------------------------------------------------------- PUT /api/users/colorimetry
@pytest.fixture
def color_user():
    email = f"color_{uuid.uuid4().hex[:8]}@vitra.ai"
    users_db[email] = {"email": email, "name": "Color Test", "gender": "female"}
    save_users_db()
    yield email
    users_db.pop(email, None)
    save_users_db()


def _auth(email):
    return {"Authorization": f"Bearer {create_access_token({'sub': email, 'email': email})}"}


PROFILE = {
    "season": "Otoño Cálido",
    "skin_tone": "#C68642 (cálido)",
    "recommended_colors": ["#8B4513", "#556B2F", "#CD853F", "#A0522D", "#DAA520", "#6B8E23"],
}


def test_color_update_requires_token():
    res = client.put("/api/users/colorimetry", json={"color_profile": PROFILE})
    assert res.status_code == 401


def test_color_update_unknown_user_404():
    res = client.put("/api/users/colorimetry", json={"color_profile": PROFILE}, headers=_auth("nadie@vitra.ai"))
    assert res.status_code == 404


def test_color_update_saves_precomputed_profile(color_user):
    res = client.put("/api/users/colorimetry", json={"color_profile": PROFILE}, headers=_auth(color_user))
    assert res.status_code == 200
    assert users_db[color_user]["color_profile"]["season"] == "Otoño Cálido"
    me = client.get("/api/auth/me", headers=_auth(color_user)).json()
    assert me["color_profile"]["season"] == "Otoño Cálido"


def test_color_update_requires_profile_or_image(color_user):
    res = client.put("/api/users/colorimetry", json={}, headers=_auth(color_user))
    assert res.status_code == 400


def test_color_update_analyzes_image_and_persists(color_user):
    analyzed = dict(PROFILE, is_valid_image=True)
    with patch("app.services.gemini_service.analyze_colorimetry", new_callable=AsyncMock) as mock_c:
        mock_c.return_value = analyzed
        res = client.put("/api/users/colorimetry", json={"face_image": "https://example.com/face.jpg"}, headers=_auth(color_user))
    assert res.status_code == 200
    assert users_db[color_user]["color_profile"]["season"] == "Otoño Cálido"


# ---------------------------------------------------------------- imagen inválida => 400 (antes devolvía un mock con 200)
@pytest.mark.anyio
async def test_invalid_base64_is_rejected_with_400():
    from app.services.gemini_service import _resolve_image_bytes
    with pytest.raises(HTTPException) as exc:
        await _resolve_image_bytes("@@@no-es-base64@@@")
    assert exc.value.status_code == 400


# ---------------------------------------------------------------- foto del usuario y prendas base
def test_photo_store_roundtrip_and_truncated_values(tmp_path, monkeypatch):
    from app.services import photo_store
    monkeypatch.setattr(photo_store, "PHOTOS_DIR", str(tmp_path))
    import base64
    uri = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff" + b"x" * 200).decode()
    ref = photo_store.save_photo(uri)
    assert ref.startswith("photo://")
    assert photo_store.load_photo(ref) == uri
    assert photo_store.load_photo("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...") is None
    assert photo_store.load_photo("photo://../../etc/passwd") is None


def test_cascade_uses_stored_user_photo_only_for_token_owner(tmp_path, monkeypatch, color_user):
    from app.services import photo_store
    import base64
    monkeypatch.setattr(photo_store, "PHOTOS_DIR", str(tmp_path))
    uri = "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff" + b"y" * 200).decode()
    users_db[color_user]["body_image"] = photo_store.save_photo(uri)

    p_vton, p_restore, p_tripo, p_opt = _patches()
    with p_vton as vton, p_restore as restore, p_tripo as tripo, p_opt as opt:
        vton.return_value = "https://m.com/s.png"
        restore.return_value = "https://m.com/hd.png"
        tripo.return_value = "https://m.com/raw.glb"
        opt.return_value = OPT_URL
        body = {"user_id": color_user, "garments": _garments()[:1]}

        # Sin token: el user_id enviado por el cliente se ignora (no se filtra la foto de otro usuario)
        res = client.post("/api/tryon/cascade", json=body)
        assert res.status_code == 400

        # Con token del dueño: se usa su foto real guardada
        res = client.post("/api/tryon/cascade", json=body, headers=_auth(color_user))
        assert res.status_code == 200
        assert vton.call_args.kwargs["human_image_url"] == uri


def test_base_garments_use_own_illustrations_not_unsplash():
    from app.api.users import get_default_base_garments
    items = get_default_base_garments("male", "http://testserver")
    assert all(i["imageUrl"].startswith("http://testserver/static/garments/") for i in items)
    assert client.get(items[0]["imageUrl"].replace("http://testserver", "")).status_code == 200
