from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_user_profile_setup_success():
    payload = {
        "full_name": "Valerie Dubois",
        "age": 28,
        "gender": "female",
        "face_image": "data:image/jpeg;base64,samplefaceimage",
        "body_image": "data:image/jpeg;base64,samplebodyimage",
    }
    response = client.post("/api/users/profile/setup", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "Perfil configurado correctamente"
    assert data["full_name"] == "Valerie Dubois"
    assert data["age"] == 28
    assert data["gender"] == "female"


def test_user_profile_setup_with_colorimetry():
    payload = {
        "full_name": "Valerie Dubois",
        "age": 28,
        "gender": "female",
        "face_image": "data:image/jpeg;base64,samplefaceimage",
    }
    mock_color = {
        "skin_tone": "#F5D0C5",
        "hair_color": "#4A2E18",
        "season": "Invierno Brillante",
        "recommended_colors": ["#1E3A8A", "#B91C1C"],
    }
    with patch("app.services.gemini_service.analyze_colorimetry", new_callable=AsyncMock) as mock_c:
        mock_c.return_value = mock_color
        response = client.post("/api/users/profile/setup", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["color_profile"] is not None
        assert data["color_profile"]["season"] == "Invierno Brillante"


def test_user_profile_setup_validation_error():
    # Edad negativa o inválida
    payload = {
        "full_name": "A" * 60,  # Supera longitud máxima de 50
        "age": 150,              # Supera edad máxima
    }
    response = client.post("/api/users/profile/setup", json=payload)
    assert response.status_code == 422


def test_user_profile_setup_flow2_skip_assigns_default_female_avatar():
    """FLOW 2: Usuario omite fotos -> Asigna default_girl_opt.glb y base_garments"""
    payload = {
        "full_name": "Elena Rostova",
        "age": 25,
        "gender": "female",
        # body_image omitido
    }
    response = client.post("/api/users/profile/setup", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "default_girl_opt.glb" in data["avatar_url"]
    assert data["avatar_type"] == "preset"
    assert len(data["base_garments"]) == 2


def test_user_profile_setup_flow2_skip_assigns_default_male_avatar():
    """FLOW 2: Silueta masculina sin fotos -> Asigna default_men_opt.glb"""
    payload = {
        "full_name": "Marcus Vance",
        "age": 30,
        "gender": "male",
    }
    response = client.post("/api/users/profile/setup", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "default_men_opt.glb" in data["avatar_url"]
    assert data["avatar_type"] == "preset"
    assert any("Heavyweight" in g["name"] for g in data["base_garments"])


def test_flow3_update_user_avatar():
    """FLOW 3: Actualizar avatar desde Ajustes/Perfil"""
    payload = {
        "body_image": "data:image/jpeg;base64,dGVzdA==",
    }
    with patch("app.api.users._execute_avatar_generation", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = "http://testserver/static/models/avatar_custom_opt.glb"
        response = client.put("/api/users/avatar", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["avatar_type"] == "custom_3d"
        assert data["avatar_url"] == "http://testserver/static/models/avatar_custom_opt.glb"



def test_get_default_avatar_endpoints():
    """Verifica endpoint /api/avatar/default para femenino y masculino"""
    res_female = client.get("/api/avatar/default?gender=female")
    assert res_female.status_code == 200
    assert "default_girl_opt.glb" in res_female.json()["avatar_url"]

    res_male = client.get("/api/avatar/default?gender=male")
    assert res_male.status_code == 200
    assert "default_men_opt.glb" in res_male.json()["avatar_url"]

