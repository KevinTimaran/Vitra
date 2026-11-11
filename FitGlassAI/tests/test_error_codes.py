"""Los errores conocidos incluyen un `code` estable para que la app los traduzca."""
import uuid

from fastapi.testclient import TestClient

from app.errors import code_for
from app.main import app

client = TestClient(app)


def test_login_errors_have_codes():
    email = f"code_{uuid.uuid4().hex[:6]}@vitra.ai"
    assert client.post("/api/auth/register", json={"email": email, "password": "secret123"}).status_code == 201

    wrong = client.post("/api/auth/login", json={"email": email, "password": "otra-clave"})
    assert wrong.status_code == 401 and wrong.json()["code"] == "wrong_password"
    assert "Contraseña incorrecta" in wrong.json()["detail"]  # el texto sigue ahí como respaldo

    missing = client.post("/api/auth/login", json={"email": "nadie@vitra.ai", "password": "x"})
    assert missing.json()["code"] == "user_not_found"


def test_register_errors_have_codes():
    email = f"code_{uuid.uuid4().hex[:6]}@vitra.ai"
    client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    dup = client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    assert dup.status_code == 400 and dup.json()["code"] == "account_exists"
    short = client.post("/api/auth/register", json={"email": "otro@vitra.ai", "password": "123"})
    assert short.json()["code"] == "password_short"


def test_auth_required_endpoints_and_unknown_errors():
    assert client.get("/api/auth/me").json()["code"] == "token_missing"
    assert client.get("/api/wardrobe").json()["code"] == "login_required"
    # un error sin código conocido solo trae detail
    unknown = client.get("/api/tryon/status/no-existe")
    assert unknown.status_code == 404 and "code" not in unknown.json()


def test_code_for_prefix_matches():
    assert code_for("No detectamos ropa en esta imagen. Por favor sube una foto clara.") == "image_no_garment"
    assert code_for("Esta imagen no parece ser de una persona. Sube otra.") == "image_no_person"
    assert code_for(None) is None
