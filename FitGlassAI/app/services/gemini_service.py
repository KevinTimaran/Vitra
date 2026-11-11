import os
import json
import base64
import logging
import httpx
from fastapi import HTTPException
from google import genai
from google.genai import types

from app.config import settings
from app.schemas.garment import GarmentAnalysis, GarmentMetadata
from app.schemas.colorimetry import ColorimetryData
from app.i18n import garment_language_instruction, person_language_instruction

logger = logging.getLogger(__name__)

DEFAULT_GARMENT_METADATA_MOCK = {
    "is_valid_image": True,
    "validation_error_message": None,
    "tipo_prenda": "Prenda de prueba",
    "color_dominante": "#000000",
    "colores_secundarios": ["#FFFFFF"],
    "estilo_recomendado": "Casual",
    "corte": "Regular",
    "ocasion_recomendada": "Diario",
    "detalles": "Metadatos generados por el mock de respaldo debido a un fallo en Gemini."
}


def analyze_garment_image(image_bytes: bytes, mime_type: str) -> GarmentAnalysis:
    """Función síncrona para compatibilidad con endpoints y tests previos."""
    if settings.active_ai_provider == "openai":
        from app.services.openai_service import analyze_garment_image_openai
        return analyze_garment_image_openai(image_bytes, mime_type)

    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY no está configurada")

    model_name = settings.GEMINI_MODEL or os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    client = genai.Client(api_key=api_key)

    prompt = """
    Analiza la siguiente imagen de una prenda de ropa.
    Debes devolver UNICAMENTE un objeto JSON válido que cumpla exactamente con la siguiente estructura y reglas.
    
    Reglas estrictas de validación:
    - Primero, determina si la imagen realmente contiene una prenda de ropa reconocible. Si muestra un objeto aleatorio (perro, coche, comida) o está completamente borrosa, establece "is_valid_image" en false, proporciona un mensaje amigable en "validation_error_message" (ej. "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda."), y deja el resto de los campos vacíos o por defecto.
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
    """ + garment_language_instruction()

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GarmentAnalysis,
            )
        )
    except Exception as e:
        raise ValueError(f"Error de comunicación con Gemini: {str(e)}")

    try:
        text_response = response.text
        if text_response.startswith("```json"):
            text_response = text_response[7:-3]
        elif text_response.startswith("```"):
            text_response = text_response[3:-3]
            
        data = json.loads(text_response.strip())
        data.setdefault("is_valid_image", True)
        data.setdefault("validation_error_message", None)
        analysis = GarmentAnalysis(**data)
        return analysis
    except Exception as e:
        raise ValueError(f"Error al procesar la respuesta de Gemini: {str(e)}")


async def _resolve_image_bytes(image_input: str) -> tuple[bytes, str]:
    """Descarga o decodifica la imagen suministrada (URL, data URI o base64)."""
    image_input = image_input.strip()

    # Caso 1: URL HTTP/HTTPS
    if image_input.startswith("http://") or image_input.startswith("https://"):
        try:
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                res = await http_client.get(image_input)
                if res.status_code != 200:
                    raise HTTPException(
                        status_code=400,
                        detail=f"No se pudo descargar la imagen desde la URL remota (HTTP {res.status_code})"
                    )
                mime = res.headers.get("content-type", "image/jpeg").split(";")[0].strip()
                if not mime.startswith("image/"):
                    mime = "image/jpeg"
                return res.content, mime
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error al descargar la imagen desde la URL: {str(e)}"
            )

    # Caso 2: Data URI (data:image/png;base64,....)
    if image_input.startswith("data:"):
        try:
            header, encoded = image_input.split(",", 1)
            mime = "image/jpeg"
            if ";" in header and ":" in header:
                mime = header.split(":")[1].split(";")[0].strip()
            missing_padding = len(encoded) % 4
            if missing_padding:
                encoded += "=" * (4 - missing_padding)
            return base64.b64decode(encoded), mime
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Data URI base64 inválido: {str(e)}"
            )

    # Caso 3: Base64 en bruto
    try:
        missing_padding = len(image_input) % 4
        padded_input = image_input + ("=" * (4 - missing_padding)) if missing_padding else image_input
        data = base64.b64decode(padded_input, validate=True)
        return data, "image/jpeg"
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Cadena Base64 inválida: {str(e)}"
        )


FALLBACK_GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"]


async def _generate_content_with_fallback(
    client: genai.Client, contents: list, config: types.GenerateContentConfig
) -> str:
    primary = settings.GEMINI_MODEL or "gemini-3.5-flash"
    candidates = [primary] + [m for m in FALLBACK_GEMINI_MODELS if m != primary]

    last_exc = None
    for m in candidates:
        try:
            res = await client.aio.models.generate_content(
                model=m,
                contents=contents,
                config=config,
            )
            return res.text
        except Exception as e:
            last_exc = e
            continue

    if last_exc:
        raise last_exc
    raise RuntimeError("No se pudo obtener respuesta de ningún modelo Gemini.")


async def analyze_garment(image_base64_or_url: str) -> dict:
    """Analiza una prenda de ropa utilizando el proveedor activo (Gemini u OpenAI) de forma asíncrona."""
    if settings.active_ai_provider == "openai":
        from app.services.openai_service import analyze_garment_openai
        return await analyze_garment_openai(image_base64_or_url)
    """
    Analiza una prenda de ropa utilizando Google Gemini de forma asíncrona.
    Extrae metadatos estructurados: tipo de prenda, color dominante y estilo recomendado.
    Si Gemini falla (por cuota, 503, timeout o error de red), retorna metadatos simulados de respaldo.
    """
    if not settings.has_gemini:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY no está configurada en las variables de entorno."
        )

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
        logger.warning(f"[analyze_garment] Error al decodificar la imagen: {e}.")
        raise HTTPException(status_code=400, detail=f"No se pudo leer la imagen: {e}")

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = """
        Eres el motor analítico de moda de FitGlassAI / Vitra.
        Analiza la fotografía de la prenda adjunta y extrae sus metadatos principales.
        
        Instrucciones estrictas de validación:
        - Primero, determina si la imagen realmente contiene una prenda de ropa reconocible. Si muestra un objeto aleatorio (perro, coche, comida) o está completamente borrosa, establece "is_valid_image" en false, proporciona un mensaje amigable en "validation_error_message" (ej. "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda."), y deja el resto de los campos vacíos o nulos.
        - Si la imagen contiene una prenda de vestir reconocible, establece "is_valid_image" en true y "validation_error_message" en null.
        
        Debes responder ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
        {
          "is_valid_image": true,
          "validation_error_message": null,
          "tipo_prenda": "Tipo de prenda (ej. Camiseta, Camisa, Pantalón, Vestido, Chaqueta, Abrigo, Zapatos, Accesorio)",
          "color_dominante": "Código HEX (#RRGGBB) y nombre común del color",
          "colores_secundarios": ["#HEX1", "#HEX2"],
          "estilo_recomendado": "Estilo de moda (ej. Casual, Formal, Streetwear, Minimalista, Deportivo, Elegante, Urbano)",
          "corte": "Ajuste o corte (ej. Slim, Regular, Oversized, Recto)",
          "ocasion_recomendada": "Ocasión de uso (ej. Diario, Noche, Trabajo, Deporte, Fiesta)",
          "detalles": "Breve descripción visual de textura, patrón o acabados"
        }
        """ + garment_language_instruction()

        raw_text = await _generate_content_with_fallback(
            client=client,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GarmentMetadata,
            )
        )

        raw_text = raw_text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:-3]
            
        data = json.loads(raw_text.strip())
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
        logger.warning(f"[analyze_garment] Fallo en servicio Gemini ({type(e).__name__}: {e}).")
        raise HTTPException(status_code=502, detail=f"El análisis de la prenda no está disponible ahora: {type(e).__name__}")


async def analyze_colorimetry(image_base64_or_url: str) -> dict:
    """Analiza la fotografía facial/frontal del usuario utilizando el proveedor activo (Gemini u OpenAI)."""
    if settings.active_ai_provider == "openai":
        from app.services.openai_service import analyze_colorimetry_openai
        return await analyze_colorimetry_openai(image_base64_or_url)
    """
    Analiza la fotografía facial/frontal del usuario utilizando Google Gemini (Vision).
    Extrae la paleta de colorimetría estacional:
    - Tono de piel (HEX y descripción)
    - Color de cabello (HEX)
    - Color de ojos (HEX)
    - Estación de color (ej. Invierno Brillante, Otoño Cálido, etc.)
    - Nombre de la paleta y explicación estética
    - Lista de códigos HEX de prendas favorecedoras (recommended_colors)
    - Lista de códigos HEX a evitar (colors_to_avoid)
    """
    if not settings.has_gemini:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY no está configurada en las variables de entorno."
        )

    if not image_base64_or_url or not image_base64_or_url.strip():
        raise HTTPException(
            status_code=400,
            detail="La fotografía facial (Base64 o URL) no puede estar vacía."
        )

    image_bytes, mime_type = await _resolve_image_bytes(image_base64_or_url)

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

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
    """ + person_language_instruction()

    try:
        raw_text = await _generate_content_with_fallback(
            client=client,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ColorimetryData,
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error en la comunicación con el servicio Gemini para colorimetría: {str(e)}"
        )

    try:
        raw_text = raw_text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:-3]
            
        data = json.loads(raw_text.strip())
        data.setdefault("is_valid_image", True)
        data.setdefault("validation_error_message", None)
        try:
            validated = ColorimetryData(**data)
            data["is_valid_image"] = validated.is_valid_image
            data["validation_error_message"] = validated.validation_error_message
        except Exception:
            pass
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la respuesta estructurada de colorimetría: {str(e)}"
        )

