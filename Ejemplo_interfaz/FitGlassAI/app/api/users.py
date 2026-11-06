import asyncio
import logging
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.schemas.user import (
    UserProfileSetup,
    UserProfileSetupResponse,
    ColorimetryUpdateRequest,
    ColorimetryUpdateResponse,
)
from app.services.auth_service import decode_access_token
from app.api.auth import users_db, save_users_db
from app.services.optimizer_service import get_or_create_optimized_default_avatar
from app.api.avatar import _resolve_base_url, _execute_avatar_generation

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer(auto_error=False)


def get_default_base_garments(gender: Optional[str] = None) -> List[Dict[str, Any]]:
    """Genera las prendas base de alta costura atelier asignadas automáticamente al avatar."""
    is_male = bool(gender and gender.strip().lower() == "male")
    return [
        {
            "id": "base-top-1",
            "name": "Classic Heavyweight Tee" if is_male else "Atelier Silk Crewneck",
            "category": "Tops",
            "colorName": "Obsidian Black",
            "colorHex": "#18181B",
            "size": "M",
            "fit": "Regular",
            "silhouetteType": "tshirt",
            "paletteHarmony": True,
            "imageUrl": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
        },
        {
            "id": "base-bottom-1",
            "name": "Tailored Straight Trousers" if is_male else "High-Rise Atelier Pants",
            "category": "Pants",
            "colorName": "Slate Graphite",
            "colorHex": "#27272A",
            "size": "M",
            "fit": "Regular",
            "silhouetteType": "trousers",
            "paletteHarmony": True,
            "imageUrl": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80",
        },
    ]


@router.post("/profile/setup", response_model=UserProfileSetupResponse, status_code=status.HTTP_200_OK)
async def setup_user_profile(
    payload: UserProfileSetup,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Configuración de perfil y avatar de usuario:
    - Flow 1 (Custom): Si se envía body_image, genera el avatar 3D personalizado vía Tripo3D + optimización mesh.
    - Flow 2 (Skip): Si el usuario omitió la fotografía, asigna el avatar por defecto correspondiente al género
      (default_girl.glb o default_men.glb) procesado obligatoriamente por la canalización de optimización 3D.
    - Asigna las prendas base predeterminadas y persiste el avatar_url resultante en la base de datos de usuarios.
    """
    base_url = _resolve_base_url(request)
    user_email = None

    if credentials:
        try:
            token_data = decode_access_token(credentials.credentials)
            user_email = token_data.get("sub") or token_data.get("email")
        except Exception as e:
            logger.warning(f"[Users] Token de autorización no decodificado: {e}")

    gender_val = payload.gender or "female"

    color_profile = None

    # Guardrail con Gemini Vision: inspeccionar respuesta de colorimetría inmediatamente tras retornar
    if payload.face_image and payload.face_image.strip():
        from app.services.gemini_service import analyze_colorimetry
        color_res = None
        try:
            color_res = await analyze_colorimetry(payload.face_image.strip())
        except HTTPException as he:
            if he.status_code == 400:
                raise he
            logger.warning(f"[Users] Advertencia HTTP en colorimetría facial durante setup: {he.detail}")
        except Exception as c_err:
            logger.warning(f"[Users] Advertencia en colorimetría facial durante setup: {c_err}")

        if isinstance(color_res, dict):
            is_valid = color_res.get("is_valid_image", True)
            if is_valid is False or str(is_valid).lower() in ("false", "0"):
                err_msg = color_res.get("validation_error_message") or "Esta imagen no parece ser de una persona. Por favor sube una foto tuya."
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
            if "season" in color_res:
                color_profile = color_res
    elif payload.body_image and payload.body_image.strip():
        # Si omitió foto facial pero suministró foto corporal, validar que sea humana antes de invocar Tripo3D
        from app.services.gemini_service import analyze_colorimetry
        body_res = None
        try:
            body_res = await analyze_colorimetry(payload.body_image.strip())
        except HTTPException as he:
            if he.status_code == 400:
                raise he
            logger.warning(f"[Users] Advertencia HTTP al validar foto corporal durante setup: {he.detail}")
        except Exception as b_err:
            logger.warning(f"[Users] Advertencia al validar foto corporal durante setup: {b_err}")

        if isinstance(body_res, dict):
            is_valid = body_res.get("is_valid_image", True)
            if is_valid is False or str(is_valid).lower() in ("false", "0"):
                err_msg = body_res.get("validation_error_message") or "Esta imagen no parece ser de una persona. Por favor sube una foto tuya."
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
            if "season" in body_res:
                color_profile = body_res

    async def _generate_avatar_task() -> Tuple[Optional[str], str]:
        # FLOW 1: Creación de Avatar Personalizado si se suministró body_image
        if payload.body_image and payload.body_image.strip():
            logger.info(f"[Users] [Flow 1] Creando avatar 3D personalizado para: {user_email or payload.full_name}...")
            try:
                gen_url = await _execute_avatar_generation(payload.body_image, base_url)
                logger.info(f"[Users] [Flow 1] Avatar 3D personalizado generado con éxito: {gen_url}")
                return gen_url, "custom_3d"
            except Exception as gen_err:
                logger.warning(
                    f"[Users] [Flow 1] Falló generación con Tripo3D ({gen_err}). Usando avatar optimizado por defecto como fallback seguro."
                )
                fallback_url = await get_or_create_optimized_default_avatar(gender_val, base_url)
                return fallback_url, "preset"
        else:
            # FLOW 2: Omitir fotos y Asignar Avatar por Defecto según Género
            logger.info(
                f"[Users] [Flow 2] Usuario omitió fotos. Asignando avatar 3D por defecto optimizado para género '{gender_val}'..."
            )
            fallback_url = await get_or_create_optimized_default_avatar(gender_val, base_url)
            return fallback_url, "preset"

    avatar_res = await _generate_avatar_task()
    avatar_url, avatar_type = avatar_res
    base_garments = get_default_base_garments(gender_val)

    # Persistencia en base de datos de usuario
    if user_email:
        user_key = user_email.lower()
        if user_key not in users_db:
            users_db[user_key] = {"email": user_email}
        users_db[user_key].update({
            "name": payload.full_name,
            "age": payload.age,
            "gender": gender_val,
            "avatar_url": avatar_url,
            "avatar_type": avatar_type,
            "base_garments": base_garments,
            "color_profile": color_profile,
            "face_image": payload.face_image[:50] + "..." if payload.face_image and len(payload.face_image) > 50 else payload.face_image,
            "body_image": payload.body_image[:50] + "..." if payload.body_image and len(payload.body_image) > 50 else payload.body_image,
        })
        save_users_db()
        logger.info(f"[Users] Registro de base de datos actualizado para {user_email} con avatar_url: {avatar_url}")

    return UserProfileSetupResponse(
        status="success",
        message="Perfil configurado correctamente",
        full_name=payload.full_name,
        age=payload.age,
        gender=gender_val,
        avatar_url=avatar_url,
        avatar_type=avatar_type,
        base_garments=base_garments,
        color_profile=color_profile,
    )


@router.put("/avatar", status_code=status.HTTP_200_OK)
@router.post("/avatar", status_code=status.HTTP_200_OK)
async def update_user_avatar(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    FLOW 3: Actualización de Avatar desde Ajustes / Perfil (Post-Registro).
    Recibe la nueva fotografía corporal (JSON o Multipart), regenera el modelo 3D optimizado
    y actualiza de inmediato el registro del usuario en la base de datos.
    """
    base_url = _resolve_base_url(request)
    user_email = None

    if credentials:
        try:
            token_data = decode_access_token(credentials.credentials)
            user_email = token_data.get("sub") or token_data.get("email")
        except Exception:
            pass

    content_type = request.headers.get("content-type", "")
    image_str = None

    if "application/json" in content_type:
        body = await request.json()
        image_str = body.get("image") or body.get("body_image") or body.get("image_data")
    elif "multipart/form-data" in content_type:
        form = await request.form()
        image_str = form.get("image") or form.get("body_image") or form.get("image_data")
        file_obj = form.get("file")
        if file_obj and hasattr(file_obj, "read"):
            import base64
            contents = await file_obj.read()
            mime = getattr(file_obj, "content_type", "image/jpeg") or "image/jpeg"
            b64_str = base64.b64encode(contents).decode("utf-8")
            image_str = f"data:{mime};base64,{b64_str}"

    if not image_str or not isinstance(image_str, str) or not image_str.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere fotografía de cuerpo entero para actualizar el avatar 3D."
        )

    logger.info(f"[Users] [Flow 3] Actualizando avatar 3D desde Ajustes/Perfil para usuario: {user_email or 'anónimo'}...")
    new_avatar_url = await _execute_avatar_generation(image_str, base_url)

    if user_email and user_email.lower() in users_db:
        users_db[user_email.lower()].update({
            "avatar_url": new_avatar_url,
            "avatar_type": "custom_3d",
        })
        save_users_db()
        logger.info(f"[Users] [Flow 3] Base de datos actualizada con nuevo avatar_url: {new_avatar_url}")

    return {
        "status": "success",
        "message": "Avatar 3D actualizado exitosamente",
        "avatar_url": new_avatar_url,
        "avatar_type": "custom_3d",
    }


@router.delete("/avatar", status_code=status.HTTP_200_OK)
async def delete_user_avatar(
    request: Request = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Desvincula o elimina el avatar 3D personalizado activo del usuario en la base de datos,
    restableciendo el avatar a silueta predeterminada (preset).
    """
    user_email = None
    if credentials:
        try:
            token_data = decode_access_token(credentials.credentials)
            user_email = token_data.get("sub") or token_data.get("email")
        except Exception:
            pass

    default_url = None
    if user_email and user_email.lower() in users_db:
        user_gender = users_db[user_email.lower()].get("gender", "female")
        base_url = _resolve_base_url(request)
        default_url = await get_or_create_optimized_default_avatar(user_gender, base_url)
        users_db[user_email.lower()]["avatar_url"] = default_url
        users_db[user_email.lower()]["avatar_type"] = "preset"
        save_users_db()
        logger.info(f"[Users] Avatar personalizado restablecido a preset ({default_url}) para {user_email}")

    return {
        "status": "deleted",
        "message": "Avatar 3D personalizado eliminado. Se ha restablecido la silueta predeterminada.",
        "avatar_type": "preset",
        "avatar_url": default_url,
    }


@router.put("/colorimetry", response_model=ColorimetryUpdateResponse, status_code=status.HTTP_200_OK)
@router.post("/colorimetry", response_model=ColorimetryUpdateResponse, status_code=status.HTTP_200_OK)
async def update_user_colorimetry(
    payload: ColorimetryUpdateRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Actualiza o recalibra el perfil de colorimetría estacional del usuario autenticado.
    Acepta un `color_profile` precalculado o una imagen facial (`image`/`face_image`) para
    analizarla en tiempo real mediante Gemini Vision y persistirla en la base de datos.
    """
    user_email = None
    if credentials:
        try:
            token_data = decode_access_token(credentials.credentials)
            user_email = token_data.get("sub") or token_data.get("email")
        except Exception as te:
            logger.warning(f"[Users] Token inválido en actualización de colorimetría: {te}")

    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticación para actualizar el perfil de colorimetría.",
        )

    user_key = user_email.lower()
    if user_key not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado en la base de datos.",
        )

    final_color_profile = None

    # Caso 1: Se proporcionó un perfil precalculado
    if payload.color_profile:
        final_color_profile = payload.color_profile

    # Caso 2: Se proporcionó una imagen para analizar con Gemini Vision
    img_to_analyze = payload.image or payload.face_image
    if not final_color_profile and img_to_analyze and img_to_analyze.strip():
        from app.services.gemini_service import analyze_colorimetry
        try:
            final_color_profile = await analyze_colorimetry(img_to_analyze.strip())
        except HTTPException:
            raise
        except Exception as ge:
            logger.error(f"[Users] Error analizando colorimetría con Gemini Vision: {ge}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error al analizar la imagen con Gemini Vision: {str(ge)}",
            )

        if isinstance(final_color_profile, dict):
            is_valid = final_color_profile.get("is_valid_image", True)
            if is_valid is False or str(is_valid).lower() in ("false", "0"):
                err_msg = final_color_profile.get("validation_error_message") or "Esta imagen no parece ser de una persona. Por favor sube una foto tuya."
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=err_msg,
                )

    if not final_color_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes proporcionar 'color_profile' o una imagen facial ('image'/'face_image') para analizar.",
        )

    # Persistir en la base de datos del usuario
    users_db[user_key]["color_profile"] = final_color_profile
    save_users_db()
    logger.info(f"[Users] Colorimetría estacional actualizada para {user_email}: {final_color_profile.get('season')}")

    return ColorimetryUpdateResponse(
        status="success",
        message="Colorimetría estacional actualizada correctamente",
        color_profile=final_color_profile,
    )



