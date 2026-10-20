from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_user_profile_setup_success():
    payload = {
        "full_name": "Valerie Dubois",
        "age": 28,
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


def test_user_profile_setup_validation_error():
    # Edad negativa o inválida
    payload = {
        "full_name": "A" * 60,  # Supera longitud máxima de 50
        "age": 150,              # Supera edad máxima
    }
    response = client.post("/api/users/profile/setup", json=payload)
    assert response.status_code == 422
