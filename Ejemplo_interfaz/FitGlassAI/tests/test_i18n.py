"""El backend responde en el idioma que pide la app (cabecera Accept-Language)."""
import uuid

from fastapi.testclient import TestClient

from app.errors import code_for
from app.i18n import (
    garment_language_instruction,
    get_request_language,
    parse_accept_language,
    person_language_instruction,
    reset_request_language,
    set_request_language,
)
from app.main import app

client = TestClient(app)


def test_parse_accept_language():
    assert parse_accept_language(None) == "es"
    assert parse_accept_language("") == "es"
    assert parse_accept_language("en") == "en"
    assert parse_accept_language("en-US,en;q=0.9") == "en"
    assert parse_accept_language("es-CO") == "es"
    assert parse_accept_language("fr-FR,en;q=0.8") == "en"
    assert parse_accept_language("fr-FR") == "es"


def test_prompt_instruction_follows_request_language():
    token = set_request_language("en")
    try:
        assert get_request_language() == "en"
        assert "INGLÉS" in garment_language_instruction()
        assert "We couldn't detect clothing in this image" in garment_language_instruction()
        assert "This image doesn't look like a person" in person_language_instruction()
    finally:
        reset_request_language(token)
    assert get_request_language() == "es"
    assert "ESPAÑOL" in garment_language_instruction()
    assert "No detectamos ropa en esta imagen" in garment_language_instruction()


def test_english_validation_messages_keep_their_codes():
    assert code_for("We couldn't detect clothing in this image. Please upload a clear photo of the garment.") == "image_no_garment"
    assert code_for("This image doesn't look like a person. Please upload a photo of yourself.") == "image_no_person"


def test_error_detail_in_requested_language():
    email = f"lang_{uuid.uuid4().hex[:6]}@vitra.ai"
    assert client.post("/api/auth/register", json={"email": email, "password": "secret123"}).status_code == 201

    en = client.post("/api/auth/login", json={"email": email, "password": "otra"}, headers={"Accept-Language": "en"})
    assert en.status_code == 401 and en.json()["code"] == "wrong_password"
    assert en.json()["detail"].startswith("Incorrect password")

    es = client.post("/api/auth/login", json={"email": email, "password": "otra"}, headers={"Accept-Language": "es"})
    assert "Contraseña incorrecta" in es.json()["detail"]

    default = client.post("/api/auth/login", json={"email": email, "password": "otra"})
    assert "Contraseña incorrecta" in default.json()["detail"]
