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
    garment_image: Optional[str] = None,
    category: str = "upper_body",
    garment_description: str = "clothing",
    garments: Optional[list] = None,
    allow_fallback: bool = False,
    base_url: Optional[str] = None,
    task_id: Optional[str] = None,
) -> tuple[str, str]:
    """Ejecuta el pipeline completo VTON -> Tripo3D -> Optimización (soporta prenda única y look multi-prenda)."""
    # Validación de entradas obligatorias
    if not human_image or not human_image.strip():
        logger.error("[TryOn Pipeline] ERROR: human_image está vacía o nula.")
        raise HTTPException(
            status_code=400,
            detail="La imagen de la persona (human_image) es obligatoria."
        )

    # Normalizar prendas
    garment_list = []
    if garments and len(garments) > 0:
        for g in garments:
            g_dict = g if isinstance(g, dict) else (g.model_dump() if hasattr(g, "model_dump") else g.__dict__)
            if g_dict.get("image"):
                garment_list.append(g_dict)

    if (not garment_image or not garment_image.strip()) and not garment_list:
        logger.error("[TryOn Pipeline] ERROR: garment_image o garments están vacíos.")
        raise HTTPException(
            status_code=400,
            detail="La imagen de la prenda (garment_image) o lista de prendas (garments) es obligatoria."
        )

    # -------------------------------------------------------------------------
    # PASO 1: Fusión 2D Virtual Try-On (Replicate IDM-VTON)
    # -------------------------------------------------------------------------
    if task_id and task_id in _async_tasks:
        _async_tasks[task_id].update({"step": "vton", "progress": 0.25})

    image_2d_url = None

    if garment_list and len(garment_list) > 0:
        logger.info(f"[TryOn Pipeline] [PASO 1/3] Iniciando fusión 2D secuencial de look multi-prenda ({len(garment_list)} piezas)...")
        current_canvas = human_image.strip()
        last_success_url = None

        for idx, g_item in enumerate(garment_list):
            g_img = str(g_item.get("image", "")).strip()
            g_cat = str(g_item.get("category", "upper_body"))
            g_name = str(g_item.get("name", "clothing"))

            if not g_img:
                continue

            vton_category = "upper_body"
            if g_cat in ("lower_body", "Pants"):
                vton_category = "lower_body"
            elif g_cat in ("dresses", "Dress"):
                vton_category = "dresses"
            elif g_cat in ("shoes", "Shoes", "accessories", "Accessories"):
                # Omitir categorías sin endpoint en IDM-VTON
                continue

            if task_id and task_id in _async_tasks:
                prog = 0.2 + (0.35 * ((idx + 1) / len(garment_list)))
                _async_tasks[task_id].update({"step": f"vton_{idx+1}", "progress": prog})

            try:
                logger.info(f"[TryOn Pipeline] Fusionando pieza {idx+1}/{len(garment_list)}: {g_name} ({vton_category})...")
                fused_url = await generate_vton(
                    human_image_url=current_canvas,
                    garment_image_url=g_img,
                    category=vton_category,
                    garment_description=g_name,
                )
                if fused_url and str(fused_url).strip():
                    current_canvas = fused_url.strip()
                    last_success_url = current_canvas
                    logger.info(f"[TryOn Pipeline] Pieza {idx+1} fusionada con éxito: {fused_url[:70]}...")
            except Exception as part_err:
                logger.warning(f"[TryOn Pipeline] Advertencia en fusión de {g_name}: {part_err}")
                if not allow_fallback and not last_success_url:
                    status_code = part_err.status_code if isinstance(part_err, HTTPException) else 502
                    err_msg = part_err.detail if isinstance(part_err, HTTPException) else str(part_err)
                    raise HTTPException(status_code=status_code, detail=f"[Replicate VTON Error] {err_msg}")

        image_2d_url = last_success_url or current_canvas
    else:
        logger.info("[TryOn Pipeline] [PASO 1/3] Iniciando fusión 2D con Replicate IDM-VTON...")
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
    # PASO 2: Extrusión 3D con Tripo3D (image_to_model) - 1 SOLA VEZ POR LOOK
    # -------------------------------------------------------------------------
    if task_id and task_id in _async_tasks:
        _async_tasks[task_id].update({"step": "tripo3d", "progress": 0.60, "image_2d_url": image_2d_url})

    if garment_list and len(garment_list) > 0:
        # Para look completo terminado, el modelo 3D representa el conjunto fusionado (image_2d_url)
        image_3d_input = image_2d_url if (image_2d_url and str(image_2d_url).strip()) else garment_list[0].get("image", "").strip()
    elif garment_image and garment_image.strip():
        image_3d_input = garment_image.strip()
    else:
        image_3d_input = image_2d_url

    logger.info("[TryOn Pipeline] [PASO 2/3] Conectando con Tripo3D (1 sola invocación por look completado)...")
    logger.info(f"  -> Input para Tripo3D: {image_3d_input[:80]}...")

    try:
        model_3d_url = await generate_3d_model(image_url=image_3d_input)
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
    Soporta tanto una prenda individual como un look multi-prenda completo.
    Invoca Tripo3D exactamente una vez por look completado.
    """
    base_url = _resolve_base_url(request)

    logger.info("=" * 70)
    logger.info("[TryOn Pipeline] >>> NUEVA SOLICITUD DE PROBADOR VIRTUAL RECIBIDA <<<")
    logger.info(f"  • Prenda individual: {payload.garment_image[:60] if payload.garment_image else 'None'}")
    logger.info(f"  • Multi-prendas: {len(payload.garments) if payload.garments else 0} prendas")
    logger.info(f"  • allow_fallback: {payload.allow_fallback}")
    logger.info("=" * 70)

    image_2d_url, model_3d_url = await _execute_tryon_pipeline(
        human_image=payload.human_image,
        garment_image=payload.garment_image,
        category=payload.category,
        garment_description=payload.garment_description,
        garments=payload.garments,
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
                garments=payload.garments,
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
