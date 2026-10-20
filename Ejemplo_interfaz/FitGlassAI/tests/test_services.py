import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException

from app.config import settings
from app.services.gemini_service import analyze_garment
from app.services.replicate_service import generate_vton
from app.services.tripo_service import generate_3d_model


# ---------------------------------------------------------
# Pruebas: Gemini Service
# ---------------------------------------------------------
@pytest.mark.anyio
async def test_analyze_garment_missing_api_key():
    with patch.object(settings, "GEMINI_API_KEY", ""):
        with pytest.raises(HTTPException) as exc_info:
            await analyze_garment("data:image/jpeg;base64,1234")
        assert exc_info.value.status_code == 500
        assert "GEMINI_API_KEY" in exc_info.value.detail


@pytest.mark.anyio
async def test_analyze_garment_empty_input():
    with patch.object(settings, "GEMINI_API_KEY", "dummy_key"):
        with pytest.raises(HTTPException) as exc_info:
            await analyze_garment("   ")
        assert exc_info.value.status_code == 400


@pytest.mark.anyio
async def test_analyze_garment_success():
    mock_json_response = {
        "tipo_prenda": "Camiseta",
        "color_dominante": "#FFFFFF",
        "colores_secundarios": ["#000000"],
        "estilo_recomendado": "Casual",
        "corte": "Regular",
        "ocasion_recomendada": "Diario",
        "detalles": "Camiseta blanca de algodón"
    }

    mock_generate_content = AsyncMock()
    mock_response = MagicMock()
    mock_response.text = '{"tipo_prenda": "Camiseta", "color_dominante": "#FFFFFF", "colores_secundarios": ["#000000"], "estilo_recomendado": "Casual", "corte": "Regular", "ocasion_recomendada": "Diario", "detalles": "Camiseta blanca de algodón"}'
    mock_generate_content.return_value = mock_response

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = mock_generate_content

    with patch.object(settings, "GEMINI_API_KEY", "dummy_key"):
        with patch("app.services.gemini_service.genai.Client", return_value=mock_client):
            result = await analyze_garment("data:image/jpeg;base64,dGVzdA==")
            assert result["tipo_prenda"] == "Camiseta"
            assert result["color_dominante"] == "#FFFFFF"
            assert result["estilo_recomendado"] == "Casual"


# ---------------------------------------------------------
# Pruebas: Replicate Service
# ---------------------------------------------------------
@pytest.mark.anyio
async def test_generate_vton_missing_api_token():
    with patch.object(settings, "REPLICATE_API_TOKEN", ""):
        with pytest.raises(HTTPException) as exc_info:
            await generate_vton("https://example.com/human.jpg", "https://example.com/garment.jpg")
        assert exc_info.value.status_code == 500
        assert "REPLICATE_API_TOKEN" in exc_info.value.detail


@pytest.mark.anyio
async def test_generate_vton_empty_urls():
    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with pytest.raises(HTTPException) as exc_info:
            await generate_vton("", "https://example.com/garment.jpg")
        assert exc_info.value.status_code == 400


@pytest.mark.anyio
async def test_generate_vton_success():
    expected_url = "https://replicate.delivery/pbxt/result_vton.png"

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value=[expected_url])

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await generate_vton(
                "https://example.com/human.jpg",
                "https://example.com/garment.jpg"
            )
            assert result == expected_url


# ---------------------------------------------------------
# Pruebas: Tripo3D Service
# ---------------------------------------------------------
@pytest.mark.anyio
async def test_generate_3d_model_missing_api_key():
    with patch.object(settings, "TRIPO_API_KEY", ""):
        with pytest.raises(HTTPException) as exc_info:
            await generate_3d_model("https://example.com/item.png")
        assert exc_info.value.status_code == 500
        assert "TRIPO_API_KEY" in exc_info.value.detail


@pytest.mark.anyio
async def test_generate_3d_model_success():
    expected_glb = "https://openapi.cdn.tripo3d.ai/output_model.glb"

    # Mock de httpx.AsyncClient para simular upload, task creation y polling
    mock_upload_resp = MagicMock()
    mock_upload_resp.status_code = 200
    mock_upload_resp.json.return_value = {
        "code": 0,
        "data": {"file_token": "token_123"}
    }

    mock_task_resp = MagicMock()
    mock_task_resp.status_code = 200
    mock_task_resp.json.return_value = {
        "code": 0,
        "data": {"task_id": "task_abc"}
    }

    mock_poll_resp = MagicMock()
    mock_poll_resp.status_code = 200
    mock_poll_resp.json.return_value = {
        "code": 0,
        "data": {
            "status": "success",
            "output": {"pbr_model": expected_glb}
        }
    }

    mock_img_download_resp = MagicMock()
    mock_img_download_resp.status_code = 200
    mock_img_download_resp.headers = {"content-type": "image/png"}
    mock_img_download_resp.content = b"fake_png_data"

    async def mock_post(url, *args, **kwargs):
        if "upload" in url:
            return mock_upload_resp
        return mock_task_resp

    async def mock_get(url, *args, **kwargs):
        if "task_abc" in url:
            return mock_poll_resp
        return mock_img_download_resp

    mock_http_client = AsyncMock()
    mock_http_client.post = AsyncMock(side_effect=mock_post)
    mock_http_client.get = AsyncMock(side_effect=mock_get)
    mock_http_client.__aenter__.return_value = mock_http_client

    with patch.object(settings, "TRIPO_API_KEY", "dummy_tripo_key"):
        with patch("app.services.tripo_service.httpx.AsyncClient", return_value=mock_http_client):
            result = await generate_3d_model("https://example.com/item.png", polling_interval=0.01)
            assert result == expected_glb


@pytest.mark.anyio
async def test_generate_3d_model_failed_task():
    mock_upload_resp = MagicMock()
    mock_upload_resp.status_code = 200
    mock_upload_resp.json.return_value = {"code": 0, "data": {"file_token": "token_123"}}

    mock_task_resp = MagicMock()
    mock_task_resp.status_code = 200
    mock_task_resp.json.return_value = {"code": 0, "data": {"task_id": "task_abc"}}

    mock_poll_resp = MagicMock()
    mock_poll_resp.status_code = 200
    mock_poll_resp.json.return_value = {
        "code": 0,
        "data": {
            "status": "failed",
            "message": "Mesh reconstruction error"
        }
    }

    mock_img_download_resp = MagicMock()
    mock_img_download_resp.status_code = 200
    mock_img_download_resp.headers = {"content-type": "image/png"}
    mock_img_download_resp.content = b"fake_png_data"

    async def mock_post(url, *args, **kwargs):
        if "upload" in url:
            return mock_upload_resp
        return mock_task_resp

    async def mock_get(url, *args, **kwargs):
        if "task_abc" in url:
            return mock_poll_resp
        return mock_img_download_resp

    mock_http_client = AsyncMock()
    mock_http_client.post = AsyncMock(side_effect=mock_post)
    mock_http_client.get = AsyncMock(side_effect=mock_get)
    mock_http_client.__aenter__.return_value = mock_http_client

    with patch.object(settings, "TRIPO_API_KEY", "dummy_tripo_key"):
        with patch("app.services.tripo_service.httpx.AsyncClient", return_value=mock_http_client):
            with pytest.raises(HTTPException) as exc_info:
                await generate_3d_model("https://example.com/item.png", polling_interval=0.01)
            assert exc_info.value.status_code == 502
            assert "Mesh reconstruction error" in exc_info.value.detail

