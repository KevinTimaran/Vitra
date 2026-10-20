from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from app.schemas.colorimetry import ColorimetryRequest, ColorimetryResponse, ColorimetryData
from app.services.gemini_service import analyze_colorimetry

router = APIRouter()


@router.post("/analyze", response_model=ColorimetryResponse)
async def analyze_user_colorimetry(request: Request):
    """
    Analiza la fotografía facial o frontal del usuario para extraer su colorimetría estacional:
    - Tono de piel, color de cabello y ojos.
    - Estación de color (ej. Invierno Brillante, Otoño Cálido, etc.).
    - Paleta de códigos HEX recomendados y colores a evitar.
    """
    content_type = request.headers.get("content-type", "")

    # Caso 1: JSON
    if "application/json" in content_type:
        try:
            body = await request.json()
            colorimetry_req = ColorimetryRequest(**body)
            image_str = colorimetry_req.get_image()
        except ValueError as ve:
            return JSONResponse(status_code=400, content={"success": False, "error": str(ve)})
        except Exception as e:
            return JSONResponse(status_code=400, content={"success": False, "error": f"JSON inválido: {str(e)}"})

        try:
            result = await analyze_colorimetry(image_str)
            return ColorimetryResponse(success=True, data=ColorimetryData(**result))
        except HTTPException as he:
            return JSONResponse(status_code=he.status_code, content={"success": False, "error": he.detail})
        except Exception as e:
            return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

    # Caso 2: Multipart/form-data
    if "multipart/form-data" in content_type:
        try:
            form = await request.form()
        except Exception as e:
            return JSONResponse(status_code=400, content={"success": False, "error": f"Error en formulario: {str(e)}"})

        image_str = form.get("image") or form.get("image_data")
        file_obj = form.get("file")

        if file_obj and hasattr(file_obj, "read"):
            import base64
            contents = await file_obj.read()
            mime = getattr(file_obj, "content_type", "image/jpeg") or "image/jpeg"
            b64_str = base64.b64encode(contents).decode("utf-8")
            image_str = f"data:{mime};base64,{b64_str}"

        if not image_str or not isinstance(image_str, str):
            return JSONResponse(status_code=400, content={"success": False, "error": "No se proporcionó imagen facial."})

        try:
            result = await analyze_colorimetry(image_str)
            return ColorimetryResponse(success=True, data=ColorimetryData(**result))
        except HTTPException as he:
            return JSONResponse(status_code=he.status_code, content={"success": False, "error": he.detail})
        except Exception as e:
            return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

    return JSONResponse(
        status_code=400,
        content={"success": False, "error": "Content-Type debe ser 'application/json' o 'multipart/form-data'."}
    )
