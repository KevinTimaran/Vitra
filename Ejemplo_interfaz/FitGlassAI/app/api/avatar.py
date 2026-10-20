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
