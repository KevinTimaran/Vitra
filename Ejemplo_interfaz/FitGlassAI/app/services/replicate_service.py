import asyncio
import httpx
from fastapi import HTTPException
import replicate
from replicate.exceptions import ReplicateError

from app.config import settings

# Modelo por defecto de Virtual Try-On en Replicate
REPLICATE_VTON_MODEL = "cuiaxioming/idm-vton"
REPLICATE_API_BASE_URL = "https://api.replicate.com/v1"


async def generate_vton(
    human_image_url: str,
    garment_image_url: str,
    category: str = "upper_body",
    garment_description: str = "clothing",
) -> str:
    """
    Genera una prueba de ropa virtual (Virtual Try-On / VTON) fusionando la foto de una persona
    con la foto de una prenda de ropa utilizando el modelo cuiaxioming/idm-vton en Replicate.
    
    Retorna la URL de la imagen 2D fusionada resultante.
    """
    if not settings.has_replicate:
        raise HTTPException(
            status_code=500,
            detail="REPLICATE_API_TOKEN no está configurado en las variables de entorno."
        )

    if not human_image_url or not human_image_url.strip():
        raise HTTPException(
            status_code=400,
            detail="La URL de la imagen de la persona (human_image_url) es obligatoria."
        )

    if not garment_image_url or not garment_image_url.strip():
        raise HTTPException(
            status_code=400,
            detail="La URL de la imagen de la prenda (garment_image_url) es obligatoria."
        )

    input_payload = {
        "human_img": human_image_url.strip(),
        "garm_img": garment_image_url.strip(),
        "garment_des": garment_description,
        "category": category,
        "crop": False,
        "steps": 30,
    }

    try:
        # Usamos el cliente oficial de Replicate en modo asíncrono
        client = replicate.Client(api_token=settings.REPLICATE_API_TOKEN)
        output = await client.async_run(
            REPLICATE_VTON_MODEL,
            input=input_payload,
        )

        if not output:
            raise HTTPException(
                status_code=502,
                detail="El modelo de Replicate no devolvió ningún resultado."
            )

        # Extraer URL del resultado (puede ser lista, FileOutput o string)
        if isinstance(output, list) and len(output) > 0:
            return str(output[0])
        return str(output)

    except HTTPException:
        raise
    except ReplicateError as re:
        raise HTTPException(
            status_code=502,
            detail=f"Error en la ejecución del modelo Replicate: {str(re)}"
        )
    except Exception as e:
        # Fallback mediante llamada HTTP REST directa a la API de Replicate con httpx
        try:
            return await _generate_vton_via_rest(input_payload)
        except HTTPException:
            raise
        except Exception as fallback_err:
            raise HTTPException(
                status_code=502,
                detail=f"Fallo en el servicio Replicate (VTON): {str(e)} | Detalle fallback: {str(fallback_err)}"
            )


async def _generate_vton_via_rest(input_payload: dict) -> str:
    """Implementación de respaldo mediante la API REST directa de Replicate con polling no bloqueante."""
    headers = {
        "Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}",
        "Content-Type": "application/json",
        "Prefer": "wait",
    }

    url = f"{REPLICATE_API_BASE_URL}/models/{REPLICATE_VTON_MODEL}/predictions"

    async with httpx.AsyncClient(timeout=120.0) as http_client:
        response = await http_client.post(url, headers=headers, json={"input": input_payload})

        if response.status_code not in (200, 201, 202):
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
            if isinstance(output, list) and len(output) > 0:
                return str(output[0])
            return str(output)

        if status in ("failed", "canceled"):
            raise HTTPException(
                status_code=502,
                detail=f"La predicción de Replicate falló con estado '{status}': {data.get('error')}"
            )

        # Polling asíncrono si aún está en cola o procesando
        poll_url = data.get("urls", {}).get("get") or f"{REPLICATE_API_BASE_URL}/predictions/{prediction_id}"
        max_attempts = 45  # ~90 segundos máximo
        for _ in range(max_attempts):
            await asyncio.sleep(2.0)
            poll_res = await http_client.get(poll_url, headers=headers)
            if poll_res.status_code == 200:
                poll_data = poll_res.json()
                current_status = poll_data.get("status")
                if current_status == "succeeded":
                    output = poll_data.get("output")
                    if isinstance(output, list) and len(output) > 0:
                        return str(output[0])
                    return str(output)
                if current_status in ("failed", "canceled"):
                    raise HTTPException(
                        status_code=502,
                        detail=f"La predicción de Replicate falló: {poll_data.get('error')}"
                    )

        raise HTTPException(
            status_code=504,
            detail="Tiempo de espera agotado esperando el resultado de Replicate VTON."
        )
