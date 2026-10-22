import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from app.main import app
from app.schemas.garment import GarmentAnalysis

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "FitGlassAI API running"}


# -------------------------------------------------------------
# Pruebas de integración: POST /api/garments/analyze (Multipart)
# -------------------------------------------------------------
def test_analyze_garment_unsupported_mime():
    files = {"file": ("test.txt", b"hola mundo", "text/plain")}
    response = client.post("/api/garments/analyze", files=files)
    assert response.status_code == 400
    assert response.json()["success"] is False
    assert "Formato no soportado" in response.json()["error"]


def test_analyze_garment_empty_file():
    files = {"file": ("test.jpg", b"", "image/jpeg")}
    response = client.post("/api/garments/analyze", files=files)
    assert response.status_code == 400
    assert response.json()["success"] is False
    assert "vacío" in response.json()["error"]


def test_analyze_garment_success():
    mock_analysis = GarmentAnalysis(
        category="Tops",
        sleeve="Short",
        neck="Crew",
        fit="Regular",
        dominantColor="#FFFFFF",
        secondaryColors=["#000000"],
        pattern="Solid",
        hasPocket=False,
        hasButtons=False,
        hasZipper=False,
        confidence=0.95
    )
    
    with patch("app.api.garments.analyze_garment_image", return_value=mock_analysis):
        files = {"file": ("test.jpg", b"fake_image_content", "image/jpeg")}
        response = client.post("/api/garments/analyze", files=files)
        
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["success"] is True
        assert json_data["data"]["category"] == "Tops"
        assert json_data["data"]["dominantColor"] == "#FFFFFF"


def test_analyze_garment_gemini_error():
    with patch("app.api.garments.analyze_garment_image", side_effect=ValueError("GEMINI_API_KEY no está configurada")):
        files = {"file": ("test.jpg", b"fake_image_content", "image/jpeg")}
        response = client.post("/api/garments/analyze", files=files)
        
        assert response.status_code == 400
        json_data = response.json()
        assert json_data["success"] is False
        assert "no está configurada" in json_data["error"]


# -------------------------------------------------------------
# Pruebas de integración: POST /api/garments/analyze (JSON Base64 / URL)
# -------------------------------------------------------------
def test_analyze_garment_json_success():
    mock_metadata = {
        "tipo_prenda": "Camiseta Oversized",
        "color_dominante": "#000000",
        "colores_secundarios": ["#FFFFFF"],
        "estilo_recomendado": "Streetwear",
        "corte": "Oversized",
        "ocasion_recomendada": "Casual",
        "detalles": "Algodón pesado con estampado"
    }

    with patch("app.api.garments.analyze_garment", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = mock_metadata
        response = client.post(
            "/api/garments/analyze",
            json={"image": "https://example.com/tshirt.png"}
        )

        assert response.status_code == 200
        json_data = response.json()
        assert json_data["success"] is True
        assert json_data["data"]["tipo_prenda"] == "Camiseta Oversized"
        assert json_data["data"]["estilo_recomendado"] == "Streetwear"
        mock_analyze.assert_called_once_with("https://example.com/tshirt.png")


def test_analyze_garment_json_missing_image():
    response = client.post("/api/garments/analyze", json={})
    assert response.status_code == 400
    assert response.json()["success"] is False


def test_analyze_garment_json_service_http_error():
    with patch("app.api.garments.analyze_garment", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.side_effect = HTTPException(status_code=502, detail="Error de comunicación con Gemini")
        response = client.post(
            "/api/garments/analyze",
            json={"image": "https://example.com/tshirt.png"}
        )

        assert response.status_code == 200
        json_data = response.json()
        assert json_data["success"] is True
        assert json_data["data"]["tipo_prenda"] == "Prenda de prueba"
        assert json_data["data"]["color_dominante"] == "#000000"


# -------------------------------------------------------------
# Pruebas de integración: POST /api/tryon/generate (Pipeline VTON + 3D)
# -------------------------------------------------------------
def test_tryon_generate_success():
    expected_2d = "https://replicate.delivery/pbxt/tryon_result.png"
    expected_3d = "https://openapi.cdn.tripo3d.ai/output_mesh.glb"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_3d:
        
        mock_vton.return_value = expected_2d
        mock_3d.return_value = expected_3d

        payload = {
            "human_image": "https://example.com/human.jpg",
            "garment_image": "https://example.com/shirt.jpg",
            "category": "upper_body",
            "garment_description": "black t-shirt"
        }

        response = client.post("/api/tryon/generate", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["image_2d_url"] == expected_2d
        assert data["model_3d_url"] == expected_3d
        assert data["status"] == "completed"

        mock_vton.assert_called_once_with(
            human_image_url="https://example.com/human.jpg",
            garment_image_url="https://example.com/shirt.jpg",
            category="upper_body",
            garment_description="black t-shirt",
        )
        mock_3d.assert_called_once_with(image_url=expected_2d)


def test_tryon_generate_missing_fields():
    # Pydantic validation error si faltan campos obligatorios
    response = client.post("/api/tryon/generate", json={"human_image": "https://example.com/human.jpg"})
    assert response.status_code == 422


def test_tryon_generate_vton_failure():
    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton:
        mock_vton.side_effect = HTTPException(status_code=502, detail="Error en Replicate VTON")
        payload = {
            "human_image": "https://example.com/human.jpg",
            "garment_image": "https://example.com/shirt.jpg"
        }
        response = client.post("/api/tryon/generate", json=payload)
        assert response.status_code == 502
        assert "Replicate VTON" in response.json()["detail"]


def test_tryon_generate_tripo_failure():
    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_3d:
        
        mock_vton.return_value = "https://replicate.delivery/pbxt/tryon_result.png"
        mock_3d.side_effect = HTTPException(status_code=504, detail="Timeout en Tripo3D")

        payload = {
            "human_image": "https://example.com/human.jpg",
            "garment_image": "https://example.com/shirt.jpg"
        }
        response = client.post("/api/tryon/generate", json=payload)
        assert response.status_code == 504
        assert "Tripo3D" in response.json()["detail"]


def test_tryon_generate_tripo_fallback_when_allowed():
    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_3d:
        
        mock_vton.return_value = "https://replicate.delivery/pbxt/tryon_result.png"
        mock_3d.side_effect = HTTPException(status_code=502, detail="Tripo3D sin créditos")

        payload = {
            "human_image": "https://example.com/human.jpg",
            "garment_image": "https://example.com/shirt.jpg",
            "allow_fallback": True,
        }
        response = client.post("/api/tryon/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["image_2d_url"] == "https://replicate.delivery/pbxt/tryon_result.png"
        assert "tshirt" in data["model_3d_url"]
        assert data["status"] == "completed"


# -------------------------------------------------------------
# Pruebas de integración: POST /api/colorimetry/analyze
# -------------------------------------------------------------
def test_colorimetry_analyze_success():
    mock_result = {
        "skin_tone": "#E8BEAC (Cálido)",
        "hair_color": "#2C1B18 (Castaño)",
        "eye_color": "#3B261C (Marrón)",
        "season": "Otoño Cálido",
        "palette_name": "Tierra y Ámbar",
        "description": "Tu subtono cálido se ve realzado con colores terrosos y dorados.",
        "recommended_colors": ["#854D0E", "#047857", "#B45309", "#B91C1C", "#1E3A8A", "#D97706"],
        "colors_to_avoid": ["#9333EA", "#06B6D4", "#EC4899"]
    }

    with patch("app.api.colorimetry.analyze_colorimetry", new_callable=AsyncMock) as mock_service:
        mock_service.return_value = mock_result
        response = client.post(
            "/api/colorimetry/analyze",
            json={"image": "https://example.com/face.jpg"}
        )

        assert response.status_code == 200
        json_data = response.json()
        assert json_data["success"] is True
        assert json_data["data"]["season"] == "Otoño Cálido"
        assert len(json_data["data"]["recommended_colors"]) == 6
        mock_service.assert_called_once_with("https://example.com/face.jpg")


def test_colorimetry_analyze_missing_image():
    response = client.post("/api/colorimetry/analyze", json={})
    assert response.status_code == 400
    assert response.json()["success"] is False


# -------------------------------------------------------------
# Pruebas de integración: POST /api/avatar/generate
# -------------------------------------------------------------
def test_avatar_generate_success():
    expected_avatar_url = "https://openapi.cdn.tripo3d.ai/avatar_base.glb"

    with patch("app.api.avatar.generate_3d_model", new_callable=AsyncMock) as mock_tripo:
        mock_tripo.return_value = expected_avatar_url
        response = client.post(
            "/api/avatar/generate",
            json={"image": "https://example.com/fullbody.jpg"}
        )

        assert response.status_code == 200
        json_data = response.json()
        assert json_data["avatar_url"] == expected_avatar_url
        assert json_data["status"] == "completed"
        mock_tripo.assert_called_once_with("https://example.com/fullbody.jpg")


def test_avatar_generate_failure():
    with patch("app.api.avatar.generate_3d_model", new_callable=AsyncMock) as mock_tripo:
        mock_tripo.side_effect = HTTPException(status_code=502, detail="Error en Tripo3D")
        response = client.post(
            "/api/avatar/generate",
            json={"image": "https://example.com/fullbody.jpg"}
        )

        assert response.status_code == 502
        assert "Tripo3D" in response.json()["detail"]

