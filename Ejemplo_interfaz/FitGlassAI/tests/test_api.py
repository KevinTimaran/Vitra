import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_analyze_garment_unsupported_mime():
    # Creamos un archivo ficticio de texto
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
