import io
import os
import base64
import asyncio
import logging
import traceback
import httpx
from fastapi import HTTPException
import replicate
from replicate.exceptions import ReplicateError

from app.config import settings

logger = logging.getLogger(__name__)

# Modelo oficial y estable de Virtual Try-On en Replicate (IDM-VTON)
REPLICATE_VTON_MODEL = "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985"
# Modelo CodeFormer para restauración facial y upscaling HD
REPLICATE_CODEFORMER_MODEL = "sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2"
REPLICATE_API_BASE_URL = "https://api.replicate.com/v1"

# Modificadores de prompt para forzar texturas de tela mate natural y evitar acabados plásticos/brillantes
POSITIVE_MATTE_PROMPT = "matte fabric, cotton texture, soft studio lighting, diffused light, flat colors"
NEGATIVE_MATTE_PROMPT = "shiny, glossy, plastic, latex, metallic, specular highlights, bright reflections, overexposed"


async def _ensure_replicate_accessible_url(client: replicate.Client, image_input: str) -> str:
    """
    Garantiza que la imagen sea accesible para los servidores de Replicate:
    - Si es Base64 (data: o crudo): decodifica los bytes y los sube a client.files.create(...)
    - Si es una URL local / ngrok / localtunnel: descarga los bytes con bypass headers y los sube a client.files.create(...)
    - Si es un archivo local del sistema (file:///... o /...): lo lee y sube a client.files.create(...)
    - Si es una URL pública externa limpia (unsplash, replicate.delivery, api.replicate.com): la retorna directamente.
    """
    if not image_input or not isinstance(image_input, str):
        return image_input

    clean = image_input.strip()

    # Caso 1: Archivo ya en almacenamiento oficial de Replicate o CDN público limpio
    if clean.startswith("https://api.replicate.com") or clean.startswith("https://replicate.delivery"):
        return clean
    if ("images.unsplash.com" in clean or "cdn." in clean) and not any(tunnel in clean for tunnel in ("ngrok", "loca.lt", "localhost", "127.0.0.1")):
        return clean

    # Caso 2: Base64 (con prefijo data: o raw base64)
    if clean.startswith("data:image/") or ";base64," in clean:
        try:
            b64_content = clean.split(",", 1)[1] if "," in clean else clean
            missing_padding = len(b64_content) % 4
            if missing_padding:
                b64_content += "=" * (4 - missing_padding)
            img_bytes = base64.b64decode(b64_content)
            uploaded_file = client.files.create(io.BytesIO(img_bytes))
            file_url = uploaded_file.urls.get("get") or str(uploaded_file)
            logger.info(f"[Replicate Helper] Base64 subido con éxito a Replicate Files: {file_url}")
            return file_url
        except Exception as e:
            logger.warning(f"[Replicate Helper] Error subiendo base64 a Replicate Files: {e}")

    # Caso 3: Ruta de archivo local en el servidor (file:///... o /...)
    local_path = clean.replace("file://", "")
    if os.path.exists(local_path) and os.path.isfile(local_path):
        try:
            with open(local_path, "rb") as f:
                uploaded_file = client.files.create(f)
            file_url = uploaded_file.urls.get("get") or str(uploaded_file)
            logger.info(f"[Replicate Helper] Archivo local subido con éxito a Replicate Files: {file_url}")
            return file_url
        except Exception as e:
            logger.warning(f"[Replicate Helper] Error subiendo archivo local a Replicate Files: {e}")

    # Caso 4: URL de ngrok, localtunnel o localhost (inaccesible externamente por warnings o IP local)
    if any(h in clean for h in ("ngrok", "loca.lt", "127.0.0.1", "localhost")):
        try:
            # Si apunta a /static/ local, leer directo de disco
            if "/static/" in clean:
                filename = clean.split("/static/")[-1]
                disk_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", filename)
                if os.path.exists(disk_path):
                    with open(disk_path, "rb") as f:
                        uploaded_file = client.files.create(f)
                    file_url = uploaded_file.urls.get("get") or str(uploaded_file)
                    logger.info(f"[Replicate Helper] Archivo estático local subido a Replicate Files: {file_url}")
                    return file_url

            async with httpx.AsyncClient(timeout=15.0) as http_client:
                resp = await http_client.get(
                    clean,
                    headers={
                        "ngrok-skip-browser-warning": "true",
                        "Bypass-Tunnel-Reminder": "true",
                    }
                )
                if resp.status_code == 200 and len(resp.content) > 500:
                    uploaded_file = client.files.create(io.BytesIO(resp.content))
                    file_url = uploaded_file.urls.get("get") or str(uploaded_file)
                    logger.info(f"[Replicate Helper] URL de túnel descargada y subida a Replicate Files: {file_url}")
                    return file_url
        except Exception as e:
            logger.warning(f"[Replicate Helper] Error descargando URL de túnel para Replicate: {e}")

    # Si parece raw base64 largo (> 200 caracteres y sin protocolo http)
    if len(clean) > 200 and not clean.startswith("http"):
        try:
            missing_padding = len(clean) % 4
            if missing_padding:
                clean += "=" * (4 - missing_padding)
            img_bytes = base64.b64decode(clean)
            uploaded_file = client.files.create(io.BytesIO(img_bytes))
            file_url = uploaded_file.urls.get("get") or str(uploaded_file)
            logger.info(f"[Replicate Helper] Raw Base64 subido a Replicate Files: {file_url}")
            return file_url
        except Exception as e:
            logger.warning(f"[Replicate Helper] No se pudo decodificar como raw base64: {e}")

    return clean


async def generate_vton(
    human_image_url: str,
    garment_image_url: str,
    category: str = "upper_body",
    garment_description: str = "clothing",
    negative_prompt: str = NEGATIVE_MATTE_PROMPT,
) -> str:
    """
    Genera una prueba de ropa virtual (Virtual Try-On / VTON) fusionando la foto de una persona
    con la foto de una prenda de ropa utilizando el modelo cuuupid/idm-vton en Replicate.
    
    Aplica modificadores de texturas de tela mate (algodón, iluminación suave) tanto en el
    prompt positivo como negativo para eliminar cualquier brillo plástico o reflectivo.
    Retorna la URL de la imagen 2D fusionada resultante.
    """
    if not settings.has_replicate:
        logger.error("[Replicate VTON] REPLICATE_API_TOKEN no configurado en entorno.")
        raise HTTPException(
            status_code=500,
            detail="REPLICATE_API_TOKEN no está configurado en las variables de entorno."
        )

    if not human_image_url or not human_image_url.strip():
        logger.error("[Replicate VTON] human_image_url está vacío.")
        raise HTTPException(
            status_code=400,
            detail="La URL de la imagen de la persona (human_image_url) es obligatoria."
        )

    if not garment_image_url or not garment_image_url.strip():
        logger.error("[Replicate VTON] garment_image_url está vacío.")
        raise HTTPException(
            status_code=400,
            detail="La URL de la imagen de la prenda (garment_image_url) es obligatoria."
        )

    desc_base = garment_description.strip() if garment_description and garment_description.strip() else "clothing"
    if POSITIVE_MATTE_PROMPT not in desc_base:
        enhanced_description = f"{desc_base}, {POSITIVE_MATTE_PROMPT}"
    else:
        enhanced_description = desc_base

    # Normalizar categoría según enum de IDM-VTON: ['upper_body', 'lower_body', 'dresses']
    clean_cat = "upper_body"
    if any(w in category.lower() for w in ("pant", "short", "lower", "trouser", "falda")):
        clean_cat = "lower_body"
    elif any(w in category.lower() for w in ("dress", "vestido")):
        clean_cat = "dresses"

    logger.info(
        f"[Replicate VTON] Preparando solicitud a IDM-VTON: "
        f"persona='{human_image_url[:60]}...', prenda='{garment_image_url[:60]}...', "
        f"categoría='{clean_cat}', desc='{enhanced_description}'"
    )

    try:
        # Usamos el cliente oficial de Replicate en modo asíncrono con timeout de 180 segundos
        client = replicate.Client(
            api_token=settings.REPLICATE_API_TOKEN,
            timeout=httpx.Timeout(180.0, connect=30.0),
        )

        # Garantizar que ambas imágenes sean URLs públicas accesibles por Replicate
        safe_human_url = await _ensure_replicate_accessible_url(client, human_image_url)
        safe_garment_url = await _ensure_replicate_accessible_url(client, garment_image_url)

        neg_prompt = negative_prompt.strip() if negative_prompt and negative_prompt.strip() else NEGATIVE_MATTE_PROMPT

        input_payload = {
            "garm_img": safe_garment_url,
            "human_img": safe_human_url,
            "garment_des": enhanced_description,
            "negative_prompt": neg_prompt,
            "category": clean_cat,
            "crop": False,
            "steps": 30,
        }

        logger.info(
            f"[Replicate VTON] Ejecutando modelo con URLs de Replicate Files: "
            f"garm_img={safe_garment_url}, human_img={safe_human_url}"
        )

        try:
            output = await client.async_run(
                REPLICATE_VTON_MODEL,
                input=input_payload,
            )
        except Exception as run_err:
            err_str = str(run_err).lower()
            if "negative_prompt" in err_str or "unexpected" in err_str or "extra" in err_str:
                logger.info("[Replicate VTON] Schema no admite negative_prompt directo, reintentando con garment_des enriquecido...")
                clean_payload = {k: v for k, v in input_payload.items() if k != "negative_prompt"}
                output = await client.async_run(
                    REPLICATE_VTON_MODEL,
                    input=clean_payload,
                )
            else:
                raise run_err

        if not output:
            logger.error("[Replicate VTON] El modelo devolvió un output nulo o vacío.")
            raise HTTPException(
                status_code=502,
                detail="El modelo de Replicate no devolvió ningún resultado."
            )

        # Extraer URL del resultado (puede ser lista, FileOutput o string)
        res_url = str(output[0]) if isinstance(output, list) and len(output) > 0 else str(output)
        logger.info(f"[Replicate VTON] Éxito con cliente oficial. URL de salida: {res_url}")
        return res_url

    except HTTPException:
        raise
    except ReplicateError as re:
        logger.error(f"[Replicate VTON] ReplicateError en cliente oficial: {re}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=502,
            detail=f"Error en la ejecución del modelo Replicate: {str(re)}"
        )
    except Exception as e:
        logger.warning(f"[Replicate VTON] Fallo en async_run ({e}). Intentando fallback REST directo con timeout 180s...")
        # Fallback mediante llamada HTTP REST directa a la API de Replicate con httpx
        try:
            return await _generate_vton_via_rest(input_payload)
        except HTTPException:
            raise
        except Exception as fallback_err:
            logger.error(
                f"[Replicate VTON] Fallo total en ambos métodos: {e} | Fallback REST: {fallback_err}\n"
                f"{traceback.format_exc()}"
            )
            raise HTTPException(
                status_code=502,
                detail=f"Fallo en el servicio Replicate (VTON): {str(e)} | Detalle fallback: {str(fallback_err)}"
            )


async def _generate_vton_via_rest(input_payload: dict) -> str:
    """Implementación de respaldo mediante la API REST directa de Replicate con polling no bloqueante (timeout 180s)."""
    headers = {
        "Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}",
        "Content-Type": "application/json",
        "Prefer": "wait",
    }

    # Si el identificador incluye el hash de versión (:hash), usamos el endpoint /predictions
    if ":" in REPLICATE_VTON_MODEL:
        version_hash = REPLICATE_VTON_MODEL.split(":", 1)[1]
        url = f"{REPLICATE_API_BASE_URL}/predictions"
        post_body = {"version": version_hash, "input": input_payload}
    else:
        url = f"{REPLICATE_API_BASE_URL}/models/{REPLICATE_VTON_MODEL}/predictions"
        post_body = {"input": input_payload}

    logger.info(f"[Replicate REST] Conectando a {url} con timeout de 180 segundos...")
    async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as http_client:
        response = await http_client.post(url, headers=headers, json=post_body)

        # Si el schema REST estricto rechaza negative_prompt con 422, reintentar sin ese campo
        if response.status_code == 422 and "negative_prompt" in response.text.lower():
            logger.info("[Replicate REST] 422 por negative_prompt en schema, reintentando sin ese campo...")
            clean_input = {k: v for k, v in input_payload.items() if k != "negative_prompt"}
            if ":" in REPLICATE_VTON_MODEL:
                post_body = {"version": version_hash, "input": clean_input}
            else:
                post_body = {"input": clean_input}
            response = await http_client.post(url, headers=headers, json=post_body)

        if response.status_code not in (200, 201, 202):
            logger.error(f"[Replicate REST] Error HTTP {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error al iniciar predicción en Replicate: {response.text}"
            )

        data = response.json()
        prediction_id = data.get("id")
        status = data.get("status")

        # Si finalizó de inmediato gracias al header Prefer: wait
        if status == "succeeded":
            output = data.get("output")
            res_url = str(output[0]) if isinstance(output, list) and len(output) > 0 else str(output)
            logger.info(f"[Replicate REST] Predicción finalizada de inmediato. URL: {res_url}")
            return res_url

        if status in ("failed", "canceled"):
            err_msg = data.get("error") or "Sin detalles"
            logger.error(f"[Replicate REST] Predicción falló de inmediato con estado '{status}': {err_msg}")
            raise HTTPException(
                status_code=502,
                detail=f"La predicción de Replicate falló con estado '{status}': {err_msg}"
            )

        # Polling asíncrono si aún está en cola o procesando
        poll_url = data.get("urls", {}).get("get") or f"{REPLICATE_API_BASE_URL}/predictions/{prediction_id}"
        max_attempts = 90  # ~180 segundos máximo con 2.0s por intervalo
        logger.info(f"[Replicate REST] Iniciando polling para prediction_id {prediction_id} (hasta 180s)...")
        for attempt in range(max_attempts):
            await asyncio.sleep(2.0)
            poll_res = await http_client.get(poll_url, headers=headers)
            if poll_res.status_code == 200:
                poll_data = poll_res.json()
                current_status = poll_data.get("status")
                if current_status == "succeeded":
                    output = poll_data.get("output")
                    res_url = str(output[0]) if isinstance(output, list) and len(output) > 0 else str(output)
                    logger.info(f"[Replicate REST] Predicción completada con éxito tras {attempt*2}s: {res_url}")
                    return res_url
                if current_status in ("failed", "canceled"):
                    err_msg = poll_data.get("error") or "Sin detalles"
                    logger.error(f"[Replicate REST] Falló en polling: {err_msg}")
                    raise HTTPException(
                        status_code=502,
                        detail=f"La predicción de Replicate falló: {err_msg}"
                    )

        logger.error("[Replicate REST] Tiempo de espera agotado (180s) esperando a Replicate.")
        raise HTTPException(
            status_code=504,
            detail="Tiempo de espera agotado esperando el resultado de Replicate VTON."
        )


async def restore_image_quality(image_url: str, fidelity: float = 0.7) -> str:
    """
    Restaura la calidad facial y resolución de una imagen usando CodeFormer en Replicate.
    Prioriza reconstrucción facial y nitidez de texturas antes de la extracción 3D.

    CRITICAL SAFETY REQUIREMENT:
    Envuelto en un bloque try-except. Si la API de Replicate expira el timeout, lanza un error,
    o retorna nulo/inválido, captura la excepción, la registra como advertencia y retorna
    image_url (la imagen original sin procesar). Esto garantiza que el pipeline nunca colapsará.
    """
    if not image_url or not isinstance(image_url, str) or not image_url.strip():
        logger.warning("[CodeFormer Restoration] image_url vacía o no válida. Retornando entrada original.")
        return image_url

    clean_image_url = image_url.strip()

    if not settings.has_replicate or not settings.REPLICATE_API_TOKEN:
        logger.warning(
            "[CodeFormer Restoration] REPLICATE_API_TOKEN no configurado en entorno. "
            "Omitiendo restauración y retornando imagen original."
        )
        return clean_image_url

    try:
        client = replicate.Client(
            api_token=settings.REPLICATE_API_TOKEN,
            timeout=httpx.Timeout(120.0, connect=30.0),
        )

        safe_image_url = await _ensure_replicate_accessible_url(client, clean_image_url)

        input_payload = {
            "image": safe_image_url,
            "upscale": 2,
            "face_upsample": True,
            "background_enhance": True,
            "codeformer_fidelity": fidelity,
        }

        logger.info(f"[CodeFormer Restoration] Ejecutando CodeFormer para: {safe_image_url[:80]}...")
        raw_output = await asyncio.wait_for(
            client.async_run(
                REPLICATE_CODEFORMER_MODEL,
                input=input_payload,
            ),
            timeout=120.0,
        )

        if not raw_output:
            logger.warning("[CodeFormer Restoration] CodeFormer retornó un output nulo o vacío. Retornando imagen original.")
            return clean_image_url

        # Manejar generadores / iteradores asíncronos o síncronos
        output = raw_output
        if hasattr(output, "__aiter__"):
            chunks = []
            async for item in output:
                chunks.append(item)
            output = chunks
        elif hasattr(output, "__iter__") and not isinstance(output, (str, bytes, list, dict, set, tuple)):
            output = list(output)

        # Extraer URL del resultado (soporta lista, FileOutput, dict o string)
        if isinstance(output, (list, tuple)):
            output = output[0] if len(output) > 0 else None

        if isinstance(output, dict):
            output = output.get("image") or output.get("url") or output.get("output") or output.get("file")

        url_attr = getattr(output, "url", None)
        if url_attr:
            res_url = str(url_attr)
        elif output is not None:
            res_url = str(output)
        else:
            res_url = ""

        res_url = res_url.strip()
        if not res_url or res_url.lower() in ("none", "null", "undefined"):
            logger.warning("[CodeFormer Restoration] Output de CodeFormer no contiene una URL válida. Retornando imagen original.")
            return clean_image_url

        # Validar esquema de URL para evitar strings residuales o mensajes de error
        if not (
            res_url.startswith("http://")
            or res_url.startswith("https://")
            or res_url.startswith("data:image/")
            or res_url.startswith("file://")
        ):
            logger.warning(
                f"[CodeFormer Restoration] Output de CodeFormer ('{res_url[:60]}...') no es un esquema de URL válido. "
                "Retornando imagen original."
            )
            return clean_image_url

        logger.info(f"[CodeFormer Restoration] Éxito con CodeFormer. URL HD: {res_url}")
        return res_url

    except Exception as e:
        logger.warning(
            f"[CodeFormer Restoration] Error al restaurar calidad con CodeFormer ({type(e).__name__}: {e}). "
            f"Fallback seguro activo: retornando imagen original: {clean_image_url[:80]}..."
        )
        return clean_image_url
