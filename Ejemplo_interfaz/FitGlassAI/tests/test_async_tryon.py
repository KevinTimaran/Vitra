import time
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_tryon_latest_endpoint():
    """Verifica que el endpoint /api/tryon/latest retorne el último modelo generado."""
    response = client.get("/api/tryon/latest")
    assert response.status_code == 200
    data = response.json()
    assert "model_3d_url" in data
    assert data["model_3d_url"].endswith(".glb")
    assert "size_bytes" in data
    assert data["size_bytes"] > 100_000


def test_tryon_async_pipeline_without_tripo():
    """
    Verifica el flujo asíncrono completo (/start -> /status/{task_id})
    SIMULANDO las respuestas de VTON y Tripo3D (cero llamadas a la red real de Tripo).
    """
    mock_2d = "https://mock-replicate.delivery/vton_result.png"
    mock_3d = "https://mock-tripo3d.ai/mesh.glb"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_3d_fn, \
         patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock) as mock_opt:

        mock_vton.return_value = mock_2d
        mock_3d_fn.return_value = mock_3d
        mock_opt.return_value = "http://testserver/static/models/test_jacket_opt.glb"

        payload = {
            "human_image": "https://example.com/avatar.jpg",
            "garment_image": "https://example.com/jacket.jpg",
            "category": "upper_body",
            "garment_description": "leather jacket"
        }

        # 1. Iniciar tarea asíncrona
        start_res = client.post("/api/tryon/start", json=payload)
        assert start_res.status_code == 200
        start_data = start_res.json()
        assert "task_id" in start_data
        assert start_data["status"] == "processing"
        task_id = start_data["task_id"]

        # 2. Sondeo del estado (polling) hasta que complete
        completed = False
        for _ in range(20):
            status_res = client.get(f"/api/tryon/status/{task_id}")
            assert status_res.status_code == 200
            status_data = status_res.json()
            if status_data.get("status") == "completed":
                completed = True
                assert status_data["model_3d_url"] == "http://testserver/static/models/test_jacket_opt.glb"
                assert status_data["image_2d_url"] == mock_2d
                break
            time.sleep(0.1)

        assert completed is True, "La tarea asíncrona debió completarse con éxito"
