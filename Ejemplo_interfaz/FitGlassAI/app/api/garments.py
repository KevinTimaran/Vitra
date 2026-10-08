from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.schemas.garment import GarmentAnalysisResponse
from app.services.gemini_service import analyze_garment_image

router = APIRouter()

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/analyze", response_model=GarmentAnalysisResponse)
async def analyze_garment(file: UploadFile = File(...)):
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
