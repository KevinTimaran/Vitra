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

from unittest.mock import patch
from app.schemas.garment import GarmentAnalysis

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
