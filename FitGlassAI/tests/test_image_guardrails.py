import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import HTTPException

from app.main import app
from app.schemas.garment import GarmentMetadata, GarmentAnalysis
from app.schemas.colorimetry import ColorimetryData
from app.services.auth_service import create_access_token
from app.api.auth import users_db, save_users_db

client = TestClient(app)


# -------------------------------------------------------------
# 1. Tests for Pydantic Schemas with is_valid_image guardrails
# -------------------------------------------------------------
def test_garment_metadata_schema_valid():
    data = {
        "is_valid_image": True,
        "validation_error_message": None,
        "tipo_prenda": "Camiseta",
        "color_dominante": "#FFFFFF",
    }
    meta = GarmentMetadata(**data)
    assert meta.is_valid_image is True
    assert meta.validation_error_message is None
    assert meta.tipo_prenda == "Camiseta"


def test_garment_metadata_schema_invalid_empty_fields():
    data = {
        "is_valid_image": False,
        "validation_error_message": "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda.",
    }
    meta = GarmentMetadata(**data)
    assert meta.is_valid_image is False
    assert meta.validation_error_message == "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda."
    assert meta.tipo_prenda is None


def test_garment_analysis_schema_invalid_empty_fields():
    data = {
        "is_valid_image": False,
        "validation_error_message": "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda.",
    }
    analysis = GarmentAnalysis(**data)
    assert analysis.is_valid_image is False
    assert analysis.validation_error_message == "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda."


def test_colorimetry_data_schema_valid():
    data = {
        "is_valid_image": True,
        "validation_error_message": None,
        "skin_tone": "#F5D0C5",
        "hair_color": "#4A2E18",
        "season": "Invierno Brillante",
        "description": "Explicación estética",
        "recommended_colors": ["#1E3A8A"],
    }
    color = ColorimetryData(**data)
    assert color.is_valid_image is True
    assert color.validation_error_message is None
    assert color.season == "Invierno Brillante"


def test_colorimetry_data_schema_invalid_empty_fields():
    data = {
        "is_valid_image": False,
        "validation_error_message": "Esta imagen no parece ser de una persona. Por favor sube una foto tuya.",
    }
    color = ColorimetryData(**data)
    assert color.is_valid_image is False
    assert color.validation_error_message == "Esta imagen no parece ser de una persona. Por favor sube una foto tuya."
    assert color.skin_tone is None
    assert color.season is None


# -------------------------------------------------------------
# 2. Tests for API Route Enforcement: POST /api/garments/analyze
# -------------------------------------------------------------
def test_garment_analyze_json_rejected_invalid_image():
    mock_invalid_gemini_resp = {
        "is_valid_image": False,
        "validation_error_message": "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda.",
        "tipo_prenda": None,
        "color_dominante": None,
    }
    with patch("app.api.garments.analyze_garment", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = mock_invalid_gemini_resp
        response = client.post(
            "/api/garments/analyze",
            json={"image": "https://example.com/dog_photo.jpg"}
        )
        assert response.status_code == 400
        assert "No detectamos ropa en esta imagen" in response.json()["detail"]


def test_garment_analyze_multipart_rejected_invalid_image():
    mock_invalid_analysis = GarmentAnalysis(
        is_valid_image=False,
        validation_error_message="No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda."
    )
    with patch("app.api.garments.analyze_garment_image", return_value=mock_invalid_analysis):
        files = {"file": ("car.jpg", b"fake_car_bytes", "image/jpeg")}
        response = client.post("/api/garments/analyze", files=files)
        assert response.status_code == 400
        assert "No detectamos ropa en esta imagen" in response.json()["detail"]


def test_garment_analyze_json_accepted_valid_image():
    mock_valid_gemini_resp = {
        "is_valid_image": True,
        "validation_error_message": None,
        "tipo_prenda": "Chaqueta Denim",
        "color_dominante": "#1E3A8A",
        "colores_secundarios": ["#FFFFFF"],
        "estilo_recomendado": "Casual",
        "corte": "Regular",
        "ocasion_recomendada": "Diario",
        "detalles": "Mezclilla azul clásica",
    }
    with patch("app.api.garments.analyze_garment", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = mock_valid_gemini_resp
        response = client.post(
            "/api/garments/analyze",
            json={"image": "https://example.com/jacket.jpg"}
        )
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["success"] is True
        assert json_data["data"]["is_valid_image"] is True
        assert json_data["data"]["tipo_prenda"] == "Chaqueta Denim"


# -------------------------------------------------------------
# 3. Tests for API Route Enforcement: POST /api/colorimetry/analyze
# -------------------------------------------------------------
def test_colorimetry_analyze_rejected_invalid_image():
    mock_invalid_color = {
        "is_valid_image": False,
        "validation_error_message": "Esta imagen no parece ser de una persona. Por favor sube una foto tuya.",
    }
    with patch("app.api.colorimetry.analyze_colorimetry", new_callable=AsyncMock) as mock_service:
        mock_service.return_value = mock_invalid_color
        response = client.post(
            "/api/colorimetry/analyze",
            json={"image": "https://example.com/cat.jpg"}
        )
        assert response.status_code == 400
        assert "Esta imagen no parece ser de una persona" in response.json()["detail"]


def test_colorimetry_analyze_accepted_valid_image():
    mock_valid_color = {
        "is_valid_image": True,
        "validation_error_message": None,
        "skin_tone": "#F5D0C5",
        "hair_color": "#4A2E18",
        "season": "Verano Suave",
        "description": "Armonía fría moderada",
        "recommended_colors": ["#1E3A8A", "#047857"],
        "colors_to_avoid": ["#D97706"],
    }
    with patch("app.api.colorimetry.analyze_colorimetry", new_callable=AsyncMock) as mock_service:
        mock_service.return_value = mock_valid_color
        response = client.post(
            "/api/colorimetry/analyze",
            json={"image": "https://example.com/valid_human.jpg"}
        )
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["success"] is True
        assert json_data["data"]["is_valid_image"] is True
        assert json_data["data"]["season"] == "Verano Suave"


# -------------------------------------------------------------
# 4. Tests for API Route Enforcement: POST /api/users/profile/setup
# -------------------------------------------------------------
def test_user_profile_setup_rejected_invalid_face_aborts_tripo():
    mock_invalid_color = {
        "is_valid_image": False,
        "validation_error_message": "Esta imagen no parece ser de una persona. Por favor sube una foto tuya.",
    }
    with patch("app.services.gemini_service.analyze_colorimetry", new_callable=AsyncMock) as mock_c,          patch("app.api.users._execute_avatar_generation", new_callable=AsyncMock) as mock_tripo:
        mock_c.return_value = mock_invalid_color
        payload = {
            "full_name": "Guardrail User",
            "age": 25,
            "gender": "female",
            "face_image": "https://example.com/dog_face.jpg",
            "body_image": "https://example.com/dog_body.jpg",
        }
        response = client.post("/api/users/profile/setup", json=payload)
        assert response.status_code == 400
        assert "Esta imagen no parece ser de una persona" in response.json()["detail"]
        # CRUCIAL: Tripo3D NEVER called because pipeline was aborted immediately!
        mock_tripo.assert_not_called()


# -------------------------------------------------------------
# 5. Tests for API Route Enforcement: PUT /api/users/colorimetry
# -------------------------------------------------------------
def test_user_colorimetry_update_rejected_invalid_image():
    test_email = "color_guardrail_test@vitra.ai"
    users_db[test_email] = {
        "email": test_email,
        "name": "Guardrail Test",
        "gender": "female",
    }
    save_users_db()
    token = create_access_token({"sub": test_email, "email": test_email})

    mock_invalid_color = {
        "is_valid_image": False,
        "validation_error_message": "Esta imagen no parece ser de una persona. Por favor sube una foto tuya.",
    }

    try:
        with patch("app.services.gemini_service.analyze_colorimetry", new_callable=AsyncMock) as mock_c:
            mock_c.return_value = mock_invalid_color
            response = client.put(
                "/api/users/colorimetry",
                json={"image": "https://example.com/pizza.jpg"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert response.status_code == 400
            assert "Esta imagen no parece ser de una persona" in response.json()["detail"]
    finally:
        users_db.pop(test_email, None)
        save_users_db()


# -------------------------------------------------------------
# 6. Deep Verification Edge Cases & Bug Prevention Tests
# -------------------------------------------------------------
def test_user_profile_setup_rejected_invalid_body_only_aborts_tripo():
    """Si el usuario omite face_image pero suministra body_image no humana (ej. perro/coche),
    el guardrail debe abortar antes de invocar Tripo3D."""
    mock_invalid_color = {
        "is_valid_image": False,
        "validation_error_message": "Esta imagen no parece ser de una persona. Por favor sube una foto tuya.",
    }
    with patch("app.services.gemini_service.analyze_colorimetry", new_callable=AsyncMock) as mock_c, \
         patch("app.api.users._execute_avatar_generation", new_callable=AsyncMock) as mock_tripo:
        mock_c.return_value = mock_invalid_color
        payload = {
            "full_name": "Guardrail Body Only User",
            "age": 25,
            "gender": "female",
            "body_image": "https://example.com/dog_body.jpg",
        }
        response = client.post("/api/users/profile/setup", json=payload)
        assert response.status_code == 400
        assert "Esta imagen no parece ser de una persona" in response.json()["detail"]
        mock_tripo.assert_not_called()


def test_user_profile_setup_custom_rejection_message_aborts_tripo():
    """Garantiza que mensajes de rechazo que no contengan palabras clave específicas
    (ej. 'automóvil') NO sean silenciados por bloques except."""
    mock_invalid_color = {
        "is_valid_image": False,
        "validation_error_message": "Se detectó un automóvil en lugar de un usuario.",
    }
    with patch("app.services.gemini_service.analyze_colorimetry", new_callable=AsyncMock) as mock_c, \
         patch("app.api.users._execute_avatar_generation", new_callable=AsyncMock) as mock_tripo:
        mock_c.return_value = mock_invalid_color
        payload = {
            "full_name": "Guardrail Custom Message User",
            "age": 30,
            "gender": "male",
            "face_image": "https://example.com/car.jpg",
            "body_image": "https://example.com/car_full.jpg",
        }
        response = client.post("/api/users/profile/setup", json=payload)
        assert response.status_code == 400
        assert "Se detectó un automóvil en lugar de un usuario." in response.json()["detail"]
        mock_tripo.assert_not_called()


def test_garment_metadata_schema_string_false_coerced():
    """Garantiza que si Gemini devuelve 'false' como string, se interprete como rechazo."""
    data = {
        "is_valid_image": "false",
        "validation_error_message": "No se detectó ropa textil.",
    }
    meta = GarmentMetadata(**data)
    assert meta.is_valid_image is False
    assert meta.validation_error_message == "No se detectó ropa textil."


def test_colorimetry_data_schema_string_false_coerced():
    """Garantiza que si Gemini devuelve 'false' como string para colorimetría, se interprete como rechazo."""
    data = {
        "is_valid_image": "false",
        "validation_error_message": "Objeto no humano.",
    }
    color = ColorimetryData(**data)
    assert color.is_valid_image is False
    assert color.validation_error_message == "Objeto no humano."


def test_garment_analyze_rejection_missing_validation_message_has_fallback():
    """Si Gemini devuelve is_valid_image=False con validation_error_message nulo, debe retornar mensaje por defecto amigable."""
    mock_invalid_gemini_resp = {
        "is_valid_image": False,
        "validation_error_message": None,
    }
    with patch("app.api.garments.analyze_garment", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = mock_invalid_gemini_resp
        response = client.post(
            "/api/garments/analyze",
            json={"image": "https://example.com/blurred_something.jpg"}
        )
        assert response.status_code == 400
        assert "No detectamos ropa en esta imagen" in response.json()["detail"]


def test_colorimetry_analyze_rejection_missing_validation_message_has_fallback():
    """Si Gemini devuelve is_valid_image=False con validation_error_message nulo, debe retornar mensaje por defecto amigable."""
    mock_invalid_color = {
        "is_valid_image": False,
        "validation_error_message": None,
    }
    with patch("app.api.colorimetry.analyze_colorimetry", new_callable=AsyncMock) as mock_service:
        mock_service.return_value = mock_invalid_color
        response = client.post(
            "/api/colorimetry/analyze",
            json={"image": "https://example.com/blurry_noise.jpg"}
        )
        assert response.status_code == 400
        assert "Esta imagen no parece ser de una persona" in response.json()["detail"]

