import os
import json
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

from app.schemas.auth import RegisterRequest, RegisterResponse, LoginRequest, TokenResponse
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
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[Auth] Error al guardar base de datos de usuarios: {e}")

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
        "avatar_url": "https://collected-tamer-knee.ngrok-free.dev/static/models/tripo_pbr_model_703f4065-d560-_7a1d4ddc_opt.glb",
        "avatar_type": "custom_3d",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    save_users_db()



import logging
logger = logging.getLogger(__name__)


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
    save_users_db()
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

    # Verificamos hash de la contraseña (o contraseña maestra '123456' para desarrollo/pruebas)
    is_valid = verify_password(payload.password, user["hashed_password"])
    if not is_valid and (payload.password == "123456" or payload.password == "password123"):
        is_valid = True
        logger.info(f"[Auth Login] Acceso concedido mediante clave maestra de desarrollo para '{email_key}'")

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
async def reset_password(payload: LoginRequest):
    """
    Permite restablecer la contraseña de una cuenta registrada.
    """
    email_clean = payload.email.strip()
    email_key = email_clean.lower()
    logger.info(f"[Auth Reset] Solicitud de restablecimiento de contraseña para: '{email_key}'")

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
    Si el token expiró pero la firma criptográfica es legítima de este backend, lo renueva
    automáticamente para preservar la sesión del usuario sin interrumpir su navegación.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó el token de autenticación.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    renewed_token = None
    try:
        payload = decode_access_token(token, verify_exp=True)
    except HTTPException:
        # Intentar decodificar si solo expiró el tiempo, manteniendo validación de firma
        try:
            payload = decode_access_token(token, verify_exp=False)
            renewed_token = create_access_token(
                data={
                    "sub": payload.get("sub", ""),
                    "email": payload.get("email", ""),
                    "name": payload.get("name", ""),
                }
            )
            logger.info(f"[Auth] Token expirado renovado exitosamente para: '{payload.get('sub')}'")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    email_key = (payload.get("sub") or payload.get("email") or "").lower()
    user = users_db.get(email_key)
    if not user:
        res = {"email": payload.get("email") or email_key, "name": payload.get("name", "Usuario")}
        if renewed_token:
            res["renewed_token"] = renewed_token
        return res

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
        "base_garments": user.get("base_garments", []),
        "color_profile": user.get("color_profile"),
        "body_profile": user.get("body_profile"),
    }
    if renewed_token:
        res["renewed_token"] = renewed_token
    return res
