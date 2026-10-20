import os
import json
import base64
import httpx
from fastapi import HTTPException
from google import genai
from google.genai import types

from app.config import settings
from app.schemas.garment import GarmentAnalysis


def analyze_garment_image(image_bytes: bytes, mime_type: str) -> GarmentAnalysis:
    """Función síncrona para compatibilidad con endpoints y tests previos."""
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY no está configurada")

    model_name = settings.GEMINI_MODEL or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    client = genai.Client(api_key=api_key)

    prompt = """
    Analiza la siguiente imagen de una prenda de ropa.
    Debes devolver UNICAMENTE un objeto JSON válido que cumpla exactamente con la siguiente estructura y reglas.
    
    Reglas:
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
            return base64.b64decode(encoded), mime
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Data URI base64 inválido: {str(e)}"
            )

    # Caso 3: Base64 en bruto
    try:
        data = base64.b64decode(image_input)
        return data, "image/jpeg"
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Cadena Base64 inválida: {str(e)}"
        )


FALLBACK_GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash"]


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
    """
    Analiza una prenda de ropa utilizando Google Gemini de forma asíncrona.
    Extrae metadatos estructurados: tipo de prenda, color dominante y estilo recomendado.
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

    image_bytes, mime_type = await _resolve_image_bytes(image_base64_or_url)

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    prompt = """
    Eres el motor analítico de moda de FitGlassAI / Vitra.
    Analiza la fotografía de la prenda adjunta y extrae sus metadatos principales.
    Debes responder ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
    {
      "tipo_prenda": "Tipo de prenda (ej. Camiseta, Camisa, Pantalón, Vestido, Chaqueta, Abrigo, Zapatos, Accesorio)",
      "color_dominante": "Código HEX (#RRGGBB) y nombre común en español",
      "colores_secundarios": ["#HEX1", "#HEX2"],
      "estilo_recomendado": "Estilo de moda (ej. Casual, Formal, Streetwear, Minimalista, Deportivo, Elegante, Urbano)",
      "corte": "Ajuste o corte (ej. Slim, Regular, Oversized, Recto)",
      "ocasion_recomendada": "Ocasión de uso (ej. Diario, Noche, Trabajo, Deporte, Fiesta)",
      "detalles": "Breve descripción visual de textura, patrón o acabados"
    }
    """

    try:
        raw_text = await _generate_content_with_fallback(
            client=client,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error en la comunicación con el servicio de Gemini: {str(e)}"
        )

    try:
        raw_text = raw_text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:-3]
            
        data = json.loads(raw_text.strip())
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la respuesta estructurada de Gemini: {str(e)}"
        )


async def analyze_colorimetry(image_base64_or_url: str) -> dict:
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
    
    Determina su armonía cromática y devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
    {
      "skin_tone": "#E5B899 (Tono de piel)",
      "hair_color": "#2C1B18 (Color de cabello)",
      "eye_color": "#3B261C (Color de ojos)",
      "season": "Estación de color (ej. Invierno Brillante, Otoño Cálido, Verano Suave, Primavera Cálida)",
      "palette_name": "Nombre descriptivo de la paleta",
      "description": "Explicación detallada de por qué esta estación armoniza con su contraste natural de piel, ojos y cabello, y cómo realza su rostro.",
      "recommended_colors": [
        "#1E3A8A",
        "#047857",
        "#B91C1C",
        "#7C3AED",
        "#0F172A",
        "#FFFFFF"
      ],
      "colors_to_avoid": [
        "#D97706",
        "#84CC16",
        "#F59E0B"
      ]
    }
    
    Reglas:
    - Todos los códigos de color en recommended_colors y colors_to_avoid deben ser códigos HEX válidos (#RRGGBB).
    - Proporciona al menos 6 colores recomendados para prendas de vestir.
    - Proporciona entre 3 y 5 colores a evitar.
    - Responde únicamente el objeto JSON sin texto introductorio ni formato extra.
    """

    try:
        raw_text = await _generate_content_with_fallback(
            client=client,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
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
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la respuesta estructurada de colorimetría: {str(e)}"
        )

