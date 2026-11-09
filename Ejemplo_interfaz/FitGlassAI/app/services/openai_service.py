import os
import json
import base64
import logging
import httpx
from fastapi import HTTPException

from app.config import settings
from app.schemas.garment import GarmentMetadata, GarmentAnalysis
from app.schemas.colorimetry import ColorimetryData
from app.services.gemini_service import _resolve_image_bytes, DEFAULT_GARMENT_METADATA_MOCK

logger = logging.getLogger(__name__)

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


def _get_openai_credentials() -> tuple[str, str]:
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY no está configurada en las variables de entorno."
        )
    model = (settings.OPENAI_MODEL or "gpt-4o-mini").strip()
    return api_key, model


def analyze_garment_image_openai(image_bytes: bytes, mime_type: str) -> GarmentAnalysis:
    """
    Analiza una imagen binaria de una prenda utilizando OpenAI GPT Vision de forma síncrona.
    Retorna un objeto GarmentAnalysis estructurado compatible con los endpoints multipart.
    """
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY no está configurada")
    model_name = (settings.OPENAI_MODEL or "gpt-4o-mini").strip()

    if not image_bytes:
        raise ValueError("El archivo de imagen está vacío")

    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{b64_image}"

    prompt = """
    Analiza la siguiente imagen de una prenda de ropa.
    Debes devolver UNICAMENTE un objeto JSON válido que cumpla exactamente con la siguiente estructura y reglas.
    
    Reglas estrictas de validación:
    - Primero, determina si la imagen realmente contiene una prenda de ropa reconocible. Si muestra un objeto aleatorio (perro, coche, comida) o está completamente borrosa, establece "is_valid_image" en false, proporciona un mensaje amigable en español en "validation_error_message" (ej. "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda."), y deja el resto de los campos vacíos o por defecto.
    - Si la imagen contiene una prenda de vestir reconocible, establece "is_valid_image" en true y "validation_error_message" en null.
    - Analiza ÚNICAMENTE lo que puedas observar en la fotografía.
    - NO inventes la talla.
    - NO inventes medidas físicas.
    - NO inventes la composición exacta del tejido.
    - NO inventes la marca.
    - NO inventes información no visible.
    - Estima el color visual predominante de la fotografía en formato HEX (ej. #FFFFFF).
    - Los valores deben corresponder con estas opciones si aplican:
      - category: Tops, Outerwear, Pants, Shoes, Accessories, Other
      - sleeve: Sleeveless, Short, Long, Unknown
      - neck: Crew, V-Neck, Polo, Mock, Hooded, None, Unknown
      - fit: Skinny, Slim, Regular, Relaxed, Oversized, Unknown
    
    Estructura JSON requerida:
    {
      "is_valid_image": true,
      "validation_error_message": null,
      "category": "Tops",
      "sleeve": "Short",
      "neck": "Crew",
      "fit": "Regular",
      "dominantColor": "#FFFFFF",
      "secondaryColors": ["#000000"],
      "pattern": "Solid",
      "hasPocket": false,
      "hasButtons": false,
      "hasZipper": false,
      "confidence": 0.95
    }
    """

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": data_url,
                            "detail": "auto"
                        }
                    }
                ]
            }
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }

    try:
        with httpx.Client(timeout=45.0) as client:
            resp = client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            )

        if resp.status_code != 200:
            raise ValueError(f"Error de comunicación con OpenAI ({resp.status_code}): {resp.text}")

        result_json = resp.json()
        content = result_json["choices"][0]["message"]["content"] or "{}"
        data = json.loads(content.strip())
        data.setdefault("is_valid_image", True)
        data.setdefault("validation_error_message", None)
        return GarmentAnalysis(**data)
    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Error al procesar la respuesta de OpenAI: {str(e)}")


async def analyze_garment_openai(image_base64_or_url: str) -> dict:
    """
    Analiza una prenda de ropa utilizando OpenAI GPT Vision (ej. gpt-4o-mini) de forma asíncrona.
    Retorna metadatos estructurados compatibles con GarmentMetadata.
    """
    api_key, model_name = _get_openai_credentials()

    if not image_base64_or_url or not image_base64_or_url.strip():
        raise HTTPException(
            status_code=400,
            detail="La imagen (Base64 o URL) no puede estar vacía."
        )

    try:
        image_bytes, mime_type = await _resolve_image_bytes(image_base64_or_url)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"[analyze_garment_openai] Error al decodificar imagen: {e}. Retornando mock.")
        return DEFAULT_GARMENT_METADATA_MOCK

    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{b64_image}"

    prompt = """
    Eres el motor analítico de moda de FitGlassAI / Vitra.
    Analiza la fotografía de la prenda adjunta y extrae sus metadatos principales.
    
    Instrucciones estrictas de validación:
    - Primero, determina si la imagen realmente contiene una prenda de ropa reconocible. Si muestra un objeto aleatorio (perro, coche, comida) o está completamente borrosa, establece "is_valid_image" en false, proporciona un mensaje amigable en español en "validation_error_message" (ej. "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda."), y deja el resto de los campos vacíos o nulos.
    - Si la imagen contiene una prenda de vestir reconocible, establece "is_valid_image" en true y "validation_error_message" en null.
    
    Debes responder ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
    {
      "is_valid_image": true,
      "validation_error_message": null,
      "tipo_prenda": "Tipo de prenda (ej. Camiseta, Camisa, Pantalón, Vestido, Chaqueta, Abrigo, Zapatos, Accesorio)",
      "color_dominante": "Código HEX (#RRGGBB) y nombre común en español",
      "colores_secundarios": ["#HEX1", "#HEX2"],
      "estilo_recomendado": "Estilo de moda (ej. Casual, Formal, Streetwear, Minimalista, Deportivo, Elegante, Urbano)",
      "corte": "Ajuste o corte (ej. Slim, Regular, Oversized, Recto)",
      "ocasion_recomendada": "Ocasión de uso (ej. Diario, Noche, Trabajo, Deporte, Fiesta)",
      "detalles": "Breve descripción visual de textura, patrón o acabados"
    }
    """

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": data_url,
                            "detail": "auto"
                        }
                    }
                ]
            }
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            )

        if resp.status_code != 200:
            logger.warning(
                f"[analyze_garment_openai] HTTP {resp.status_code}: {resp.text}. Retornando mock."
            )
            return DEFAULT_GARMENT_METADATA_MOCK

        result_json = resp.json()
        content = result_json["choices"][0]["message"]["content"] or "{}"
        data = json.loads(content.strip())
        data.setdefault("is_valid_image", True)
        data.setdefault("validation_error_message", None)
        try:
            validated = GarmentMetadata(**data)
            data["is_valid_image"] = validated.is_valid_image
            data["validation_error_message"] = validated.validation_error_message
        except Exception:
            pass
        return data
    except Exception as e:
        logger.warning(
            f"[analyze_garment_openai] Fallo en OpenAI ({type(e).__name__}: {e}). Retornando mock de respaldo."
        )
        return DEFAULT_GARMENT_METADATA_MOCK


async def analyze_colorimetry_openai(image_base64_or_url: str) -> dict:
    """
    Analiza la fotografía facial/frontal del usuario utilizando OpenAI GPT Vision (ej. gpt-4o-mini).
    Retorna datos de colorimetría estructurados compatibles con ColorimetryData.
    """
    api_key, model_name = _get_openai_credentials()

    if not image_base64_or_url or not image_base64_or_url.strip():
        raise HTTPException(
            status_code=400,
            detail="La fotografía facial (Base64 o URL) no puede estar vacía."
        )

    image_bytes, mime_type = await _resolve_image_bytes(image_base64_or_url)
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{b64_image}"

    prompt = """
    Eres un estilista profesional y consultor biométrico experto en teoría del color y colorimetría estacional de FitGlassAI / Vitra.
    Analiza con precisión la fotografía facial y frontal de la persona adjunta.
    
    Instrucciones de validación:
    - Acepta fotografías reales, selfies, retratos de estudio o capturas de cámara con cualquier iluminación, sombras, contraste, ángulos, resolución o tono de piel. Establece "is_valid_image" en true y "validation_error_message" en null.
    - ÚNICAMENTE establece "is_valid_image" en false si la imagen definitivamente NO contiene ningún rostro humano ni persona (por ejemplo, si muestra exclusivamente un perro, un coche, un paisaje desierto, comida o ropa sola sin rostro). En tal caso proporciona un mensaje explicativo amigable en "validation_error_message" (ej. "Esta imagen no parece ser de una persona. Por favor sube una foto tuya.") y deja el resto de campos en null.

    Instrucciones estrictas de extracción biométrica cromática:
    - Mide y extrae con total fidelidad el tono HEX real dominante (#RRGGBB) de la piel de la persona a partir de los píxeles de su rostro (frente, mejillas, sin sombras extremas ni reflejos especulares).
    - IMPORTANTE: No utilices valores fijos o predeterminados. Debes reconocer todo el espectro humano de fototipos y tonalidades:
      * Tez muy clara / pálida / nórdica (ej. rango #FFF0E5 a #F5D6C6)
      * Tez clara / marfil / beige (ej. rango #EDC4B3 a #DFAC89)
      * Tez trigueña / oliva / intermedia / canela (ej. rango #C68642 a #A0673B)
      * Tez morena oscura / afrodescendiente / ébano / negra profunda (ej. rango #6F4733 a #3A1F13 o #2B170B)
    - En "skin_tone", incluye primero el código HEX real medido de la piel seguido de una descripción entre paréntesis, por ejemplo: "#HEX (Subtono descriptivo)".
    - En "hair_color", mide e indica el código HEX real y nombre del color de su cabello visible, por ejemplo: "#HEX (Nombre)".
    - En "eye_color", mide e indica el código HEX real y nombre del color del iris de sus ojos, por ejemplo: "#HEX (Nombre)".
    - Determina su estación cromática real ("season", ej. Invierno Brillante, Otoño Cálido, Verano Suave, Primavera Brillante, etc.) evaluando el contraste real entre su piel, cabello y ojos.
    
    Estructura JSON requerida:
    {
      "is_valid_image": true,
      "validation_error_message": null,
      "skin_tone": "#HEX (Subtono descriptivo)",
      "hair_color": "#HEX (Nombre)",
      "eye_color": "#HEX (Nombre)",
      "season": "Estación cromática identificada",
      "palette_name": "Nombre descriptivo de la paleta",
      "description": "Explicación personalizada de cómo armoniza esta estación con el contraste real y tono medido de esta persona",
      "recommended_colors": [
        "#HEX1",
        "#HEX2",
        "#HEX3",
        "#HEX4",
        "#HEX5",
        "#HEX6"
      ],
      "colors_to_avoid": [
        "#HEX1",
        "#HEX2",
        "#HEX3"
      ]
    }
    
    Reglas:
    - Todos los códigos de color en recommended_colors y colors_to_avoid deben ser códigos HEX válidos (#RRGGBB).
    - Proporciona al menos 6 colores recomendados para prendas de vestir acordes a su estación.
    - Proporciona entre 3 y 5 colores a evitar.
    - Responde únicamente el objeto JSON sin texto introductorio ni formato extra.
    """

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": data_url,
                            "detail": "auto"
                        }
                    }
                ]
            }
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            )

        if resp.status_code != 200:
            logger.error(f"[analyze_colorimetry_openai] HTTP {resp.status_code}: {resp.text}")
            raise HTTPException(
                status_code=502,
                detail=f"Error en la comunicación con OpenAI ({resp.status_code}): {resp.text}"
            )

        result_json = resp.json()
        content = result_json["choices"][0]["message"]["content"] or "{}"
        data = json.loads(content.strip())
        data.setdefault("is_valid_image", True)
        data.setdefault("validation_error_message", None)
        try:
            validated = ColorimetryData(**data)
            data["is_valid_image"] = validated.is_valid_image
            data["validation_error_message"] = validated.validation_error_message
        except Exception:
            pass
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[analyze_colorimetry_openai] Error al llamar a OpenAI: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Error en la comunicación con el servicio OpenAI para colorimetría: {str(e)}"
        )
