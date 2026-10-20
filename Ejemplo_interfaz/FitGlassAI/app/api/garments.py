from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from app.schemas.garment import GarmentAnalysisResponse, GarmentAnalysisRequest
from app.services.gemini_service import analyze_garment_image, analyze_garment

router = APIRouter()

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/analyze", response_model=GarmentAnalysisResponse)
async def analyze_garment_endpoint(request: Request):
    """
    Endpoint para análisis de prendas:
    - Acepta JSON con 'image' o 'image_data' (Base64 o URL) e invoca analyze_garment.
    - Acepta multipart/form-data con archivo 'file' para compatibilidad nativa.
    """
    content_type = request.headers.get("content-type", "")

    # Caso 1: JSON con Base64 o URL
    if "application/json" in content_type:
        try:
            body = await request.json()
            analysis_req = GarmentAnalysisRequest(**body)
            image_str = analysis_req.get_image()
        except ValueError as ve:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": str(ve)}
            )
        except Exception as e:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"JSON inválido o malformado: {str(e)}"}
            )

        try:
            metadata = await analyze_garment(image_str)
            return GarmentAnalysisResponse(success=True, data=metadata)
        except HTTPException as he:
            return JSONResponse(
                status_code=he.status_code,
                content={"success": False, "error": he.detail}
            )
        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": str(e)}
            )

    # Caso 2: Multipart/form-data
    if "multipart/form-data" in content_type:
        try:
            form = await request.form()
        except Exception as e:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"Error al procesar formulario multipart: {str(e)}"}
            )

        file_obj = form.get("file")
        if file_obj and hasattr(file_obj, "read"):
            file: UploadFile = file_obj
            if file.content_type not in ALLOWED_MIME_TYPES:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": f"Formato no soportado. Permitidos: {ALLOWED_MIME_TYPES}"}
                )
                
            contents = await file.read()
            if not contents:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "El archivo está vacío."}
                )
                
            if len(contents) > MAX_FILE_SIZE:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "El archivo es demasiado grande. Máximo 10MB."}
                )
                
            try:
                analysis = analyze_garment_image(contents, file.content_type)
                return GarmentAnalysisResponse(success=True, data=analysis)
            except ValueError as ve:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "error": str(ve)}
                )
            except Exception as e:
                return JSONResponse(
                    status_code=500,
                    content={"success": False, "error": "Error interno del servidor al procesar la imagen."}
                )

        image_str = form.get("image") or form.get("image_data")
        if image_str and isinstance(image_str, str):
            try:
                metadata = await analyze_garment(image_str)
                return GarmentAnalysisResponse(success=True, data=metadata)
            except HTTPException as he:
                return JSONResponse(
                    status_code=he.status_code,
                    content={"success": False, "error": he.detail}
                )
            except Exception as e:
                return JSONResponse(
                    status_code=500,
                    content={"success": False, "error": str(e)}
                )

        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No se proporcionó ningún archivo o imagen en el formulario."}
        )

    return JSONResponse(
        status_code=400,
        content={"success": False, "error": "Content-Type debe ser 'application/json' o 'multipart/form-data'."}
    )
