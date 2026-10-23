import os
import json
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.schemas.auth import RegisterRequest, RegisterResponse, LoginRequest, TokenResponse
from app.services.auth_service import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)

router = APIRouter()
security = HTTPBearer(auto_error=False)

USERS_DB_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "users_db.json")

def _load_users_db() -> Dict[str, Dict[str, Any]]:
    if os.path.exists(USERS_DB_FILE):
        try:
            with open(USERS_DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_users_db():
    try:
        os.makedirs(os.path.dirname(USERS_DB_FILE), exist_ok=True)
        with open(USERS_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(users_db, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

# Base de datos persistente para usuarios registrados
users_db: Dict[str, Dict[str, Any]] = _load_users_db()

# Usuario demo preconfigurado para pruebas inmediatas
_demo_email = "demo@vitra.ai"
if _demo_email not in users_db:
    users_db[_demo_email] = {
        "email": _demo_email,
        "hashed_password": get_password_hash("password123"),
        "name": "Usuario Vitra",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

# Asegurar persistencia de usuario Stiven con su modelo 3D generado
_stiven_email = "stivenbuesquillo731@gmail.com"
if _stiven_email not in users_db or not users_db[_stiven_email].get("avatar_url"):
    users_db[_stiven_email] = {
        "email": _stiven_email,
        "hashed_password": get_password_hash("123456"),
        "name": "Stiven",
        "gender": "male",
        "age": 21,
        "avatar_url": "https://fitglass-ai-kevin.loca.lt/static/models/tripo_pbr_model_703f4065-d560-_7a1d4ddc_opt.glb",
        "avatar_type": "custom_3d",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
save_users_db()


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    """
    Registra un nuevo usuario con email y contraseña segura (Bcrypt).
    Almacena los datos en la base de datos simulada y retorna confirmación sin exponer el hash.
    """
    email_clean = payload.email.strip()
    email_key = email_clean.lower()

    if not email_clean or "@" not in email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dirección de correo electrónico inválida."
        )

    if email_key in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con este correo electrónico."
        )

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres."
        )

    # Hasheamos la contraseña con Bcrypt
    hashed_pwd = get_password_hash(payload.password)

    # Guardamos en la base de datos simulada
    users_db[email_key] = {
        "email": email_clean,
        "hashed_password": hashed_pwd,
        "name": payload.name or email_clean.split("@")[0],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    save_users_db()

    return RegisterResponse(
        message="Usuario registrado exitosamente",
        email=email_clean,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    """
    Autentica al usuario verificando su contraseña cifrada y retorna un token JWT firmado.
    """
    email_clean = payload.email.strip()
    email_key = email_clean.lower()

    user = users_db.get(email_key)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verificamos hash de la contraseña
    if not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generamos token JWT
    access_token = create_access_token(
        data={
            "sub": email_key,
            "email": user["email"],
            "name": user.get("name", ""),
        }
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        email=user["email"],
    )


@router.get("/me")
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Valida el token JWT recibido en el encabezado Authorization y retorna el perfil básico.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó el token de autenticación.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    email_key = payload.get("sub")
    user = users_db.get(email_key)
    if not user:
        return {"email": payload.get("email"), "name": payload.get("name", "Usuario")}

    return {
        "email": user["email"],
        "name": user.get("name", ""),
        "created_at": user.get("created_at"),
        "gender": user.get("gender", "female"),
        "age": user.get("age"),
        "avatar_url": user.get("avatar_url"),
        "avatar_type": user.get("avatar_type", "preset"),
        "base_garments": user.get("base_garments", []),
    }
