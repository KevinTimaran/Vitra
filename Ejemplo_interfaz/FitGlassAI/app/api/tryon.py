import logging
import traceback
from fastapi import APIRouter, HTTPException, Request
from app.config import settings
from app.schemas.tryon import TryOnRequest, TryOnResponse
from app.services.replicate_service import generate_vton
from app.services.tripo_service import generate_3d_model
from app.services.optimizer_service import optimize_3d_model

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/generate", response_model=TryOnResponse)
async def generate_tryon(payload: TryOnRequest, request: Request = None) -> TryOnResponse:
    """
    Pipeline de orquestación del Probador Virtual (Virtual Try-On):
    1. Auditoría de entrada (human_image, garment_image).
    2. Fusión 2D (VTON): envía human_image y garment_image a Replicate (IDM-VTON).
    3. Extrusión 3D (Tripo3D): toma la image_2d_url resultante del VTON y genera el .glb.
    4. Optimización 3D: comprime malla y texturas (gltf-transform Draco + WebP).
    5. Retorna las URLs resultantes con trazabilidad completa de errores (VTON vs Tripo3D).
    """
    logger.info("=" * 70)
    logger.info("[TryOn Pipeline] >>> NUEVA SOLICITUD DE PROBADOR VIRTUAL RECIBIDA <<<")
    logger.info(f"  • Categoría: {payload.category}")
    logger.info(f"  • Descripción prenda: {payload.garment_description}")
    logger.info(f"  • allow_fallback: {payload.allow_fallback}")
    logger.info(f"  • human_image: {type(payload.human_image).__name__} (len={len(payload.human_image or '')}) -> {str(payload.human_image)[:80]}...")
    logger.info(f"  • garment_image: {type(payload.garment_image).__name__} (len={len(payload.garment_image or '')}) -> {str(payload.garment_image)[:80]}...")
    logger.info("=" * 70)

    # Validación de entradas obligatorias
    if not payload.human_image or not payload.human_image.strip():
        logger.error("[TryOn Pipeline] ERROR: human_image está vacía o nula.")
        raise HTTPException(
            status_code=400,
            detail="La imagen de la persona (human_image) es obligatoria."
        )

    if not payload.garment_image or not payload.garment_image.strip():
        logger.error("[TryOn Pipeline] ERROR: garment_image está vacía o nula.")
        raise HTTPException(
            status_code=400,
            detail="La imagen de la prenda (garment_image) es obligatoria."
        )

    image_2d_url = None
    model_3d_url = None

    # -------------------------------------------------------------------------
    # PASO 1: Fusión 2D Virtual Try-On (Replicate IDM-VTON)
    # -------------------------------------------------------------------------
    logger.info("[TryOn Pipeline] [PASO 1/3] Iniciando fusión 2D con Replicate IDM-VTON...")
    logger.info(f"  -> Input human_image: {payload.human_image[:80]}...")
    logger.info(f"  -> Input garment_image: {payload.garment_image[:80]}...")

    try:
        image_2d_url = await generate_vton(
            human_image_url=payload.human_image.strip(),
            garment_image_url=payload.garment_image.strip(),
            category=payload.category or "upper_body",
            garment_description=payload.garment_description or "clothing",
        )
        logger.info(f"[TryOn Pipeline] [PASO 1/3 ÉXITO] URL 2D fusionada de Replicate: {image_2d_url}")

    except Exception as vton_err:
        vton_tb = traceback.format_exc()
        status_code = vton_err.status_code if isinstance(vton_err, HTTPException) else 502
        err_msg = vton_err.detail if isinstance(vton_err, HTTPException) else str(vton_err)

        logger.error(
            f"\n{'!' * 70}\n"
            f"[TryOn Pipeline - PASO 1 FALLÓ: REPLICATE VTON ERROR]\n"
            f"Tipo de excepción: {type(vton_err).__name__}\n"
            f"Código HTTP original: {status_code}\n"
            f"Mensaje original de la API: {err_msg}\n"
            f"Traceback completo:\n{vton_tb}"
            f"{'!' * 70}\n"
        )

        if payload.allow_fallback:
            image_2d_url = payload.human_image or payload.garment_image
            logger.warning(
                f"[TryOn Pipeline] [PASO 1 FALLBACK ACTIVO] allow_fallback=True. "
                f"Continuando con imagen de respaldo hacia 3D: {image_2d_url[:80]}..."
            )
        else:
            raise HTTPException(
                status_code=status_code,
                detail=f"[Replicate VTON Error] {err_msg}"
            )

    # Verificación de que image_2d_url no esté vacía ni sea un string inválido
    if not image_2d_url or not str(image_2d_url).strip():
        err_msg = "[Replicate VTON Error] El servicio VTON no generó una URL de imagen válida."
        logger.error(f"[TryOn Pipeline] ERROR: {err_msg}")
        raise HTTPException(
            status_code=502,
            detail=err_msg
        )

    # -------------------------------------------------------------------------
    # PASO 2: Extrusión 3D con Tripo3D (image_to_model)
    # -------------------------------------------------------------------------
    logger.info("[TryOn Pipeline] [PASO 2/3] Conectando con Tripo3D para generar modelo 3D...")
    logger.info(f"  -> Input para Tripo3D (image_2d_url capturada del VTON): {image_2d_url}")

    try:
        model_3d_url = await generate_3d_model(image_url=image_2d_url.strip())
        logger.info(f"[TryOn Pipeline] [PASO 2/3 ÉXITO] Modelo 3D (.glb) obtenido de Tripo3D: {model_3d_url}")

    except Exception as tripo_err:
        tripo_tb = traceback.format_exc()
        status_code = tripo_err.status_code if isinstance(tripo_err, HTTPException) else 502
        err_msg = tripo_err.detail if isinstance(tripo_err, HTTPException) else str(tripo_err)

        logger.error(
            f"\n{'!' * 70}\n"
            f"[TryOn Pipeline - PASO 2 FALLÓ: TRIPO3D ERROR]\n"
            f"Tipo de excepción: {type(tripo_err).__name__}\n"
            f"Código HTTP original: {status_code}\n"
            f"Mensaje original de la API: {err_msg}\n"
            f"Traceback completo:\n{tripo_tb}"
            f"{'!' * 70}\n"
        )
        raise HTTPException(
            status_code=status_code,
            detail=f"[Tripo3D Error] {err_msg}"
        )

    if not model_3d_url or not str(model_3d_url).strip():
        err_msg = "[Tripo3D Error] El servicio Tripo3D no generó una URL de modelo 3D válida."
        logger.error(f"[TryOn Pipeline] ERROR: {err_msg}")
        raise HTTPException(
            status_code=502,
            detail=err_msg
        )

    # -------------------------------------------------------------------------
    # PASO 3: Optimización del Modelo 3D (Draco + WebP)
    # -------------------------------------------------------------------------
    base_url = None
    if request:
        forwarded_host = request.headers.get("x-forwarded-host")
        if forwarded_host:
            scheme = request.headers.get("x-forwarded-proto", "https")
            base_url = f"{scheme}://{forwarded_host}"
        elif request.base_url:
            base_url = str(request.base_url).rstrip("/")

    logger.info(f"[TryOn Pipeline] [PASO 3/3] Iniciando optimización 3D móvil (base_url={base_url})...")
    try:
        model_3d_url = await optimize_3d_model(model_3d_url, base_url=base_url)
        logger.info(f"[TryOn Pipeline] [PASO 3/3 ÉXITO] Modelo 3D optimizado: {model_3d_url}")
    except Exception as opt_err:
        logger.warning(
            f"[TryOn Pipeline] [PASO 3/3 AVISO] Falló la optimización 3D ({opt_err}). "
            f"Se mantendrá el modelo original de Tripo3D: {model_3d_url}"
        )

    logger.info("=" * 70)
    logger.info("[TryOn Pipeline] >>> PIPELINE VTON A 3D COMPLETADO CON ÉXITO <<<")
    logger.info(f"  • image_2d_url: {image_2d_url}")
    logger.info(f"  • model_3d_url: {model_3d_url}")
    logger.info("=" * 70)

    return TryOnResponse(
        image_2d_url=image_2d_url,
        model_3d_url=model_3d_url,
        status="completed",
    )
