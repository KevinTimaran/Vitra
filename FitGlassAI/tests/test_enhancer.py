import asyncio
import time
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from replicate.exceptions import ReplicateError
from fastapi.testclient import TestClient

from app.config import settings
from app.services.replicate_service import restore_image_quality, REPLICATE_CODEFORMER_MODEL
from app.main import app

client = TestClient(app)


# -------------------------------------------------------------------------
# Test: Éxito en restore_image_quality (Upscale x2, Face Upsample, Background Enhance)
# -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_restore_image_quality_success():
    sample_input_url = "https://example.com/input_face.png"
    expected_hd_url = "https://replicate.delivery/pbxt/codeformer_hd_result.png"

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value=[expected_hd_url])

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)

            # Debe retornar la URL en alta definición devuelta por CodeFormer
            assert result == expected_hd_url

            # Verificar que los parámetros requeridos fueron enviados con precisión
            assert mock_client.async_run.call_count == 1
            call_args = mock_client.async_run.call_args
            model_arg = call_args[0][0]
            input_payload = call_args[1]["input"]

            assert model_arg == REPLICATE_CODEFORMER_MODEL
            assert input_payload["upscale"] == 2
            assert input_payload["face_upsample"] is True
            assert input_payload["background_enhance"] is True
            assert input_payload["codeformer_fidelity"] == 0.7
            assert input_payload["image"] == sample_input_url


@pytest.mark.anyio
async def test_restore_image_quality_success_single_string_output():
    """Verifica que maneje respuestas que son directamente un string URL."""
    sample_input_url = "https://example.com/face.jpg"
    expected_hd_url = "https://replicate.delivery/pbxt/direct_string_result.png"

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value=expected_hd_url)

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            assert result == expected_hd_url


@pytest.mark.anyio
async def test_restore_image_quality_success_file_output_object():
    """Verifica que maneje respuestas que contienen un objeto FileOutput con propiedad .url."""
    sample_input_url = "https://example.com/face.jpg"
    expected_hd_url = "https://replicate.delivery/pbxt/fileoutput_result.png"

    class MockFileOutput:
        def __init__(self, url: str):
            self.url = url

        def __str__(self):
            return self.url

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value=MockFileOutput(expected_hd_url))

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            assert result == expected_hd_url


@pytest.mark.anyio
async def test_restore_image_quality_iterable_file_output_keeps_url():
    """Regresión: el FileOutput real es iterable y entrega bytes; se debe usar .url, no iterarlo."""
    expected_hd_url = "https://replicate.delivery/pbxt/real_fileoutput.png"

    class IterableFileOutput:
        url = expected_hd_url

        def __iter__(self):
            yield b"\x89PNG\r\n\x1a\n" + b"0" * 50

        def __str__(self):
            return self.url

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value=IterableFileOutput())

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality("https://example.com/face.jpg")
            assert result == expected_hd_url


@pytest.mark.anyio
async def test_restore_image_quality_success_generator_output():
    """Verifica que maneje respuestas que retornan un generador/iterador."""
    sample_input_url = "https://example.com/face.jpg"
    expected_hd_url = "https://replicate.delivery/pbxt/generator_result.png"

    def mock_generator():
        yield expected_hd_url

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value=mock_generator())

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            assert result == expected_hd_url


@pytest.mark.anyio
async def test_restore_image_quality_success_async_generator_output():
    """Verifica que maneje respuestas que retornan un async generator o stream."""
    sample_input_url = "https://example.com/face.jpg"
    expected_hd_url = "https://replicate.delivery/pbxt/async_gen_result.png"

    async def mock_async_generator():
        yield expected_hd_url

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value=mock_async_generator())

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            assert result == expected_hd_url


@pytest.mark.anyio
async def test_restore_image_quality_success_dict_output():
    """Verifica que maneje respuestas que son un diccionario con clave 'image' o 'url'."""
    sample_input_url = "https://example.com/face.jpg"
    expected_hd_url = "https://replicate.delivery/pbxt/dict_result.png"

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value={"image": expected_hd_url})

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            assert result == expected_hd_url


# -------------------------------------------------------------------------
# Test CRÍTICO DE SEGURIDAD: Fallback resiliente ante excepciones y caídas
# -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_restore_image_quality_fallback_on_replicate_error():
    """Garantiza que ante ReplicateError retorne la URL original sin lanzar excepción."""
    sample_input_url = "https://example.com/unenhanced.png"

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(side_effect=ReplicateError("CUDA out of memory error"))

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            # El fallback debe retornar la URL original
            assert result == sample_input_url


@pytest.mark.anyio
async def test_restore_image_quality_fallback_on_timeout():
    """Garantiza que ante TimeoutError retorne la URL original sin romper el pipeline."""
    sample_input_url = "https://example.com/timeout_case.png"

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(side_effect=asyncio.TimeoutError())

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            assert result == sample_input_url


@pytest.mark.anyio
async def test_restore_image_quality_fallback_on_generic_exception():
    """Garantiza que ante cualquier fallo inesperado de red o cliente retorne la URL original."""
    sample_input_url = "https://example.com/generic_error.png"

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(side_effect=RuntimeError("Connection reset by peer"))

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            assert result == sample_input_url


# -------------------------------------------------------------------------
# Test: Fallback ante salidas nulas o vacías
# -------------------------------------------------------------------------
@pytest.mark.anyio
@pytest.mark.parametrize("empty_output", [None, [], "", "None", "null", "undefined", "   ", [""]])
async def test_restore_image_quality_fallback_on_null_or_empty_output(empty_output):
    sample_input_url = "https://example.com/original_face.png"

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value=empty_output)

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            assert result == sample_input_url


@pytest.mark.anyio
@pytest.mark.parametrize("garbage_output", [
    "CUDA error: out of memory",
    "500 Internal Server Error",
    "{'error': 'service unavailable'}",
    "<generator object <genexpr> at 0x12345>",
    "invalid_url_string"
])
async def test_restore_image_quality_fallback_on_non_url_string(garbage_output):
    """Garantiza que si el output es una cadena de error o no es una URL, caiga en fallback seguro."""
    sample_input_url = "https://example.com/face_safe.png"

    mock_client = MagicMock()
    mock_client.async_run = AsyncMock(return_value=garbage_output)

    with patch.object(settings, "REPLICATE_API_TOKEN", "dummy_token"):
        with patch("app.services.replicate_service.replicate.Client", return_value=mock_client):
            result = await restore_image_quality(sample_input_url)
            assert result == sample_input_url


# -------------------------------------------------------------------------
# Test: Comportamiento ante falta de API token o inputs inválidos
# -------------------------------------------------------------------------
@pytest.mark.anyio
async def test_restore_image_quality_missing_token_returns_original():
    sample_input_url = "https://example.com/no_token.png"
    with patch.object(settings, "REPLICATE_API_TOKEN", ""):
        result = await restore_image_quality(sample_input_url)
        assert result == sample_input_url


@pytest.mark.anyio
@pytest.mark.parametrize("invalid_input", ["", "   ", None])
async def test_restore_image_quality_invalid_input(invalid_input):
    result = await restore_image_quality(invalid_input)
    assert result == invalid_input


# -------------------------------------------------------------------------
# Test: Integración con la Cascada Waterfall (/api/tryon/cascade)
# -------------------------------------------------------------------------
def test_cascade_pipeline_executes_codeformer_before_tripo3d():
    """
    Verifica que la cascada 2D a 3D llame a CodeFormer (restore_image_quality)
    entre VTON y Tripo3D, y entregue la URL restaurada a Tripo3D.
    """
    mock_vton_url = "https://replicate.delivery/pbxt/fused_canvas_2d.png"
    mock_hd_restored_url = "https://replicate.delivery/pbxt/codeformer_face_restored_hd.png"
    mock_tripo_3d_url = "https://openapi.cdn.tripo3d.ai/model_tripo.glb"
    mock_opt_url = "http://testserver/static/models/model_cascade_opt.glb"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.restore_image_quality", new_callable=AsyncMock) as mock_restore, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_tripo, \
         patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock) as mock_opt:

        mock_vton.return_value = mock_vton_url
        mock_restore.return_value = mock_hd_restored_url
        mock_tripo.return_value = mock_tripo_3d_url
        mock_opt.return_value = mock_opt_url

        payload = {
            "human_image": "https://example.com/user_a_pose.jpg",
            "garments": [
                {
                    "name": "Elegance Blazer",
                    "category": "upper_body",
                    "image": "https://example.com/blazer.png"
                }
            ],
            "allow_fallback": False
        }

        response = client.post("/api/tryon/cascade", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        # La imagen final 2D entregada debe ser la versión HD restaurada
        assert data["final_dressed_image_url"] == mock_hd_restored_url
        assert data["model_3d_url"] == mock_opt_url

        # Verificar orden y argumentos de llamada
        mock_vton.assert_called_once()
        mock_restore.assert_called_once_with(mock_vton_url)
        # Tripo3D debió recibir la imagen HD restaurada por CodeFormer
        mock_tripo.assert_called_once_with(image_url=mock_hd_restored_url)


def test_cascade_pipeline_resilience_when_codeformer_fails():
    """
    Verifica que si CodeFormer falla y devuelve el fallback original,
    el pipeline de Cascada continúa sin interrupción enviando la imagen original a Tripo3D.
    """
    mock_vton_url = "https://replicate.delivery/pbxt/fused_canvas_2d.png"
    # Simula el comportamiento fallback de restore_image_quality (retorna la misma URL original)
    mock_tripo_3d_url = "https://openapi.cdn.tripo3d.ai/model_tripo.glb"
    mock_opt_url = "http://testserver/static/models/model_fallback_opt.glb"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.restore_image_quality", new_callable=AsyncMock) as mock_restore, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_tripo, \
         patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock) as mock_opt:

        mock_vton.return_value = mock_vton_url
        # Simula retorno de fallback
        mock_restore.return_value = mock_vton_url
        mock_tripo.return_value = mock_tripo_3d_url
        mock_opt.return_value = mock_opt_url

        payload = {
            "human_image": "https://example.com/user_a_pose.jpg",
            "garments": [
                {
                    "name": "Casual Tee",
                    "category": "upper_body",
                    "image": "https://example.com/tee.png"
                }
            ],
            "allow_fallback": False
        }

        response = client.post("/api/tryon/cascade", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        assert data["final_dressed_image_url"] == mock_vton_url
        mock_tripo.assert_called_once_with(image_url=mock_vton_url)


def test_cascade_pipeline_resilience_when_restore_raises_unexpected_exception():
    """
    Verifica que si restore_image_quality arroja una excepción no capturada,
    el pipeline de Cascada la captura y continúa usando el lienzo VTON original.
    """
    mock_vton_url = "https://replicate.delivery/pbxt/fused_canvas_2d.png"
    mock_tripo_3d_url = "https://openapi.cdn.tripo3d.ai/model_tripo.glb"
    mock_opt_url = "http://testserver/static/models/model_resilience_opt.glb"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.restore_image_quality", new_callable=AsyncMock) as mock_restore, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_tripo, \
         patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock) as mock_opt:

        mock_vton.return_value = mock_vton_url
        mock_restore.side_effect = RuntimeError("Fatal unhandled service crash")
        mock_tripo.return_value = mock_tripo_3d_url
        mock_opt.return_value = mock_opt_url

        payload = {
            "human_image": "https://example.com/user_a_pose.jpg",
            "garments": [
                {
                    "name": "Polo Shirt",
                    "category": "upper_body",
                    "image": "https://example.com/polo.png"
                }
            ],
            "allow_fallback": False
        }

        response = client.post("/api/tryon/cascade", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        assert data["final_dressed_image_url"] == mock_vton_url
        mock_tripo.assert_called_once_with(image_url=mock_vton_url)


def test_cascade_pipeline_logs_trace():
    """
    Verifica que se emitan los logs específicos y numerados requeridos:
    - [Step 1/3] VTON completed. Original URL: ...
    - [Step 2/3] Executing CodeFormer restoration...
    - [Step 3/3] CodeFormer completed. HD URL: ... Sending to Tripo3D.
    """
    mock_vton_url = "https://replicate.delivery/pbxt/fused_2d.png"
    mock_hd_url = "https://replicate.delivery/pbxt/codeformer_hd.png"
    mock_tripo_url = "https://openapi.cdn.tripo3d.ai/mesh.glb"
    mock_opt_url = "http://testserver/static/models/opt.glb"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.restore_image_quality", new_callable=AsyncMock) as mock_restore, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_tripo, \
         patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock) as mock_opt, \
         patch("app.api.tryon.logger.info") as mock_logger:

        mock_vton.return_value = mock_vton_url
        mock_restore.return_value = mock_hd_url
        mock_tripo.return_value = mock_tripo_url
        mock_opt.return_value = mock_opt_url

        payload = {
            "human_image": "https://example.com/human.jpg",
            "garments": [
                {"name": "Denim Jacket", "category": "upper_body", "image": "https://example.com/denim.png"}
            ],
            "allow_fallback": False
        }

        response = client.post("/api/tryon/cascade", json=payload)
        assert response.status_code == 200

        logged_messages = [call.args[0] for call in mock_logger.call_args_list if call.args]
        assert any("[Step 1/3] VTON completed. Original URL:" in msg for msg in logged_messages)
        assert any("[Step 2/3] Executing CodeFormer restoration..." in msg for msg in logged_messages)
        assert any("[Step 3/3] CodeFormer completed. HD URL:" in msg and "Sending to Tripo3D." in msg for msg in logged_messages)


def test_async_cascade_pipeline_with_codeformer():
    """
    Verifica que la ejecución asíncrona (/cascade/start -> /cascade/status/{task_id})
    integre CodeFormer en segundo plano y complete con la URL restaurada.
    """
    mock_vton_url = "https://replicate.delivery/pbxt/async_vton.png"
    mock_hd_url = "https://replicate.delivery/pbxt/async_hd.png"
    mock_tripo_url = "https://openapi.cdn.tripo3d.ai/async_mesh.glb"
    mock_opt_url = "http://testserver/static/models/async_opt.glb"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.restore_image_quality", new_callable=AsyncMock) as mock_restore, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_tripo, \
         patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock) as mock_opt:

        mock_vton.return_value = mock_vton_url
        mock_restore.return_value = mock_hd_url
        mock_tripo.return_value = mock_tripo_url
        mock_opt.return_value = mock_opt_url

        payload = {
            "human_image": "https://example.com/async_human.jpg",
            "garments": [
                {"name": "Silk Dress", "category": "dresses", "image": "https://example.com/dress.png"}
            ],
            "allow_fallback": False
        }

        # 1. Iniciar tarea asíncrona de cascada
        start_res = client.post("/api/tryon/cascade/start", json=payload)
        assert start_res.status_code == 200
        task_id = start_res.json()["task_id"]

        # 2. Polling hasta completar
        completed = False
        for _ in range(30):
            status_res = client.get(f"/api/tryon/cascade/status/{task_id}")
            assert status_res.status_code == 200
            data = status_res.json()
            if data.get("status") == "completed":
                completed = True
                assert data["image_2d_url"] == mock_hd_url
                assert data["model_3d_url"] == mock_opt_url
                break
            time.sleep(0.05)

        assert completed is True
        mock_restore.assert_called_once_with(mock_vton_url)
        mock_tripo.assert_called_once_with(image_url=mock_hd_url)
