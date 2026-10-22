from fastapi import APIRouter, HTTPException, Request
from app.config import settings
from app.schemas.tryon import TryOnRequest, TryOnResponse
from app.services.replicate_service import generate_vton
from app.services.tripo_service import generate_3d_model
from app.services.optimizer_service import optimize_3d_model

router = APIRouter()


@router.post("/generate", response_model=TryOnResponse)
async def generate_tryon(payload: TryOnRequest, request: Request = None) -> TryOnResponse:
    """
    Pipeline de orquestación del Probador Virtual (Virtual Try-On):
    1. Fusión 2D (VTON): envía la imagen del usuario y la prenda a Replicate (IDM-VTON).
    2. Extrusión 3D: con la imagen 2D resultante, genera el modelo 3D (.glb) mediante Tripo3D.
    3. Optimización 3D: comprime la malla y texturas para alto rendimiento móvil.
    4. Retorna las URLs resultantes y el estado completado.
    """
    SAMPLE_3D_MODEL_FALLBACK = (
        f"{settings.EXPO_PUBLIC_API_BASE_URL.rstrip('/')}/static/models/tshirt.glb"
        if settings.EXPO_PUBLIC_API_BASE_URL
        else "https://fitglass-ai-kevin.loca.lt/static/models/tshirt.glb"
    )

    image_2d_url = None
    model_3d_url = None

    try:
        # Paso 1: Generar la imagen 2D fusionada
        try:
            image_2d_url = await generate_vton(
                human_image_url=payload.human_image,
                garment_image_url=payload.garment_image,
                category=payload.category or "upper_body",
                garment_description=payload.garment_description or "clothing",
            )
        except Exception as vton_err:
            if payload.allow_fallback:
                # Si falla VTON con allow_fallback, usar la imagen de la persona o prenda
                image_2d_url = payload.human_image or payload.garment_image
            else:
                raise

        if not image_2d_url:
            if payload.allow_fallback:
                image_2d_url = payload.human_image or payload.garment_image
            else:
                raise HTTPException(
                    status_code=502,
                    detail="El servicio VTON no generó una URL de imagen válida."
                )

        # Paso 2: Generar el modelo 3D a partir de la imagen 2D fusionada
        try:
            model_3d_url = await generate_3d_model(image_url=image_2d_url)
        except Exception as tripo_err:
            if payload.allow_fallback:
                # Si Tripo3D no tiene créditos o falla, aplicar modelo de respaldo sin romper la UX
                model_3d_url = SAMPLE_3D_MODEL_FALLBACK
            else:
                raise

        if not model_3d_url:
            if payload.allow_fallback:
                model_3d_url = SAMPLE_3D_MODEL_FALLBACK
            else:
                raise HTTPException(
                    status_code=502,
                    detail="El servicio Tripo3D no generó una URL de modelo 3D válida."
                )

        # Paso 3: Optimización automática del modelo 3D (Draco + WebP)
        base_url = None
        if request:
            forwarded_host = request.headers.get("x-forwarded-host")
            if forwarded_host:
                scheme = request.headers.get("x-forwarded-proto", "https")
                base_url = f"{scheme}://{forwarded_host}"
            elif request.base_url:
                base_url = str(request.base_url).rstrip("/")

        try:
            model_3d_url = await optimize_3d_model(model_3d_url, base_url=base_url)
        except Exception:
            # Mantener model_3d_url intacto como fallback ante cualquier eventualidad
            pass

        return TryOnResponse(
            image_2d_url=image_2d_url,
            model_3d_url=model_3d_url,
            status="completed",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en el pipeline del probador virtual: {str(e)}"
        )
