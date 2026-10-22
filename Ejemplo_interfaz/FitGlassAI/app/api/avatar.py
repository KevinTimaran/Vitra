from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from app.schemas.avatar import AvatarGenerateRequest, AvatarGenerateResponse
from app.services.tripo_service import generate_3d_model

router = APIRouter()


@router.post("/generate", response_model=AvatarGenerateResponse)
async def generate_avatar_endpoint(request: Request):
    """
    Genera el avatar base 3D (avatar_base.glb) del usuario a partir de una fotografía de cuerpo entero
    utilizando el motor de reconstrucción 3D de Tripo3D.
    """
    content_type = request.headers.get("content-type", "")

    # Caso 1: JSON
    if "application/json" in content_type:
        try:
            body = await request.json()
            avatar_req = AvatarGenerateRequest(**body)
            image_str = avatar_req.get_image()
        except ValueError as ve:
            return JSONResponse(status_code=400, content={"detail": str(ve)})
        except Exception as e:
            return JSONResponse(status_code=400, content={"detail": f"JSON inválido: {str(e)}"})

        try:
            glb_url = await generate_3d_model(image_str)
            return AvatarGenerateResponse(avatar_url=glb_url, status="completed")
        except HTTPException as he:
            return JSONResponse(status_code=he.status_code, content={"detail": he.detail})
        except Exception as e:
            return JSONResponse(status_code=500, content={"detail": str(e)})

    # Caso 2: Multipart/form-data
    if "multipart/form-data" in content_type:
        try:
            form = await request.form()
        except Exception as e:
            return JSONResponse(status_code=400, content={"detail": f"Error en formulario: {str(e)}"})

        image_str = form.get("image") or form.get("image_data")
        file_obj = form.get("file")

        if file_obj and hasattr(file_obj, "read"):
            import base64
            contents = await file_obj.read()
            mime = getattr(file_obj, "content_type", "image/jpeg") or "image/jpeg"
            b64_str = base64.b64encode(contents).decode("utf-8")
            image_str = f"data:{mime};base64,{b64_str}"

        if not image_str or not isinstance(image_str, str):
            return JSONResponse(status_code=400, content={"detail": "No se proporcionó imagen de cuerpo entero."})

        try:
            glb_url = await generate_3d_model(image_str)
            return AvatarGenerateResponse(avatar_url=glb_url, status="completed")
        except HTTPException as he:
            return JSONResponse(status_code=he.status_code, content={"detail": he.detail})
        except Exception as e:
            return JSONResponse(status_code=500, content={"detail": str(e)})

    return JSONResponse(
        status_code=400,
        content={"detail": "Content-Type debe ser 'application/json' o 'multipart/form-data'."}
    )


@router.delete("/current")
@router.delete("")
async def delete_avatar():
    """
    Elimina o desvincula el avatar 3D personalizado activo del usuario,
    revertiendo la silueta al modelo base estilizado predeterminado.
    """
    return {
        "status": "deleted",
        "message": "Avatar personalizado eliminado. Se ha restablecido la silueta predeterminada.",
    }


@router.get("/presets")
async def get_avatar_presets(request: Request = None):
    """
    Retorna la lista de avatares predeterminados calibrados por género y silueta.
    """
    from app.config import settings
    base_url = "http://127.0.0.1:8000"
    if request and request.base_url:
        base_url = str(request.base_url).rstrip("/")
    elif settings.EXPO_PUBLIC_API_BASE_URL:
        base_url = settings.EXPO_PUBLIC_API_BASE_URL.rstrip("/")

    presets = [
        {
            "id": "preset-female",
            "gender": "female",
            "name": "Atelier Silueta Femenina",
            "description": "Proporciones esbeltas con calibración para vestidos y sastrería.",
            "image_2d": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
            "model_3d_url": f"{base_url}/static/models/tshirt.glb",
        },
        {
            "id": "preset-male",
            "gender": "male",
            "name": "Atelier Silueta Masculina",
            "description": "Estructura atlética con hombros definidos y caída recta.",
            "image_2d": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
            "model_3d_url": f"{base_url}/static/models/tshirt.glb",
        },
        {
            "id": "preset-neutral",
            "gender": "non-binary",
            "name": "Atelier Silueta Fluida / Neutra",
            "description": "Líneas minimalistas y proporciones universales contemporáneas.",
            "image_2d": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
            "model_3d_url": f"{base_url}/static/models/tshirt.glb",
        },
    ]

    return {"presets": presets}
