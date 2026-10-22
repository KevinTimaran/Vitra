import os
import uuid
import time
import asyncio
import logging
import traceback
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Request
from app.config import settings
from app.schemas.tryon import TryOnRequest, TryOnResponse
from app.services.replicate_service import generate_vton
from app.services.tripo_service import generate_3d_model
from app.services.optimizer_service import optimize_3d_model, STATIC_MODELS_DIR

logger = logging.getLogger(__name__)

router = APIRouter()

# Almacén en memoria de tareas asíncronas para polling
_async_tasks: Dict[str, Dict[str, Any]] = {}


def _resolve_base_url(request: Optional[Request] = None) -> str:
    if request:
        forwarded_host = request.headers.get("x-forwarded-host")
        if forwarded_host:
            scheme = request.headers.get("x-forwarded-proto", "https")
            return f"{scheme}://{forwarded_host}"
        if request.base_url:
            return str(request.base_url).rstrip("/")
    if settings.EXPO_PUBLIC_API_BASE_URL:
        return settings.EXPO_PUBLIC_API_BASE_URL.rstrip("/")
    return "http://127.0.0.1:8000"


@router.get("/latest")
async def get_latest_model(request: Request = None):
    """
    Retorna la URL del modelo 3D (.glb) generado y optimizado más recientemente en el servidor.
    Permite recuperar de inmediato el modelo creado si una conexión HTTP fue cortada por timeout
    de red externa o túnel.
    """
    base_url = _resolve_base_url(request)

    if not os.path.exists(STATIC_MODELS_DIR):
        raise HTTPException(status_code=404, detail="Directorio de modelos no encontrado.")

    candidates = []
    for f in os.listdir(STATIC_MODELS_DIR):
        if f.endswith(".glb") and not f.startswith("tshirt"):
            full_path = os.path.join(STATIC_MODELS_DIR, f)
            try:
                st = os.stat(full_path)
                # Solo modelos reales (> 100 KB para descartar mocks o archivos incompletos)
                if st.st_size > 100_000:
                    candidates.append((st.st_mtime, f, st.st_size))
            except OSError:
                pass

    if not candidates:
        raise HTTPException(status_code=404, detail="No hay modelos 3D generados recientemente.")

    candidates.sort(key=lambda x: x[0], reverse=True)
    latest_mtime, latest_filename, latest_size = candidates[0]
    model_url = f"{base_url}/static/models/{latest_filename}"

    logger.info(f"[TryOn Latest] Retornando modelo más reciente: {model_url} ({latest_size} bytes)")
    return {
        "model_3d_url": model_url,
        "filename": latest_filename,
        "size_bytes": latest_size,
        "updated_at": latest_mtime,
    }


async def _execute_tryon_pipeline(
    human_image: str,
    garment_image: str,
    category: str = "upper_body",
    garment_description: str = "clothing",
    allow_fallback: bool = False,
    base_url: Optional[str] = None,
    task_id: Optional[str] = None,
) -> tuple[str, str]:
    """Ejecuta el pipeline completo VTON -> Tripo3D -> Optimización."""
    # Validación de entradas obligatorias
    if not human_image or not human_image.strip():
        logger.error("[TryOn Pipeline] ERROR: human_image está vacía o nula.")
        raise HTTPException(
            status_code=400,
            detail="La imagen de la persona (human_image) es obligatoria."
        )

    if not garment_image or not garment_image.strip():
        logger.error("[TryOn Pipeline] ERROR: garment_image está vacía o nula.")
        raise HTTPException(
            status_code=400,
            detail="La imagen de la prenda (garment_image) es obligatoria."
        )

    # -------------------------------------------------------------------------
    # PASO 1: Fusión 2D Virtual Try-On (Replicate IDM-VTON)
    # -------------------------------------------------------------------------
    if task_id and task_id in _async_tasks:
        _async_tasks[task_id].update({"step": "vton", "progress": 0.25})

    logger.info("[TryOn Pipeline] [PASO 1/3] Iniciando fusión 2D con Replicate IDM-VTON...")
    image_2d_url = None
    try:
        image_2d_url = await generate_vton(
            human_image_url=human_image.strip(),
            garment_image_url=garment_image.strip(),
            category=category or "upper_body",
            garment_description=garment_description or "clothing",
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

        if allow_fallback:
            image_2d_url = garment_image or human_image
            logger.warning(
                f"[TryOn Pipeline] [PASO 1 FALLBACK ACTIVO] allow_fallback=True. "
                f"Continuando con imagen de respaldo hacia 3D: {image_2d_url[:80]}..."
            )
        else:
            raise HTTPException(
                status_code=status_code,
                detail=f"[Replicate VTON Error] {err_msg}"
            )

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
    if task_id and task_id in _async_tasks:
        _async_tasks[task_id].update({"step": "tripo3d", "progress": 0.60, "image_2d_url": image_2d_url})

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
    if task_id and task_id in _async_tasks:
        _async_tasks[task_id].update({"step": "optimizing", "progress": 0.85})

    logger.info(f"[TryOn Pipeline] [PASO 3/3] Iniciando optimización 3D móvil (base_url={base_url})...")
    try:
        model_3d_url = await optimize_3d_model(model_3d_url, base_url=base_url)
        logger.info(f"[TryOn Pipeline] [PASO 3/3 ÉXITO] Modelo 3D optimizado: {model_3d_url}")
    except Exception as opt_err:
        logger.warning(
            f"[TryOn Pipeline] [PASO 3/3 AVISO] Falló la optimización 3D ({opt_err}). "
            f"Se mantendrá el modelo original de Tripo3D: {model_3d_url}"
        )

    return image_2d_url, model_3d_url


@router.post("/generate", response_model=TryOnResponse)
async def generate_tryon(payload: TryOnRequest, request: Request = None) -> TryOnResponse:
    """
    Pipeline síncrono del Probador Virtual (Virtual Try-On):
    1. Auditoría de entrada (human_image, garment_image).
    2. Fusión 2D (VTON): envía human_image y garment_image a Replicate (IDM-VTON).
    3. Extrusión 3D (Tripo3D): toma la image_2d_url resultante del VTON y genera el .glb.
    4. Optimización 3D: comprime malla y texturas.
    5. Retorna las URLs resultantes con trazabilidad completa.
    """
    base_url = _resolve_base_url(request)

    logger.info("=" * 70)
    logger.info("[TryOn Pipeline] >>> NUEVA SOLICITUD DE PROBADOR VIRTUAL RECIBIDA <<<")
    logger.info(f"  • Categoría: {payload.category}")
    logger.info(f"  • Descripción prenda: {payload.garment_description}")
    logger.info(f"  • allow_fallback: {payload.allow_fallback}")
    logger.info(f"  • human_image: {type(payload.human_image).__name__} (len={len(payload.human_image or '')}) -> {str(payload.human_image)[:80]}...")
    logger.info(f"  • garment_image: {type(payload.garment_image).__name__} (len={len(payload.garment_image or '')}) -> {str(payload.garment_image)[:80]}...")
    logger.info("=" * 70)

    image_2d_url, model_3d_url = await _execute_tryon_pipeline(
        human_image=payload.human_image,
        garment_image=payload.garment_image,
        category=payload.category,
        garment_description=payload.garment_description,
        allow_fallback=payload.allow_fallback,
        base_url=base_url,
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


@router.post("/start")
async def start_tryon_job(payload: TryOnRequest, request: Request = None):
    """
    Inicia el pipeline de generación 3D en segundo plano y retorna de inmediato un task_id.
    El cliente hace polling a /api/tryon/status/{task_id} cada 2s sin riesgo de timeouts de proxy.
    """
    task_id = uuid.uuid4().hex[:12]
    base_url = _resolve_base_url(request)

    _async_tasks[task_id] = {
        "task_id": task_id,
        "status": "processing",
        "step": "vton",
        "progress": 0.1,
        "image_2d_url": None,
        "model_3d_url": None,
        "error": None,
        "created_at": time.time(),
    }

    async def _background_worker():
        try:
            image_2d, model_3d = await _execute_tryon_pipeline(
                human_image=payload.human_image,
                garment_image=payload.garment_image,
                category=payload.category,
                garment_description=payload.garment_description,
                allow_fallback=payload.allow_fallback,
                base_url=base_url,
                task_id=task_id,
            )
            _async_tasks[task_id].update({
                "status": "completed",
                "step": "completed",
                "progress": 1.0,
                "image_2d_url": image_2d,
                "model_3d_url": model_3d,
            })
            logger.info(f"[TryOn Job {task_id}] Completado exitosamente: {model_3d}")
        except Exception as e:
            err_text = e.detail if isinstance(e, HTTPException) else str(e)
            logger.error(f"[TryOn Job {task_id}] Falló con error: {err_text}")
            _async_tasks[task_id].update({
                "status": "failed",
                "step": "failed",
                "error": err_text,
            })

    asyncio.create_task(_background_worker())

    return {
        "task_id": task_id,
        "status": "processing",
        "message": "Generación iniciada en segundo plano",
    }


@router.get("/status/{task_id}")
async def get_tryon_job_status(task_id: str):
    """Consulta el estado del proceso de generación 3D asíncrono."""
    task = _async_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada o expirada.")
    return task
