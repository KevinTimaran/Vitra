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
REPLICATE_API_BASE_URL = "https://api.replicate.com/v1"

# Modificadores de prompt para forzar texturas de tela mate natural y evitar acabados plásticos/brillantes
POSITIVE_MATTE_PROMPT = "matte fabric, cotton texture, soft studio lighting, diffused light, flat colors"
NEGATIVE_MATTE_PROMPT = "shiny, glossy, plastic, latex, metallic, specular highlights, bright reflections, overexposed"


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

    neg_prompt = negative_prompt.strip() if negative_prompt and negative_prompt.strip() else NEGATIVE_MATTE_PROMPT

    input_payload = {
        "garm_img": garment_image_url.strip(),
        "human_img": human_image_url.strip(),
        "garment_des": enhanced_description,
        "negative_prompt": neg_prompt,
        "category": category,
        "crop": False,
        "steps": 30,
    }

    logger.info(
        f"[Replicate VTON] Enviando solicitud a IDM-VTON: "
        f"persona='{human_image_url[:80]}...', prenda='{garment_image_url[:80]}...', "
        f"categoría='{category}', desc='{enhanced_description}', negative='{neg_prompt}'"
    )

    try:
        # Usamos el cliente oficial de Replicate en modo asíncrono con timeout de 180 segundos
        client = replicate.Client(
            api_token=settings.REPLICATE_API_TOKEN,
            timeout=httpx.Timeout(180.0, connect=30.0),
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
