import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException

from app.config import settings
from app.services.openai_service import analyze_garment_openai, analyze_colorimetry_openai, analyze_garment_image_openai


@pytest.mark.anyio
async def test_openai_garment_missing_key():
    with patch.object(settings, "OPENAI_API_KEY", ""):
        with pytest.raises(HTTPException) as exc_info:
            await analyze_garment_openai("data:image/jpeg;base64,dGVzdA==")
        assert exc_info.value.status_code == 500


@pytest.mark.anyio
async def test_openai_garment_empty_input():
    with patch.object(settings, "OPENAI_API_KEY", "sk-dummy"):
        with pytest.raises(HTTPException) as exc_info:
            await analyze_garment_openai("   ")
        assert exc_info.value.status_code == 400


@pytest.mark.anyio
async def test_openai_garment_success():
    mock_payload = {
        "is_valid_image": True,
        "validation_error_message": None,
        "tipo_prenda": "Camisa Oxford",
        "color_dominante": "#0000FF",
        "colores_secundarios": ["#FFFFFF"],
        "estilo_recomendado": "Formal",
        "corte": "Slim",
        "ocasion_recomendada": "Trabajo",
        "detalles": "Camisa azul con botones blancos"
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [
            {"message": {"content": json.dumps(mock_payload)}}
        ]
    }

    with patch.object(settings, "OPENAI_API_KEY", "sk-dummy"):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
            res = await analyze_garment_openai("data:image/jpeg;base64,dGVzdA==")
            assert res["tipo_prenda"] == "Camisa Oxford"
            assert res["color_dominante"] == "#0000FF"
            assert res["is_valid_image"] is True


@pytest.mark.anyio
async def test_openai_colorimetry_success():
    mock_payload = {
        "is_valid_image": True,
        "validation_error_message": None,
        "skin_tone": "#A0673B (Trigueña cálida)",
        "hair_color": "#1A1110 (Castaño oscuro)",
        "eye_color": "#3B261C (Marrón café)",
        "season": "Invierno Brillante",
        "palette_name": "Paleta Fría Intensa",
        "description": "Alto contraste natural.",
        "recommended_colors": ["#1E3A8A", "#047857", "#B91C1C", "#7C3AED", "#0F172A", "#FFFFFF"],
        "colors_to_avoid": ["#D97706", "#84CC16", "#F59E0B"]
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [
            {"message": {"content": json.dumps(mock_payload)}}
        ]
    }

    with patch.object(settings, "OPENAI_API_KEY", "sk-dummy"):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
            res = await analyze_colorimetry_openai("data:image/jpeg;base64,dGVzdA==")
            assert res["season"] == "Invierno Brillante"
            assert len(res["recommended_colors"]) == 6
            assert res["is_valid_image"] is True


def test_openai_garment_image_missing_key():
    with patch.object(settings, "OPENAI_API_KEY", ""):
        with pytest.raises(ValueError) as exc_info:
            analyze_garment_image_openai(b"dummy_bytes", "image/jpeg")
        assert "OPENAI_API_KEY" in str(exc_info.value)


def test_openai_garment_image_empty_bytes():
    with patch.object(settings, "OPENAI_API_KEY", "sk-dummy"):
        with pytest.raises(ValueError) as exc_info:
            analyze_garment_image_openai(b"", "image/jpeg")
        assert "vacío" in str(exc_info.value)


def test_openai_garment_image_success():
    mock_payload = {
        "is_valid_image": True,
        "validation_error_message": None,
        "category": "Tops",
        "sleeve": "Short",
        "neck": "Crew",
        "fit": "Regular",
        "dominantColor": "#FFFFFF",
        "secondaryColors": ["#000000"],
        "pattern": "Solid",
        "hasPocket": False,
        "hasButtons": False,
        "hasZipper": False,
        "confidence": 0.95
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [
            {"message": {"content": json.dumps(mock_payload)}}
        ]
    }

    with patch.object(settings, "OPENAI_API_KEY", "sk-dummy"):
        with patch("httpx.Client.post", return_value=mock_resp):
            res = analyze_garment_image_openai(b"dummy_bytes", "image/jpeg")
            assert res.category == "Tops"
            assert res.dominantColor == "#FFFFFF"
            assert res.is_valid_image is True
