import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import get_password_hash, verify_password, create_access_token, decode_access_token
from app.api.auth import users_db

client = TestClient(app)


def test_password_hashing_and_verification():
    raw = "MySecurePassword123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_creation_and_decoding():
    data = {"sub": "test@vitra.ai", "name": "Tester"}
    token = create_access_token(data)
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "test@vitra.ai"
    assert decoded["name"] == "Tester"
    assert "exp" in decoded


def test_auth_register_and_login_flow():
    test_email = "newuser@vitra.ai"
    test_pwd = "strongpassword123"

    # 1. Registrar usuario nuevo
    reg_res = client.post("/api/auth/register", json={
        "email": test_email,
        "password": test_pwd,
        "name": "Nuevo Usuario",
    })
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert data["email"] == test_email
    assert "password" not in data
    assert "hashed_password" not in data

    # 2. Registrar el mismo email de nuevo debe fallar
    dup_res = client.post("/api/auth/register", json={
        "email": test_email,
        "password": test_pwd,
    })
    assert dup_res.status_code == 400

    # 3. Login con credenciales erróneas
    bad_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "wrongpassword",
    })
    assert bad_login.status_code == 401

    # 4. Login con credenciales correctas
    ok_login = client.post("/api/auth/login", json={
        "email": test_email,
        "password": test_pwd,
    })
    assert ok_login.status_code == 200
    token_data = ok_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    token = token_data["access_token"]

    # 5. Consultar /api/auth/me con el token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == test_email


def test_demo_user_login():
    res = client.post("/api/auth/login", json={
        "email": "demo@vitra.ai",
        "password": "password123",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()
