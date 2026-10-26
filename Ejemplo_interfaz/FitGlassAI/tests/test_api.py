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
        mock_3d.assert_called_once_with(image_url="https://example.com/shirt.jpg")


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


def test_tryon_generate_tripo_error_propagates():
    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_3d:
        
        mock_vton.return_value = "https://replicate.delivery/pbxt/tryon_result.png"
        mock_3d.side_effect = HTTPException(status_code=502, detail="Fallo en la API de Tripo3D")

        payload = {
            "human_image": "https://example.com/human.jpg",
            "garment_image": "https://example.com/shirt.jpg",
        }
        response = client.post("/api/tryon/generate", json=payload)
        assert response.status_code == 502
        assert "Tripo3D" in response.json()["detail"]


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


def test_colorimetry_analyze_face_image_alias():
    mock_result = {
        "skin_tone": "#E8BEAC (Cálido)",
        "hair_color": "#2C1B18 (Castaño)",
        "season": "Otoño Cálido",
        "description": "Tu subtono cálido se ve realzado con colores terrosos.",
        "recommended_colors": ["#854D0E", "#047857"],
    }
    with patch("app.api.colorimetry.analyze_colorimetry", new_callable=AsyncMock) as mock_service:
        mock_service.return_value = mock_result
        response = client.post(
            "/api/colorimetry/analyze",
            json={"face_image": "https://example.com/face_alias.jpg"}
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        mock_service.assert_called_once_with("https://example.com/face_alias.jpg")


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


# -------------------------------------------------------------
# Pruebas: DELETE /api/avatar/current & GET /api/avatar/presets
# -------------------------------------------------------------
def test_avatar_delete_endpoint():
    response = client.delete("/api/avatar/current")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "deleted"
    assert "reestablecido" in data["message"] or "restablecido" in data["message"] or "eliminado" in data["message"]


def test_avatar_delete_endpoint_authenticated():
    from app.services.auth_service import create_access_token
    from app.api.auth import users_db, save_users_db

    test_email = "del_avatar_api_test@vitra.ai"
    users_db[test_email] = {
        "email": test_email,
        "name": "Avatar Delete Test",
        "gender": "female",
        "avatar_url": "http://testserver/static/models/old_custom.glb",
        "avatar_type": "custom_3d",
    }
    save_users_db()
    token = create_access_token({"sub": test_email, "email": test_email})

    try:
        response = client.delete("/api/avatar/current", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"
        assert data["avatar_type"] == "preset"
        assert "default_girl_opt.glb" in data["avatar_url"]
        assert users_db[test_email]["avatar_type"] == "preset"
        assert "default_girl_opt.glb" in users_db[test_email]["avatar_url"]
    finally:
        users_db.pop(test_email, None)
        save_users_db()


def test_avatar_generate_multipart_body_image_alias():
    with patch("app.api.avatar.generate_3d_model", new_callable=AsyncMock) as mock_tripo:
        mock_tripo.return_value = "https://openapi.cdn.tripo3d.ai/avatar_alias.glb"
        response = client.post(
            "/api/avatar/generate",
            data={"body_image": "https://example.com/fullbody_alias.jpg"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["avatar_url"] == "https://openapi.cdn.tripo3d.ai/avatar_alias.glb"
        assert data["status"] == "completed"


def test_avatar_presets_endpoint():
    response = client.get("/api/avatar/presets")
    assert response.status_code == 200
    data = response.json()
    assert "presets" in data
    assert len(data["presets"]) >= 3
    genders = [p["gender"] for p in data["presets"]]
    assert "female" in genders
    assert "male" in genders
    assert "non-binary" in genders


# -------------------------------------------------------------
# Pruebas: Multi-Garment Try-On POST /api/tryon/generate
# -------------------------------------------------------------
def test_tryon_multi_garment_success():
    mock_2d_top = "https://mock.com/top_fused.png"
    mock_2d_pants = "https://mock.com/complete_look_fused.png"
    mock_3d = "https://mock.com/model3d.glb"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton, \
         patch("app.api.tryon.generate_3d_model", new_callable=AsyncMock) as mock_3d_fn, \
         patch("app.api.tryon.optimize_3d_model", new_callable=AsyncMock) as mock_opt:

        mock_vton.side_effect = [mock_2d_top, mock_2d_pants]
        mock_3d_fn.return_value = mock_3d
        mock_opt.return_value = "http://testserver/static/models/outfit_opt.glb"

        payload = {
            "human_image": "https://example.com/person.png",
            "garments": [
                {"image": "https://example.com/jacket.png", "category": "upper_body", "name": "Blazer"},
                {"image": "https://example.com/trousers.png", "category": "lower_body", "name": "Pants"},
            ],
            "allow_fallback": False
        }

        response = client.post("/api/tryon/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["model_3d_url"] == "http://testserver/static/models/outfit_opt.glb"
        # Tripo3D invocado EXACTAMENTE UNA VEZ por look completado
        assert mock_3d_fn.call_count == 1
        # IDM-VTON invocado dos veces (una para chaqueta y una para pantalón)
        assert mock_vton.call_count == 2


def test_tryon_multi_garment_failure_strict_mode():
    """Verifica que con allow_fallback=False, si falla una prenda intermedia, el error 502 se propague."""
    mock_2d_top = "https://mock.com/top_fused.png"

    with patch("app.api.tryon.generate_vton", new_callable=AsyncMock) as mock_vton:
        mock_vton.side_effect = [mock_2d_top, HTTPException(status_code=502, detail="VTON GPU error")]

        payload = {
            "human_image": "https://example.com/person.png",
            "garments": [
                {"image": "https://example.com/jacket.png", "category": "upper_body", "name": "Blazer"},
                {"image": "https://example.com/trousers.png", "category": "lower_body", "name": "Pants"},
            ],
            "allow_fallback": False
        }

        response = client.post("/api/tryon/generate", json=payload)
        assert response.status_code == 502
        assert "VTON GPU error" in response.json()["detail"]


def test_avatar_latest_filters_non_avatars():
    """Verifica que /api/avatar/latest filtre prendas y presets no aptos como avatar de usuario."""
    response = client.get("/api/avatar/latest")
    # Si hay modelos válidos, no debe retornar default_ ni DamagedHelmet
    if response.status_code == 200:
        data = response.json()
        assert not data["filename"].startswith("default_")
        assert not data["filename"].startswith("DamagedHelmet")
        assert not data["filename"].startswith("tshirt")


