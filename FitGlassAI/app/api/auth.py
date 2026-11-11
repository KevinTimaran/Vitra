import os
import json
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.services.base_garments import refresh_base_garment_images
from app import db as vitra_db

from app.schemas.auth import (
    EmailAvailabilityRequest,
    EmailAvailabilityResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from app.services.auth_service import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)

router = APIRouter()
security = HTTPBearer(auto_error=False)

def _resolve_base_url(request: Request = None) -> str:
    if request:
        forwarded_host = request.headers.get("x-forwarded-host")
        if forwarded_host:
            clean_host = forwarded_host.split(",")[0].strip()
            scheme = request.headers.get("x-forwarded-proto", "https").split(",")[0].strip()
            return f"{scheme}://{clean_host}"
        if request.base_url:
            return str(request.base_url).rstrip("/")
    if settings.EXPO_PUBLIC_API_BASE_URL:
        return settings.EXPO_PUBLIC_API_BASE_URL.rstrip("/")
    return "http://127.0.0.1:8000"

# Base de datos SQLite (app/db.py). Los antiguos users_db.json se importan una sola vez y se renombran a *.migrated.
# Si la base está dañada, DatabaseError detiene el arranque en lugar de continuar con una base vacía.
_APP_DIR = os.path.dirname(os.path.dirname(__file__))
LEGACY_USERS_JSON_FILES = [
    os.environ.get("USERS_DB_PATH") or os.path.join(_APP_DIR, "data", "users_db.json"),
    os.path.join(_APP_DIR, "static", "users_db.json"),  # ubicación antigua (era pública)
]

vitra_db.use_database()
vitra_db.migrate_legacy_json(LEGACY_USERS_JSON_FILES)

# Caché en memoria de los usuarios; save_users_db() la persiste en SQLite de forma transaccional.
users_db: Dict[str, Dict[str, Any]] = vitra_db.load_users()


def save_users_db():
    """Persiste users_db en SQLite. Si falla, propaga el error (la API responde 500, no finge éxito)."""
    vitra_db.save_users(users_db)

# Usuario demo con credenciales conocidas: SOLO si se habilita explícitamente (desarrollo).
_demo_email = "demo@vitra.ai"
if os.getenv("ENABLE_DEMO_USER", "").strip().lower() in ("1", "true", "yes") and _demo_email not in users_db:
    users_db[_demo_email] = {
        "email": _demo_email,
        "hashed_password": get_password_hash("password123"),
        "name": "Usuario Vitra",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    save_users_db()



import logging
logger = logging.getLogger(__name__)


@router.post("/email-availability", response_model=EmailAvailabilityResponse)
async def check_email_availability(payload: EmailAvailabilityRequest):
    """Comprueba el correo antes de permitir avanzar en el registro."""
    email_clean = payload.email.strip()
    email_key = email_clean.lower()

    if not email_clean or "@" not in email_clean or "." not in email_clean.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dirección de correo electrónico inválida.",
        )

    return EmailAvailabilityResponse(exists=email_key in users_db)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    """
    Registra un nuevo usuario con email y contraseña segura (Bcrypt).
    Almacena los datos en la base de datos simulada y retorna confirmación sin exponer el hash.
    """
    email_clean = payload.email.strip()
    email_key = email_clean.lower()
    logger.info(f"[Auth Register] Intento de registro con email: '{email_key}'")

    if not email_clean or "@" not in email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dirección de correo electrónico inválida."
        )

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener al menos 6 caracteres."
        )

    # Hasheamos la contraseña con Bcrypt
    hashed_pwd = get_password_hash(payload.password)

    if email_key in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con este correo electrónico."
        )

    # Guardamos en la base de datos simulada
    users_db[email_key] = {
        "email": email_clean,
        "hashed_password": hashed_pwd,
        "name": payload.name or email_clean.split("@")[0],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        save_users_db()
    except Exception as e:
        users_db.pop(email_key, None)  # no dejar en memoria una cuenta que no se guardó
        logger.error(f"[Auth Register] No se pudo guardar la cuenta '{email_key}': {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar la cuenta. Inténtalo de nuevo.")
    logger.info(f"[Auth Register] Cuenta creada exitosamente: '{email_key}'")

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
    logger.info(f"[Auth Login] Intento de login con email: '{email_key}'")

    user = users_db.get(email_key)
    if not user:
        logger.warning(f"[Auth Login] Usuario no encontrado en base de datos: '{email_key}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas o usuario no registrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    is_valid = verify_password(payload.password, user.get("hashed_password", ""))

    if not is_valid:
        logger.warning(f"[Auth Login] Contraseña incorrecta para usuario: '{email_key}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta. Verifica tu clave o restablece tu contraseña.",
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
    logger.info(f"[Auth Login] Login exitoso para usuario: '{email_key}'")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        email=user["email"],
    )


@router.post("/reset-password")
async def reset_password(
    payload: LoginRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Cambia la contraseña de una cuenta. Requiere un token válido de ESA misma cuenta.
    Solo para desarrollo se puede habilitar el reset sin token con ALLOW_INSECURE_DEV_RESET=1
    (no existe aún un flujo de verificación por correo).
    """
    email_clean = payload.email.strip()
    email_key = email_clean.lower()
    logger.info(f"[Auth Reset] Solicitud de restablecimiento de contraseña para: '{email_key}'")

    insecure_dev = os.getenv("ALLOW_INSECURE_DEV_RESET", "").strip().lower() in ("1", "true", "yes")
    if not insecure_dev:
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Debes iniciar sesión para cambiar tu contraseña.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = decode_access_token(credentials.credentials)
        token_email = (token_data.get("sub") or token_data.get("email") or "").lower()
        if token_email != email_key:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes cambiar la contraseña de otra cuenta.",
            )

    if email_key not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ninguna cuenta registrada con este correo electrónico."
        )

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres."
        )

    users_db[email_key]["hashed_password"] = get_password_hash(payload.password)
    save_users_db()
    logger.info(f"[Auth Reset] Contraseña restablecida con éxito para: '{email_key}'")
    return {"message": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave."}


@router.get("/me")
async def get_current_user(
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Valida el token JWT recibido en el encabezado Authorization y retorna el perfil básico.
    Un token expirado se rechaza (401): el usuario debe iniciar sesión de nuevo.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó el token de autenticación.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials, verify_exp=True)

    email_key = (payload.get("sub") or payload.get("email") or "").lower()
    user = users_db.get(email_key)
    if not user:
        return {"email": payload.get("email") or email_key, "name": payload.get("name", "Usuario")}

    avatar_url = user.get("avatar_url")
    if avatar_url and "/static/models/" in avatar_url:
        base_url = _resolve_base_url(request)
        filename = avatar_url.split("/static/models/")[-1]
        avatar_url = f"{base_url}/static/models/{filename}"

    res = {
        "email": user["email"],
        "name": user.get("name", ""),
        "created_at": user.get("created_at"),
        "gender": user.get("gender", "female"),
        "age": user.get("age"),
        "avatar_url": avatar_url,
        "avatar_type": user.get("avatar_type", "preset"),
        "base_garments": refresh_base_garment_images(user.get("base_garments", []), _resolve_base_url(request)),
        "color_profile": user.get("color_profile"),
        "body_profile": user.get("body_profile"),
    }
    return res
