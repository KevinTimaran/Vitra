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
        # Verificar explícitamente que Tripo3D fue invocado ÚNICAMENTE con la imagen de la prenda aislada, NO con el avatar/persona
        mock_3d_fn.assert_called_once_with(image_url="https://example.com/jacket.jpg")


def test_tryon_multi_garment_pipeline_invokes_tripo_once():
    """
    Verifica que en un look multi-prenda (top + pants + shoes),
    VTON se invoque para cada prenda aplicable y Tripo3D se invoque EXACTAMENTE UNA VEZ
    para el look completado.
    """
    mock_2d_1 = "https://mock-replicate.delivery/vton_step1.png"
    mock_2d_2 = "https://mock-replicate.delivery/vton_step2.png"
    mock_3d = "https://mock-tripo3d.ai/look_mesh.glb"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_3d_fn, \
         patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock) as mock_opt:

        mock_vton.side_effect = [mock_2d_1, mock_2d_2]
        mock_3d_fn.return_value = mock_3d
        mock_opt.return_value = "http://testserver/static/models/multi_outfit_opt.glb"

        payload = {
            "human_image": "https://example.com/human_avatar.jpg",
            "garments": [
                {
                    "image": "https://example.com/tshirt.png",
                    "category": "upper_body",
                    "name": "White Linen T-Shirt"
                },
                {
                    "image": "https://example.com/trousers.png",
                    "category": "lower_body",
                    "name": "Pleated Trousers"
                }
            ],
            "allow_fallback": True
        }

        # 1. Probar endpoint síncrono
        sync_res = client.post("/api/tryon/generate", json=payload)
        assert sync_res.status_code == 200
        sync_data = sync_res.json()
        assert sync_data["status"] == "completed"
        assert sync_data["model_3d_url"] == "http://testserver/static/models/multi_outfit_opt.glb"
        assert sync_data["image_2d_url"] == mock_2d_2

        # VTON debe haberse llamado dos veces (una por prenda)
        assert mock_vton.call_count == 2
        # Tripo3D debe haberse llamado EXACTAMENTE UNA VEZ para todo el look con el resultado fusionado
        assert mock_3d_fn.call_count == 1
        mock_3d_fn.assert_called_once_with(image_url=mock_2d_2)

