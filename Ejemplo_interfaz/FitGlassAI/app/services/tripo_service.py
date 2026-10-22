import asyncio
import base64
import logging
import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

TRIPO_API_BASE_URL = "https://api.tripo3d.ai/v2/openapi"


async def _fetch_image_bytes(image_url: str) -> tuple[bytes, str, str]:
    """Descarga los bytes y detecta el formato y nombre de la imagen."""
    image_url = image_url.strip()

    if image_url.startswith("http://") or image_url.startswith("https://"):
        try:
            logger.info(f"[Tripo3D] Descargando imagen 2D para subida desde: {image_url}")
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                res = await client.get(image_url)
                if res.status_code != 200:
                    logger.error(f"[Tripo3D] Error al descargar imagen (HTTP {res.status_code}): {res.text[:250]}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"No se pudo descargar la imagen para Tripo3D (código {res.status_code})"
                    )
                content_type = res.headers.get("content-type", "image/png").split(";")[0].strip()
                ext = "png" if "png" in content_type else "jpg"
                logger.info(f"[Tripo3D] Imagen descargada ({len(res.content)} bytes, tipo: {content_type}, archivo: input_image.{ext})")
                return res.content, content_type, f"input_image.{ext}"
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[Tripo3D] Error de red descargando imagen 2D: {e}")
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
            data = base64.b64decode(encoded)
            logger.info(f"[Tripo3D] Imagen decodificada desde Data URI ({len(data)} bytes, tipo: {mime})")
            return data, mime, f"input_image.{ext}"
        except Exception as e:
            logger.error(f"[Tripo3D] Error al parsear Data URI: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Data URI inválido para Tripo3D: {str(e)}"
            )

    # Base64 crudo
    try:
        data = base64.b64decode(image_url)
        logger.info(f"[Tripo3D] Imagen decodificada desde Base64 crudo ({len(data)} bytes)")
        return data, "image/png", "input_image.png"
    except Exception as e:
        logger.error(f"[Tripo3D] Error al parsear Base64: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Formato de imagen inválido para Tripo3D: {str(e)}"
        )


async def generate_3d_model(
    image_url: str,
    polling_interval: float = 2.5,
    timeout_seconds: float = 180.0,
) -> str:
    """
    Convierte una imagen 2D en un modelo 3D (.glb) utilizando la API de Tripo3D.
    Ejecuta el flujo completo asíncrono (subida, creación de tarea, polling y descarga).
    """
    if not settings.has_tripo:
        logger.error("[Tripo3D] TRIPO_API_KEY no configurada en las variables de entorno.")
        raise HTTPException(
            status_code=500,
            detail="TRIPO_API_KEY no está configurada en las variables de entorno."
        )

    if not image_url or not image_url.strip():
        logger.error("[Tripo3D] image_url proporcionada está vacía.")
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

        logger.info(f"[Tripo3D] Conectando con API Tripo3D (timeout {timeout_seconds}s)...")
        async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
            try:
                upload_files = {
                    "file": (filename, image_bytes, mime_type)
                }
                logger.info(f"[Tripo3D] Subiendo archivo a {upload_url}...")
                upload_res = await client.post(upload_url, headers=auth_headers, files=upload_files)
                
                if upload_res.status_code != 200:
                    logger.error(f"[Tripo3D Upload ERROR] HTTP {upload_res.status_code}: {upload_res.text}")
                    raise HTTPException(
                        status_code=502,
                        detail=f"Fallo al subir imagen a Tripo3D (HTTP {upload_res.status_code}): {upload_res.text}"
                    )

                upload_json = upload_res.json()
                if upload_json.get("code") != 0:
                    logger.error(f"[Tripo3D Upload ERROR] Código de API distinto de 0: {upload_json}")
                    raise HTTPException(
                        status_code=502,
                        detail=f"Error en la API de subida de Tripo3D: {upload_json.get('message')}"
                    )

                file_token = (
                    upload_json.get("data", {}).get("file_token") or
                    upload_json.get("data", {}).get("image_token")
                )
                if not file_token:
                    logger.error(f"[Tripo3D Upload ERROR] No se encontró file_token en: {upload_json}")
                    raise HTTPException(
                        status_code=502,
                        detail="Tripo3D no devolvió un file_token válido tras la subida."
                    )
                logger.info(f"[Tripo3D] Archivo subido exitosamente. file_token: {file_token}")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"[Tripo3D Upload ERROR] Excepción de conexión: {e}")
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
                logger.info(f"[Tripo3D] Creando tarea image_to_model en {task_url}...")
                task_res = await client.post(task_url, headers=task_headers, json=task_payload)

                if task_res.status_code != 200:
                    logger.error(f"[Tripo3D Task ERROR] HTTP {task_res.status_code}: {task_res.text}")
                    raise HTTPException(
                        status_code=502,
                        detail=f"Fallo al crear la tarea en Tripo3D (HTTP {task_res.status_code}): {task_res.text}"
                    )

                task_json = task_res.json()
                if task_json.get("code") != 0:
                    logger.error(f"[Tripo3D Task ERROR] Código de API distinto de 0: {task_json}")
                    raise HTTPException(
                        status_code=502,
                        detail=f"Error al iniciar la tarea de Tripo3D: {task_json.get('message')}"
                    )

                task_id = task_json.get("data", {}).get("task_id")
                if not task_id:
                    logger.error(f"[Tripo3D Task ERROR] No se encontró task_id en: {task_json}")
                    raise HTTPException(
                        status_code=502,
                        detail="Tripo3D no devolvió un task_id para el proceso de generación."
                    )
                logger.info(f"[Tripo3D] Tarea iniciada exitosamente con task_id: {task_id}")

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"[Tripo3D Task ERROR] Excepción al crear tarea: {e}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Error de comunicación al solicitar tarea a Tripo3D: {str(e)}"
                )

            # Paso 3: Polling periódico no bloqueante hasta que el task termine
            poll_url = f"{task_url}/{task_id}"
            elapsed = 0.0
            logger.info(f"[Tripo3D Polling] Iniciando sondeo periódico para task_id {task_id} cada {polling_interval}s...")

            while elapsed < timeout_seconds:
                await asyncio.sleep(polling_interval)
                elapsed += polling_interval

                try:
                    poll_res = await client.get(poll_url, headers=auth_headers)
                    if poll_res.status_code != 200:
                        logger.warning(f"[Tripo3D Polling] Status no 200 ({poll_res.status_code}), reintentando...")
                        continue

                    poll_json = poll_res.json()
                    task_data = poll_json.get("data", {})
                    status = task_data.get("status")
                    progress = task_data.get("progress", 0)

                    logger.info(f"[Tripo3D Polling] task_id={task_id} | status={status} | progreso={progress}% | t={elapsed:.1f}s")

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
                            logger.error(f"[Tripo3D ERROR] Status 'success' pero output sin modelo: {output}")
                            raise HTTPException(
                                status_code=502,
                                detail="Tripo3D reportó éxito pero no proporcionó la URL del archivo .glb."
                            )
                        logger.info(f"[Tripo3D ÉXITO] Modelo 3D .glb obtenido en {elapsed:.1f}s: {glb_url}")
                        return str(glb_url)

                    if status in ("failed", "cancelled"):
                        message = task_data.get("message") or task_data.get("error") or "Sin detalles"
                        logger.error(f"[Tripo3D ERROR] Tarea falló con estado '{status}': {message}")
                        raise HTTPException(
                            status_code=502,
                            detail=f"La generación 3D en Tripo3D finalizó con error '{status}': {message}"
                        )

                except HTTPException:
                    raise
                except Exception as poll_err:
                    logger.warning(f"[Tripo3D Polling] Advertencia temporal de sondeo: {poll_err}")
                    pass

            logger.error(f"[Tripo3D TIMEOUT] Tiempo de espera agotado ({timeout_seconds}s) para task_id {task_id}")
            raise HTTPException(
                status_code=504,
                detail=f"Tiempo de espera agotado ({timeout_seconds}s) esperando la generación 3D de Tripo3D."
            )
    except Exception as e:
        logger.error(f"[generate_3d_model] Error en generación Tripo3D ({type(e).__name__}: {e})")
        raise
