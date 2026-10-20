from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.schemas.user import UserProfileSetup, UserProfileSetupResponse
from app.services.auth_service import decode_access_token
from app.api.auth import users_db

router = APIRouter()
security = HTTPBearer(auto_error=False)


@router.post("/profile/setup", response_model=UserProfileSetupResponse, status_code=status.HTTP_200_OK)
async def setup_user_profile(
    payload: UserProfileSetup,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Recibe la configuración inicial biométrica del usuario (nombre completo, edad, foto de rostro y foto de cuerpo).
    Almacena los datos en el perfil y deja la estructura lista para orquestar con Gemini y Tripo3D.
    """
    user_email = None

    # Si se incluye token JWT en la petición, asociar la configuración a la cuenta
    if credentials:
        try:
            token_data = decode_access_token(credentials.credentials)
            user_email = token_data.get("sub") or token_data.get("email")
            if user_email and user_email.lower() in users_db:
                users_db[user_email.lower()].update({
                    "name": payload.full_name,
                    "age": payload.age,
                    "face_image": payload.face_image[:50] + "..." if payload.face_image and len(payload.face_image) > 50 else payload.face_image,
                    "body_image": payload.body_image[:50] + "..." if payload.body_image and len(payload.body_image) > 50 else payload.body_image,
                })
        except Exception:
            # Continuar permitiendo la configuración aun si el token no está presente
            pass

    return UserProfileSetupResponse(
        status="success",
        message="Perfil configurado correctamente",
        full_name=payload.full_name,
        age=payload.age,
    )
