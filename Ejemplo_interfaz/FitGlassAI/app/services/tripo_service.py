import asyncio
import base64
import logging
import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

TRIPO_API_BASE_URL = "https://api.tripo3d.ai/v2/openapi"
SAMPLE_3D_MODEL_FALLBACK = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb"


async def _fetch_image_bytes(image_url: str) -> tuple[bytes, str, str]:
    """Descarga los bytes y detecta el formato y nombre de la imagen."""
    image_url = image_url.strip()

    if image_url.startswith("http://") or image_url.startswith("https://"):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.get(image_url)
                if res.status_code != 200:
                    raise HTTPException(
                        status_code=400,
                        detail=f"No se pudo descargar la imagen para Tripo3D (código {res.status_code})"
                    )
                content_type = res.headers.get("content-type", "image/png").split(";")[0].strip()
                ext = "png" if "png" in content_type else "jpg"
                return res.content, content_type, f"input_image.{ext}"
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error al descargar la imagen para Tripo3D desde la URL: {str(e)}"
            )

    if image_url.startswith("data:"):
        try:
            header, encoded = image_url.split(",", 1)
            mime = "image/png"
            if ";" in header and ":" in header:
                mime = header.split(":")[1].split(";")[0].strip()
            ext = "png" if "png" in mime else "jpg"
            return base64.b64decode(encoded), mime, f"input_image.{ext}"
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Data URI inválido para Tripo3D: {str(e)}"
            )

    # Base64 crudo
    try:
        data = base64.b64decode(image_url)
        return data, "image/png", "input_image.png"
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de imagen inválido para Tripo3D: {str(e)}"
        )


async def generate_3d_model(
    image_url: str,
    polling_interval: float = 2.5,
    timeout_seconds: float = 180.0,
    allow_fallback: bool = False,
) -> str:
    """
    Convierte una imagen 2D en un modelo 3D (.glb) utilizando la API de Tripo3D.
    Si allow_fallback es True, en caso de fallo retorna el modelo .glb de respaldo autónomo.
    """
    if not settings.has_tripo:
        if allow_fallback:
            logger.warning("[generate_3d_model] TRIPO_API_KEY no configurada. Retornando modelo 3D de respaldo.")
            return SAMPLE_3D_MODEL_FALLBACK
        raise HTTPException(
            status_code=500,
            detail="TRIPO_API_KEY no está configurada en las variables de entorno."
        )

    if not image_url or not image_url.strip():
        if allow_fallback:
            return SAMPLE_3D_MODEL_FALLBACK
        raise HTTPException(
            status_code=400,
            detail="La URL de la imagen (image_url) no puede estar vacía."
        )

    try:
        auth_headers = {
            "Authorization": f"Bearer {settings.TRIPO_API_KEY}",
        }

        # Paso 1: Descargar los bytes de la imagen y subirla a Tripo3D
        image_bytes, mime_type, filename = await _fetch_image_bytes(image_url)

        upload_url = f"{TRIPO_API_BASE_URL}/upload"
        task_url = f"{TRIPO_API_BASE_URL}/task"

    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        try:
            upload_files = {
                "file": (filename, image_bytes, mime_type)
            }
            upload_res = await client.post(upload_url, headers=auth_headers, files=upload_files)
            
            if upload_res.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Fallo al subir imagen a Tripo3D (HTTP {upload_res.status_code}): {upload_res.text}"
                )

            upload_json = upload_res.json()
            if upload_json.get("code") != 0:
                raise HTTPException(
                    status_code=502,
                    detail=f"Error en la API de subida de Tripo3D: {upload_json.get('message')}"
                )

            file_token = (
                upload_json.get("data", {}).get("file_token") or
                upload_json.get("data", {}).get("image_token")
            )
            if not file_token:
                raise HTTPException(
                    status_code=502,
                    detail="Tripo3D no devolvió un file_token válido tras la subida."
                )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Error de red al conectar con el endpoint de subida de Tripo3D: {str(e)}"
            )

        # Paso 2: Crear la tarea de generación 3D (image_to_model)
        ext = "png" if "png" in mime_type else "jpg"
        task_payload = {
            "type": "image_to_model",
            "file": {
                "type": ext,
                "file_token": file_token,
            },
        }

        try:
            task_headers = {
                **auth_headers,
                "Content-Type": "application/json",
            }
            task_res = await client.post(task_url, headers=task_headers, json=task_payload)

            if task_res.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Fallo al crear la tarea en Tripo3D (HTTP {task_res.status_code}): {task_res.text}"
                )

            task_json = task_res.json()
            if task_json.get("code") != 0:
                raise HTTPException(
                    status_code=502,
                    detail=f"Error al iniciar la tarea de Tripo3D: {task_json.get('message')}"
                )

            task_id = task_json.get("data", {}).get("task_id")
            if not task_id:
                raise HTTPException(
                    status_code=502,
                    detail="Tripo3D no devolvió un task_id para el proceso de generación."
                )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Error de comunicación al solicitar tarea a Tripo3D: {str(e)}"
            )

        # Paso 3: Polling periódico no bloqueante hasta que el task termine
        poll_url = f"{task_url}/{task_id}"
        elapsed = 0.0

        while elapsed < timeout_seconds:
            await asyncio.sleep(polling_interval)
            elapsed += polling_interval

            try:
                poll_res = await client.get(poll_url, headers=auth_headers)
                if poll_res.status_code != 200:
                    continue

                poll_json = poll_res.json()
                task_data = poll_json.get("data", {})
                status = task_data.get("status")

                if status == "success":
                    output = task_data.get("output", {})
                    # Paso 4: Retornar la URL de descarga del .glb
                    glb_url = (
                        output.get("pbr_model") or
                        output.get("model") or
                        output.get("pbr_model_url") or
                        output.get("model_url")
                    )
                    if not glb_url:
                        raise HTTPException(
                            status_code=502,
                            detail="Tripo3D reportó éxito pero no proporcionó la URL del archivo .glb."
                        )
                    return str(glb_url)

                if status in ("failed", "cancelled"):
                    message = task_data.get("message") or task_data.get("error") or "Sin detalles"
                    raise HTTPException(
                        status_code=502,
                        detail=f"La generación 3D en Tripo3D finalizó con error '{status}': {message}"
                    )

            except HTTPException:
                raise
            except Exception:
                # Continuar reintentando dentro del margen de timeout
                pass

        raise HTTPException(
            status_code=504,
            detail=f"Tiempo de espera agotado ({timeout_seconds}s) esperando la generación 3D de Tripo3D."
        )
    except Exception as e:
        if allow_fallback:
            logger.warning(f"[generate_3d_model] Error en generación Tripo3D ({type(e).__name__}: {e}). Retornando modelo de respaldo.")
            return SAMPLE_3D_MODEL_FALLBACK
        raise
