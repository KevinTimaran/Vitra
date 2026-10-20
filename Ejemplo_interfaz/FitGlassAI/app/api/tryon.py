from fastapi import APIRouter, HTTPException
from app.schemas.tryon import TryOnRequest, TryOnResponse
from app.services.replicate_service import generate_vton
from app.services.tripo_service import generate_3d_model

router = APIRouter()


@router.post("/generate", response_model=TryOnResponse)
async def generate_tryon(payload: TryOnRequest) -> TryOnResponse:
    """
    Pipeline de orquestación del Probador Virtual (Virtual Try-On):
    1. Fusión 2D (VTON): envía la imagen del usuario y la prenda a Replicate (IDM-VTON).
    2. Extrusión 3D: con la imagen 2D resultante, genera el modelo 3D (.glb) mediante Tripo3D.
    3. Retorna las URLs resultantes y el estado completado.
    """
    try:
        # Paso 1: Generar la imagen 2D fusionada
        image_2d_url = await generate_vton(
            human_image_url=payload.human_image,
            garment_image_url=payload.garment_image,
            category=payload.category or "upper_body",
            garment_description=payload.garment_description or "clothing",
        )

        if not image_2d_url:
            raise HTTPException(
                status_code=502,
                detail="El servicio VTON no generó una URL de imagen válida."
            )

        # Paso 2: Generar el modelo 3D a partir de la imagen 2D fusionada
        model_3d_url = await generate_3d_model(image_url=image_2d_url)

        if not model_3d_url:
            raise HTTPException(
                status_code=502,
                detail="El servicio Tripo3D no generó una URL de modelo 3D válida."
            )

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
