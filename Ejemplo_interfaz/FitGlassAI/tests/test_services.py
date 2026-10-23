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


@pytest.mark.anyio
async def test_analyze_garment_gemini_error_returns_fallback_mock():
    mock_generate_content = AsyncMock(side_effect=Exception("503 UNAVAILABLE: Server high load"))
    mock_client = MagicMock()
    mock_client.aio.models.generate_content = mock_generate_content

    with patch.object(settings, "GEMINI_API_KEY", "dummy_key"):
        with patch("app.services.gemini_service.genai.Client", return_value=mock_client):
            result = await analyze_garment("data:image/jpeg;base64,dGVzdA==")
            assert result["tipo_prenda"] == "Prenda de prueba"
            assert result["color_dominante"] == "#000000"
            assert "mock de respaldo" in result["detalles"]


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
                "https://example.com/garment.jpg",
                garment_description="cotton t-shirt",
            )
            assert result == expected_url

            # Verificar que se inyectaron los modificadores para evitar acabados plásticos/brillosos
            called_input = mock_client.async_run.call_args[1]["input"]
            assert "matte fabric" in called_input["garment_des"]
            assert "cotton texture" in called_input["garment_des"]
            assert "soft studio lighting" in called_input["garment_des"]
            assert "shiny" in called_input["negative_prompt"]
            assert "glossy" in called_input["negative_prompt"]
            assert "plastic" in called_input["negative_prompt"]
            assert "latex" in called_input["negative_prompt"]



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


# -------------------------------------------------------------
# Pruebas unitarias: optimize_3d_model (Draco + WebP)
# -------------------------------------------------------------
from app.services.optimizer_service import optimize_3d_model

@pytest.mark.anyio
async def test_optimize_3d_model_empty():
    res = await optimize_3d_model("")
    assert res == ""


@pytest.mark.anyio
async def test_optimize_3d_model_fallback_on_download_error():
    mock_resp = MagicMock()
    mock_resp.status_code = 404

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__.return_value = mock_client

    with patch("app.services.optimizer_service.httpx.AsyncClient", return_value=mock_client):
        fallback = await optimize_3d_model("https://example.com/notfound.glb")
        assert fallback == "https://example.com/notfound.glb"


@pytest.mark.anyio
async def test_optimize_3d_model_fallback_on_cli_failure():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b"fake_glb_bytes"

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__.return_value = mock_client

    mock_proc = MagicMock()
    mock_proc.returncode = 1
    mock_proc.stderr = "npx failed"

    with patch("app.services.optimizer_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.services.optimizer_service.subprocess.run", return_value=mock_proc):
        fallback = await optimize_3d_model("https://example.com/model.glb")
        assert fallback == "https://example.com/model.glb"


@pytest.mark.anyio
async def test_optimize_3d_model_success():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b"fake_glb_bytes"

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__.return_value = mock_client

    def mock_run(cmd, *args, **kwargs):
        # Crear archivo simulado en output_path (índice 5 de cmd)
        out_path = cmd[5]
        with open(out_path, "wb") as f:
            f.write(b"optimized_draco_webp_bytes")
        proc = MagicMock()
        proc.returncode = 0
        proc.stderr = ""
        proc.stdout = "info: success"
        return proc

    with patch("app.services.optimizer_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.services.optimizer_service.subprocess.run", side_effect=mock_run):
        res = await optimize_3d_model("https://example.com/model.glb", base_url="http://testserver:8000")
        assert "http://testserver:8000/static/models/model_" in res
        assert res.endswith("_opt.glb")

