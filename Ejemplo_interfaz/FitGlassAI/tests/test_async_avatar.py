import time
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_avatar_latest_endpoint():
    """Verifica que /api/avatar/latest retorne el último modelo generado."""
    response = client.get("/api/avatar/latest")
    assert response.status_code == 200
    data = response.json()
    assert "avatar_url" in data
    assert data["avatar_url"].endswith(".glb")
    assert "size_bytes" in data
    assert data["size_bytes"] > 100_000


def test_avatar_async_pipeline_success():
    """
    Verifica el flujo asíncrono completo (/start -> /status/{task_id})
    con Tripo3D mockeado (cero consumo de créditos).
    """
    mock_glb = "https://mock-tripo3d.ai/avatar_mesh.glb"

    with patch("app.api.avatar.generate_3d_model", new_callable=AsyncMock) as mock_tripo, \
         patch("app.api.avatar.optimize_3d_model", new_callable=AsyncMock) as mock_opt:

        mock_tripo.return_value = mock_glb
        mock_opt.return_value = "http://testserver/static/models/avatar_opt.glb"

        payload = {
            "image": "https://example.com/user_fullbody.jpg"
        }

        # 1. Iniciar tarea asíncrona
        start_res = client.post("/api/avatar/start", json=payload)
        assert start_res.status_code == 200
        start_data = start_res.json()
        assert "task_id" in start_data
        assert start_data["status"] == "processing"
        task_id = start_data["task_id"]

        # 2. Polling del estado hasta que complete
        completed = False
        for _ in range(25):
            status_res = client.get(f"/api/avatar/status/{task_id}")
            assert status_res.status_code == 200
            status_data = status_res.json()
            if status_data.get("status") == "completed":
                completed = True
                assert status_data["avatar_url"] == "http://testserver/static/models/avatar_opt.glb"
                break
            time.sleep(0.1)

        assert completed is True, "La tarea asíncrona de avatar debió completarse con éxito"
        mock_tripo.assert_called_once_with("https://example.com/user_fullbody.jpg")


def test_avatar_async_pipeline_failure():
    """Verifica el reporte de error cuando Tripo3D falla."""
    with patch("app.api.avatar.generate_3d_model", new_callable=AsyncMock) as mock_tripo:
        mock_tripo.side_effect = Exception("Fallo de conexión simulado con Tripo3D")

        payload = {
            "image": "https://example.com/user_fullbody.jpg"
        }

        start_res = client.post("/api/avatar/start", json=payload)
        assert start_res.status_code == 200
        task_id = start_res.json()["task_id"]

        failed = False
        for _ in range(25):
            status_res = client.get(f"/api/avatar/status/{task_id}")
            assert status_res.status_code == 200
            status_data = status_res.json()
            if status_data.get("status") == "failed":
                failed = True
                assert "Fallo de conexión simulado" in status_data["error"]
                break
            time.sleep(0.1)

        assert failed is True, "La tarea debió reportar status failed"
