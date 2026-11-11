import os
import uuid
import time
import asyncio
import logging
import traceback
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Request
from app.config import settings
from app.schemas.tryon import (
    TryOnRequest,
    TryOnResponse,
    CascadeTryOnRequest,
    CascadeTryOnResponse,
    CascadeStepInfo,
)
from app.api.auth import users_db
from app.services.photo_store import load_photo
from app.services.auth_service import decode_access_token
from app.services.replicate_service import generate_vton, restore_image_quality
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
            clean_host = forwarded_host.split(",")[0].strip()
            scheme = request.headers.get("x-forwarded-proto", "https").split(",")[0].strip()
            return f"{scheme}://{clean_host}"
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
    excluded_prefixes = ("tshirt", "default_", "test_")
    for f in os.listdir(STATIC_MODELS_DIR):
        if f.endswith(".glb") and not any(f.startswith(p) for p in excluded_prefixes):
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
            elif g_cat in ("dresses", "Dress", "Dresses"):
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
                if not allow_fallback:
                    status_code = part_err.status_code if isinstance(part_err, HTTPException) else 502
                    err_msg = part_err.detail if isinstance(part_err, HTTPException) else str(part_err)
                    raise HTTPException(status_code=status_code, detail=f"[Replicate VTON Error] {err_msg}")


        image_2d_url = last_success_url or (garment_list[0].get("image", "").strip() if garment_list else current_canvas)
    else:
        logger.info("[TryOn Pipeline] [PASO 1/3] Iniciando fusión 2D con Replicate IDM-VTON...")
        single_vton_cat = category or "upper_body"
        if single_vton_cat in ("lower_body", "Pants"):
            single_vton_cat = "lower_body"
        elif single_vton_cat in ("dresses", "Dress", "Dresses"):
            single_vton_cat = "dresses"

        try:
            image_2d_url = await generate_vton(
                human_image_url=human_image.strip(),
                garment_image_url=garment_image.strip(),
                category=single_vton_cat,
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
        # Si hubo fusión VTON exitosa, usar el resultado de fusión; si hubo fallback, usar la prenda
        image_3d_input = last_success_url if last_success_url else garment_list[0].get("image", "").strip()
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
    # Limpieza de tareas antiguas (> 2 horas)
    now = time.time()
    expired = [tid for tid, t in _async_tasks.items() if now - t.get("created_at", now) > 7200]
    for tid in expired:
        _async_tasks.pop(tid, None)

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


# =========================================================================
# 🌊 PIPELINE WATERFALL (CASCADA) 2D -> 3D VIRTUAL TRY-ON
# =========================================================================

PRESET_STUDIO_IMAGES = {
    "female": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
    "male": "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80",
    "non-binary": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
}


def _resolve_base_human_image(user_id: Optional[str] = None, human_image: Optional[str] = None) -> str:
    """
    Step 0 (Base): Recupera la imagen 2D base original del usuario (recortada y en A-pose).
    Prioridad:
    1. human_image explícita provista en el payload.
    2. Fotografía guardada del usuario en users_db (body_image).
    3. Fotografía de muestra A-pose calibrada según el género registrado del usuario.
    """
    if human_image and human_image.strip():
        return human_image.strip()

    if user_id:
        user_key = user_id.strip().lower()
        if user_key in users_db:
            u_data = users_db[user_key]
            body_img = load_photo(u_data.get("body_image"))
            if body_img:
                return body_img

            gender = str(u_data.get("gender", "female")).lower()
            if gender in PRESET_STUDIO_IMAGES:
                return PRESET_STUDIO_IMAGES[gender]

    return PRESET_STUDIO_IMAGES["female"]


def _sort_garments_for_waterfall(garments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ordena las prendas para el orden de vestimenta natural en cascada:
    1. Prenda inferior (Pantalones, shorts, pantaloneta) -> category="lower_body"
    2. Vestido (si aplica) -> category="dresses"
    3. Prenda superior base (Camisetas, camisas) -> category="upper_body"
    4. Prenda superior exterior (Chaquetas, abrigos) -> category="upper_body"
    5. Calzado y accesorios
    """
    def _rank(item: Dict[str, Any]) -> int:
        cat = str(item.get("category", "")).lower()
        name = str(item.get("name", "")).lower()
        if any(w in cat or w in name for w in ("pant", "short", "lower", "trouser", "bermuda", "falda", "skirt")):
            return 1
        if any(w in cat or w in name for w in ("dress", "vestido")):
            return 2
        if any(w in cat or w in name for w in ("shirt", "tee", "top", "camis", "crewneck", "polo")):
            return 3
        if any(w in cat or w in name for w in ("jacket", "chaqueta", "outerwear", "coat", "hoodie", "blazer", "buzo")):
            return 4
        return 5

    return sorted(garments, key=_rank)


_NON_WEARABLE_WORDS = ("shoe", "zapat", "calzado", "sneaker", "bota", "boot", "accessor", "accesor", "bag", "bolso", "hat", "gorra", "sombrero", "jewel", "joya", "watch", "reloj")


def _is_non_wearable_for_vton(garment: Dict[str, Any]) -> bool:
    """IDM-VTON solo soporta upper_body / lower_body / dresses: calzado y accesorios se omiten."""
    cat = str(garment.get("category", "")).lower()
    return any(w in cat for w in _NON_WEARABLE_WORDS)


def _bind_payload_to_token_user(payload: CascadeTryOnRequest, request: Optional[Request]) -> None:
    """
    El user_id del cliente no es de fiar (permitiría leer la foto de otra persona). Si llega un token válido
    se usa el correo del token; si no, se descarta el user_id y solo se usará el human_image enviado.
    """
    email = None
    auth = request.headers.get("authorization", "") if request else ""
    if auth.lower().startswith("bearer "):
        try:
            data = decode_access_token(auth[7:].strip())
            email = (data.get("sub") or data.get("email") or "").lower() or None
        except Exception:
            email = None
    payload.user_id = email


def _validate_cascade_payload(payload: CascadeTryOnRequest) -> None:
    """
    Validación inmediata y síncrona contra estados vacíos o payloads corruptos.
    Rechaza al instante con HTTP 400 Bad Request antes de encolar tareas o gastar cómputo.
    """
    # 1. Validar que la lista de prendas no esté vacía
    has_garments = bool(payload.garments and len(payload.garments) > 0)
    has_garment_ids = bool(payload.garment_ids and len(payload.garment_ids) > 0)
    if not has_garments and not has_garment_ids:
        logger.error("[Cascade Validation] Rechazado con 400: Arreglo de prendas vacío.")
        raise HTTPException(
            status_code=400,
            detail="El arreglo de prendas (garments) no puede estar vacío. Se requiere al menos una prenda para el probador en cascada."
        )

    # Si se pasaron prendas, validar que al menos una tenga una imagen no vacía
    if has_garments:
        valid_items = [
            g for g in payload.garments 
            if (hasattr(g, "image") and g.image and str(g.image).strip()) or 
               (isinstance(g, dict) and g.get("image") and str(g["image"]).strip())
        ]
        if not valid_items and not has_garment_ids:
            logger.error("[Cascade Validation] Rechazado con 400: Prendas sin imagen válida.")
            raise HTTPException(
                status_code=400,
                detail="Ninguna de las prendas proporcionadas contiene una imagen válida."
            )

    # 2. Validar que se pueda resolver una silueta humana base
    has_human_img = bool(payload.human_image and str(payload.human_image).strip())
    has_user_id = bool(payload.user_id and str(payload.user_id).strip())
    if not has_human_img and not has_user_id:
        logger.error("[Cascade Validation] Rechazado con 400: Avatar base no proporcionado.")
        raise HTTPException(
            status_code=400,
            detail="Se requiere la imagen base del usuario (human_image) o un user_id registrado para aplicar la cascada."
        )


async def _execute_waterfall_cascade(
    payload: CascadeTryOnRequest,
    base_url: str,
    task_id: Optional[str] = None,
) -> CascadeTryOnResponse:
    """
    Ejecuta la lógica estricta de la Cascada (Waterfall):
    - Composición secuencial en 2D en Replicate IDM-VTON (paso a paso, esperando cada respuesta).
    - Extrusión única en 3D con Tripo3D del lienzo final completamente vestido.
    - Optimización Draco/WebP final.
    """
    # -------------------------------------------------------------------------
    # STEP 0 (BASE): Recuperar imagen 2D base original del usuario (A-pose)
    # -------------------------------------------------------------------------
    base_human_image = _resolve_base_human_image(
        user_id=payload.user_id,
        human_image=payload.human_image,
    )

    if not base_human_image or not base_human_image.strip():
        logger.error("[WATERFALL ERROR] No se pudo determinar una imagen base de usuario válida.")
        raise HTTPException(
            status_code=400,
            detail="No se pudo determinar una imagen base de usuario válida para iniciar la cascada."
        )

    logger.info("=" * 75)
    logger.info("[WATERFALL 2D->3D] >>> INICIANDO PIPELINE DE CASCADA <<<")
    logger.info(f"  • Usuario: {payload.user_id or 'anónimo'}")
    logger.info(f"  • Imagen Base 2D (Step 0): {base_human_image[:80]}...")

    # -------------------------------------------------------------------------
    # Normalizar prendas
    # -------------------------------------------------------------------------
    raw_garments: List[Dict[str, Any]] = []
    if payload.garments:
        for g in payload.garments:
            raw_garments.append(g.model_dump() if hasattr(g, "model_dump") else g.__dict__)

    # Si se pasaron IDs de prendas sin imagen, buscarlas en users_db (base_garments)
    if payload.garment_ids and payload.user_id:
        user_key = payload.user_id.lower()
        if user_key in users_db:
            user_base = users_db[user_key].get("base_garments", [])
            for gid in payload.garment_ids:
                if not any(rg.get("id") == gid for rg in raw_garments):
                    for bg in user_base:
                        if bg.get("id") == gid and bg.get("imageUrl"):
                            raw_garments.append({
                                "id": gid,
                                "name": bg.get("name", "Prenda"),
                                "category": bg.get("category", "Tops"),
                                "image": bg.get("imageUrl"),
                            })

    valid_garments = [g for g in raw_garments if g.get("image") and str(g["image"]).strip()]
    if not valid_garments:
        logger.error("[WATERFALL ERROR] No se proporcionaron prendas con imágenes válidas.")
        raise HTTPException(
            status_code=400,
            detail="Se requiere al menos una prenda con imagen válida para la cascada."
        )

    skipped = [g for g in valid_garments if _is_non_wearable_for_vton(g)]
    for g in skipped:
        logger.info(f"[WATERFALL] Omitiendo '{g.get('name')}' ({g.get('category')}): IDM-VTON no soporta esta categoría.")
    valid_garments = [g for g in valid_garments if not _is_non_wearable_for_vton(g)]
    if not valid_garments:
        raise HTTPException(
            status_code=400,
            detail="Las prendas seleccionadas (calzado/accesorios) no se pueden probar en 2D. Agrega una prenda superior, inferior o vestido."
        )

    ordered_garments = _sort_garments_for_waterfall(valid_garments)
    total_steps = len(ordered_garments)

    logger.info(f"  • Prendas a encadenar en orden secuencial ({total_steps} piezas):")
    for idx, g in enumerate(ordered_garments):
        logger.info(f"    {idx + 1}. {g.get('name')} [{g.get('category')}]")
    logger.info("=" * 75)

    if task_id and task_id in _async_tasks:
        _async_tasks[task_id].update({
            "status": "processing",
            "step": "waterfall_starting",
            "progress": 0.10,
            "total_garments": total_steps,
            "current_garment_index": 0,
            "current_garment_name": None,
        })

    # -------------------------------------------------------------------------
    # STRICT SEQUENTIAL 2D WATERFALL LOOP (IDM-VTON)
    # -------------------------------------------------------------------------
    current_human_canvas = base_human_image
    steps_history: List[CascadeStepInfo] = []

    for i, garment in enumerate(ordered_garments):
        step_num = i + 1
        g_name = str(garment.get("name", f"Prenda {step_num}"))
        g_img = str(garment.get("image", "")).strip()
        raw_cat = str(garment.get("category", "upper_body"))

        vton_cat = "upper_body"
        if any(w in raw_cat.lower() for w in ("pant", "short", "lower", "trouser", "falda")):
            vton_cat = "lower_body"
        elif any(w in raw_cat.lower() for w in ("dress", "vestido")):
            vton_cat = "dresses"

        logger.info(f"[WATERFALL PASO {step_num}/{total_steps}] Aplicando '{g_name}' ({vton_cat})...")
        logger.info(f"  -> Humano Base Anterior: {current_human_canvas[:70]}...")
        logger.info(f"  -> Prenda a Superponer: {g_img[:70]}...")

        if task_id and task_id in _async_tasks:
            prog = 0.15 + (0.50 * (i / total_steps))
            _async_tasks[task_id].update({
                "step": f"vton_step_{step_num}",
                "progress": prog,
                "current_garment_index": step_num,
                "current_garment_name": g_name,
                "detail": f"Fusionando en 2D ({step_num}/{total_steps}): {g_name}",
            })

        try:
            # ESPERA OBLIGATORIA (AWAIT) DE LA RESPUESTA DE IDM-VTON
            fused_image_url = await generate_vton(
                human_image_url=current_human_canvas,
                garment_image_url=g_img,
                category=vton_cat,
                garment_description=g_name,
            )
            logger.info(f"[WATERFALL PASO {step_num} ÉXITO] Prenda '{g_name}' fusionada: {fused_image_url[:80]}...")
            
            # REGLA CRÍTICA: La salida de esta iteración es la base de la siguiente
            current_human_canvas = fused_image_url
            steps_history.append(
                CascadeStepInfo(
                    step_number=step_num,
                    garment_name=g_name,
                    category=vton_cat,
                    dressed_image_url=current_human_canvas,
                )
            )
        except Exception as vton_err:
            logger.error(f"[WATERFALL PASO {step_num} FALLÓ] Error con {g_name}: {vton_err}")
            status_code = vton_err.status_code if isinstance(vton_err, HTTPException) else 502
            err_detail = vton_err.detail if isinstance(vton_err, HTTPException) else str(vton_err)

            if not payload.allow_fallback:
                if task_id and task_id in _async_tasks:
                    _async_tasks[task_id].update({
                        "status": "failed",
                        "step": f"failed_vton_step_{step_num}",
                        "error": f"Fallo en IDM-VTON al procesar '{g_name}' (Paso {step_num}/{total_steps}): {err_detail}",
                        "detail": f"Error al procesar {g_name}: {err_detail}",
                    })
                raise HTTPException(status_code=status_code, detail=f"[Waterfall VTON Step {step_num}] {err_detail}")

            # Con fallback la tarea sigue "processing": solo se informa del paso omitido.
            if task_id and task_id in _async_tasks:
                _async_tasks[task_id].update({"detail": f"Se omitió '{g_name}' por un error de VTON; continuando..."})
            logger.warning(f"[WATERFALL PASO {step_num} FALLBACK] Continuando con el lienzo previo.")

    if len(steps_history) == 0:
        logger.error("[WATERFALL ERROR] Ninguna prenda pudo ser aplicada en la cascada 2D.")
        err_msg = "Ninguna de las prendas seleccionadas pudo ser fusionada en 2D con IDM-VTON. No se generó un modelo 3D para evitar mostrar una prenda suelta como si fuera el avatar vestido."
        if task_id and task_id in _async_tasks:
            _async_tasks[task_id].update({
                "status": "failed",
                "step": "failed_all_steps",
                "error": err_msg,
                "detail": err_msg,
            })
        raise HTTPException(status_code=502, detail=err_msg)

    final_dressed_image = current_human_canvas
    logger.info(f"[WATERFALL 2D COMPLETADO] Lienzo final completamente vestido: {final_dressed_image[:80]}...")

    # -------------------------------------------------------------------------
    # RESTORATION: Inyección de CodeFormer (Face Restoration & Upscaling)
    # -------------------------------------------------------------------------
    vton_image_url = final_dressed_image
    logger.info(f"[Step 1/3] VTON completed. Original URL: {vton_image_url}")
    logger.info("[Step 2/3] Executing CodeFormer restoration...")

    if task_id and task_id in _async_tasks:
        _async_tasks[task_id].update({
            "step": "restoring_quality",
            "progress": 0.65,
            "detail": "Restaurando rostro y mejorando nitidez HD con CodeFormer...",
        })

    try:
        hd_image_url = await restore_image_quality(vton_image_url)
    except Exception as cf_err:
        logger.warning(
            f"[WATERFALL RESTORATION] Excepción inesperada en restore_image_quality: {cf_err}. "
            f"Fallback seguro: conservando lienzo VTON original."
        )
        hd_image_url = vton_image_url

    if not hd_image_url or not str(hd_image_url).strip():
        logger.warning("[WATERFALL RESTORATION] URL resultante vacía. Conservando URL previa de VTON.")
        hd_image_url = vton_image_url

    logger.info(f"[Step 3/3] CodeFormer completed. HD URL: {hd_image_url}. Sending to Tripo3D.")
    final_dressed_image = hd_image_url

    if steps_history:
        steps_history[-1].dressed_image_url = final_dressed_image

    # -------------------------------------------------------------------------
    # STEP 3: Generación 3D del Modelo Unificado (Tripo3D)
    # -------------------------------------------------------------------------
    if task_id and task_id in _async_tasks:
        _async_tasks[task_id].update({
            "step": "tripo3d_unified",
            "progress": 0.70,
            "final_dressed_image_url": hd_image_url,
            "detail": "Generando modelo 3D unificado con Tripo3D...",
        })

    logger.info("[WATERFALL 3D] Enviando lienzo final a Tripo3D (1 sola generación unificada)...")
    try:
        raw_3d_url = await generate_3d_model(image_url=hd_image_url)
        logger.info(f"[WATERFALL 3D ÉXITO] Modelo .glb recibido de Tripo3D: {raw_3d_url}")
    except Exception as tripo_err:
        logger.error(f"[WATERFALL 3D ERROR] Falló Tripo3D: {tripo_err}")
        status_code = tripo_err.status_code if isinstance(tripo_err, HTTPException) else 502
        err_detail = tripo_err.detail if isinstance(tripo_err, HTTPException) else str(tripo_err)

        if task_id and task_id in _async_tasks:
            _async_tasks[task_id].update({
                "status": "failed",
                "step": "tripo3d_failed",
                "error": f"Fallo en generación 3D con Tripo3D: {err_detail}",
                "detail": f"Error al generar modelo 3D unificado: {err_detail}",
            })

        raise HTTPException(status_code=status_code, detail=f"[Waterfall Tripo3D Error] {err_detail}")

    # -------------------------------------------------------------------------
    # STEP 4: Optimización Móvil (Draco + WebP)
    # -------------------------------------------------------------------------
    if task_id and task_id in _async_tasks:
        _async_tasks[task_id].update({
            "step": "optimizing_mesh",
            "progress": 0.88,
            "detail": "Optimizando malla 3D (Draco / WebP)...",
        })

    final_3d_url = raw_3d_url
    try:
        optimized_3d_url = await optimize_3d_model(raw_3d_url, base_url=base_url)
        logger.info(f"[WATERFALL OPTIMIZACIÓN] Modelo 3D optimizado con éxito: {optimized_3d_url}")
        final_3d_url = optimized_3d_url
    except Exception as opt_err:
        logger.warning(f"[WATERFALL OPTIMIZACIÓN] Aviso en optimización Draco ({opt_err}). Manteniendo original.")

    return CascadeTryOnResponse(
        status="completed",
        user_id=payload.user_id,
        base_human_image_url=base_human_image,
        final_dressed_image_url=final_dressed_image,
        model_3d_url=final_3d_url,
        steps_completed=steps_history,
        total_garments_applied=len(steps_history),
        message=f"Cascada 2D a 3D completada con éxito. Se aplicaron {len(steps_history)} prendas en secuencia y se generó el modelo 3D unificado.",
    )


@router.post("/cascade", response_model=CascadeTryOnResponse)
async def generate_cascade_tryon_endpoint(payload: CascadeTryOnRequest, request: Request = None) -> CascadeTryOnResponse:
    """
    Endpoint síncrono para el Virtual Try-On en Cascada (Waterfall):
    1. Valida el estado no vacío del payload.
    2. Paso 0: Obtiene la imagen base del usuario.
    3. Bucle secuencial estricto 2D con IDM-VTON (Paso N recibe el output del Paso N-1).
    4. Generación 3D única con Tripo3D a partir de la imagen vestida final.
    5. Retorna el modelo 3D unificado (.glb) y el historial de pasos.
    """
    _bind_payload_to_token_user(payload, request)
    _validate_cascade_payload(payload)
    base_url = _resolve_base_url(request)
    return await _execute_waterfall_cascade(payload=payload, base_url=base_url)


@router.post("/cascade/start")
async def start_cascade_tryon_job(payload: CascadeTryOnRequest, request: Request = None):
    """
    Inicia la Cascada 2D a 3D en segundo plano para evitar cortes de timeout HTTP (60s).
    Rechaza inmediatamente con 400 Bad Request si la lista de prendas o el avatar están vacíos.
    El cliente móvil consulta el progreso periódicamente en /api/tryon/cascade/status/{task_id}.
    """
    # Validación síncrona inmediata antes de generar el task
    _bind_payload_to_token_user(payload, request)
    _validate_cascade_payload(payload)

    now = time.time()
    # Limpieza preventiva
    expired = [tid for tid, t in _async_tasks.items() if now - t.get("created_at", now) > 7200]
    for tid in expired:
        _async_tasks.pop(tid, None)

    task_id = uuid.uuid4().hex[:12]
    base_url = _resolve_base_url(request)

    _async_tasks[task_id] = {
        "task_id": task_id,
        "status": "processing",
        "step": "queued",
        "progress": 0.05,
        "detail": "Iniciando cascada de prendas...",
        "image_2d_url": None,
        "model_3d_url": None,
        "result": None,
        "error": None,
        "created_at": now,
    }

    async def _cascade_worker():
        try:
            # Límite estricto de timeout global para todo el pipeline (360 segundos = 6 minutos)
            res: CascadeTryOnResponse = await asyncio.wait_for(
                _execute_waterfall_cascade(
                    payload=payload,
                    base_url=base_url,
                    task_id=task_id,
                ),
                timeout=360.0
            )
            _async_tasks[task_id].update({
                "status": "completed",
                "step": "completed",
                "progress": 1.0,
                "detail": "Look completado",
                "image_2d_url": res.final_dressed_image_url,
                "model_3d_url": res.model_3d_url,
                "result": res.model_dump(),
            })
            logger.info(f"[Cascade Job {task_id}] Cascada completada exitosamente: {res.model_3d_url}")
        except asyncio.TimeoutError:
            logger.error(f"[Cascade Job {task_id}] Tiempo límite de ejecución global excedido (Timeout 360s).")
            _async_tasks[task_id].update({
                "status": "failed",
                "step": "timeout",
                "error": "El pipeline de cascada excedió el tiempo límite de espera de 360 segundos.",
                "detail": "Tiempo límite de espera global agotado (Timeout).",
            })
        except Exception as e:
            err_text = e.detail if isinstance(e, HTTPException) else str(e)
            logger.error(f"[Cascade Job {task_id}] Falló con error: {err_text}")
            _async_tasks[task_id].update({
                "status": "failed",
                "step": "failed",
                "error": err_text,
                "detail": f"Error: {err_text}",
            })

    asyncio.create_task(_cascade_worker())

    return {
        "task_id": task_id,
        "status": "processing",
        "message": "Pipeline de cascada 2D a 3D iniciado en segundo plano",
    }


@router.get("/cascade/status/{task_id}")
async def get_cascade_tryon_status(task_id: str):
    """Consulta el estado en tiempo real del pipeline en Cascada."""
    task = _async_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea de cascada no encontrada o expirada.")
    return task

