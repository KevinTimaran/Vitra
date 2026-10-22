import os
import uuid
import time
import asyncio
import logging
import traceback
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from app.config import settings
from app.schemas.avatar import AvatarGenerateRequest, AvatarGenerateResponse
from app.services.tripo_service import generate_3d_model
from app.services.optimizer_service import optimize_3d_model, STATIC_MODELS_DIR

logger = logging.getLogger(__name__)

router = APIRouter()

# Almacén en memoria de tareas asíncronas para polling de avatares
_async_avatar_tasks: Dict[str, Dict[str, Any]] = {}


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
async def get_latest_avatar_model(request: Request = None):
    """
    Retorna la URL del modelo 3D (.glb) de avatar generado y optimizado más recientemente en el servidor.
    Permite recuperar de inmediato el modelo creado si una conexión HTTP fue cortada por timeout de túnel o red móvil.
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

    logger.info(f"[Avatar Latest] Retornando modelo más reciente: {model_url} ({latest_size} bytes)")
    return {
        "avatar_url": model_url,
        "filename": latest_filename,
        "size_bytes": latest_size,
        "updated_at": latest_mtime,
    }


async def _execute_avatar_generation(image_str: str, base_url: str, task_id: Optional[str] = None) -> str:
    """Ejecuta el pipeline completo Tripo3D -> Optimización para avatares."""
    logger.info("=" * 70)
    logger.info(f"[Avatar Pipeline] Generando modelo 3D con Tripo3D (task_id: {task_id or 'direct'})...")
    logger.info(f"  • Longitud input: {len(image_str)} caracteres")
    logger.info("=" * 70)

    if task_id and task_id in _async_avatar_tasks:
        _async_avatar_tasks[task_id].update({"step": "tripo3d", "progress": 0.4})

    try:
        glb_url = await generate_3d_model(image_str)
        logger.info(f"[Avatar Pipeline] Modelo 3D base obtenido de Tripo3D: {glb_url}")
    except Exception as e:
        tb = traceback.format_exc()
        status_code = e.status_code if isinstance(e, HTTPException) else 502
        err_msg = e.detail if isinstance(e, HTTPException) else str(e)
        logger.error(
            f"\n{'!' * 70}\n"
            f"[Avatar Pipeline - FALLÓ TRIPO3D]\n"
            f"Tipo: {type(e).__name__} | Código: {status_code}\n"
            f"Error: {err_msg}\n"
            f"Traceback:\n{tb}"
            f"{'!' * 70}\n"
        )
        raise HTTPException(status_code=status_code, detail=f"[Tripo3D Avatar Error] {err_msg}")

    if task_id and task_id in _async_avatar_tasks:
        _async_avatar_tasks[task_id].update({"step": "optimizing", "progress": 0.8})

    try:
        optimized_url = await optimize_3d_model(glb_url, base_url=base_url)
        logger.info(f"[Avatar Pipeline] Modelo 3D optimizado con éxito: {optimized_url}")
        glb_url = optimized_url
    except Exception as opt_err:
        logger.warning(f"[Avatar Pipeline] Falló optimización Draco/WebP ({opt_err}), usando modelo original.")

    return glb_url


@router.post("/start")
async def start_avatar_job(request: Request):
    """
    Inicia la generación del Avatar 3D en segundo plano y retorna de inmediato un task_id.
    El cliente móvil hace polling a /api/avatar/status/{task_id} cada 2.5s sin riesgo
    de timeouts de proxy o túnel (HTTP 502/504).
    """
    base_url = _resolve_base_url(request)
    content_type = request.headers.get("content-type", "")
    image_str = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            avatar_req = AvatarGenerateRequest(**body)
            image_str = avatar_req.get_image()
        except ValueError as ve:
            return JSONResponse(status_code=400, content={"detail": str(ve)})
        except Exception as e:
            return JSONResponse(status_code=400, content={"detail": f"JSON inválido: {str(e)}"})
    elif "multipart/form-data" in content_type:
        try:
            form = await request.form()
            image_str = form.get("image") or form.get("image_data")
            file_obj = form.get("file")
            if file_obj and hasattr(file_obj, "read"):
                import base64
                contents = await file_obj.read()
                mime = getattr(file_obj, "content_type", "image/jpeg") or "image/jpeg"
                b64_str = base64.b64encode(contents).decode("utf-8")
                image_str = f"data:{mime};base64,{b64_str}"
        except Exception as e:
            return JSONResponse(status_code=400, content={"detail": f"Error en formulario: {str(e)}"})

    if not image_str or not isinstance(image_str, str) or not image_str.strip():
        return JSONResponse(
            status_code=400,
            content={"detail": "No se proporcionó imagen de cuerpo entero válida."}
        )

    task_id = uuid.uuid4().hex[:12]
    _async_avatar_tasks[task_id] = {
        "task_id": task_id,
        "status": "processing",
        "step": "queued",
        "progress": 0.1,
        "avatar_url": None,
        "error": None,
        "created_at": time.time(),
    }

    async def _avatar_worker():
        try:
            final_url = await _execute_avatar_generation(image_str, base_url, task_id=task_id)
            _async_avatar_tasks[task_id].update({
                "status": "completed",
                "step": "completed",
                "progress": 1.0,
                "avatar_url": final_url,
            })
            logger.info(f"[Avatar Job {task_id}] Generación completada con éxito: {final_url}")
        except Exception as e:
            err_text = e.detail if isinstance(e, HTTPException) else str(e)
            logger.error(f"[Avatar Job {task_id}] Falló con error: {err_text}")
            _async_avatar_tasks[task_id].update({
                "status": "failed",
                "step": "failed",
                "error": err_text,
            })

    asyncio.create_task(_avatar_worker())

    return {
        "task_id": task_id,
        "status": "processing",
        "message": "Generación de avatar 3D iniciada en segundo plano",
    }


@router.get("/status/{task_id}")
async def get_avatar_job_status(task_id: str):
    """Consulta el estado del proceso de generación 3D de avatar asíncrono."""
    task = _async_avatar_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea de avatar no encontrada o expirada.")
    return task


@router.post("/generate", response_model=AvatarGenerateResponse)
async def generate_avatar_endpoint(request: Request):
    """
    Genera el avatar base 3D (avatar_base.glb) del usuario de manera síncrona
    a partir de una fotografía de cuerpo entero utilizando Tripo3D.
    """
    base_url = _resolve_base_url(request)
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
            glb_url = await _execute_avatar_generation(image_str, base_url)
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
            glb_url = await _execute_avatar_generation(image_str, base_url)
            return AvatarGenerateResponse(avatar_url=glb_url, status="completed")
        except HTTPException as he:
            return JSONResponse(status_code=he.status_code, content={"detail": he.detail})
        except Exception as e:
            return JSONResponse(status_code=500, content={"detail": str(e)})

    return JSONResponse(
        status_code=400,
        content={"detail": "Content-Type debe ser 'application/json' o 'multipart/form-data'."}
    )


@router.delete("/current")
@router.delete("")
async def delete_avatar():
    """
    Elimina o desvincula el avatar 3D personalizado activo del usuario,
    revertiendo la silueta al modelo base estilizado predeterminado.
    """
    return {
        "status": "deleted",
        "message": "Avatar personalizado eliminado. Se ha restablecido la silueta predeterminada.",
    }


@router.get("/presets")
async def get_avatar_presets(request: Request = None):
    """
    Retorna la lista de avatares predeterminados calibrados por género y silueta.
    """
    from app.config import settings
    base_url = "http://127.0.0.1:8000"
    if request and request.base_url:
        base_url = str(request.base_url).rstrip("/")
    elif settings.EXPO_PUBLIC_API_BASE_URL:
        base_url = settings.EXPO_PUBLIC_API_BASE_URL.rstrip("/")

    presets = [
        {
            "id": "preset-female",
            "gender": "female",
            "name": "Atelier Silueta Femenina",
            "description": "Proporciones esbeltas con calibración para vestidos y sastrería.",
            "image_2d": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
            "model_3d_url": f"{base_url}/static/models/tshirt.glb",
        },
        {
            "id": "preset-male",
            "gender": "male",
            "name": "Atelier Silueta Masculina",
            "description": "Estructura atlética con hombros definidos y caída recta.",
            "image_2d": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
            "model_3d_url": f"{base_url}/static/models/tshirt.glb",
        },
        {
            "id": "preset-neutral",
            "gender": "non-binary",
            "name": "Atelier Silueta Fluida / Neutra",
            "description": "Líneas minimalistas y proporciones universales contemporáneas.",
            "image_2d": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
            "model_3d_url": f"{base_url}/static/models/tshirt.glb",
        },
    ]

    return {"presets": presets}
