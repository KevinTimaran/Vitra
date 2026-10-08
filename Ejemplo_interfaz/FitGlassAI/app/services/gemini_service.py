import os
import json
from google import genai
from google.genai import types
from app.schemas.garment import GarmentAnalysis

def analyze_garment_image(image_bytes: bytes, mime_type: str) -> GarmentAnalysis:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY no está configurada")

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
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
        # En caso de que haya bloques de código
        if text_response.startswith("```json"):
            text_response = text_response[7:-3]
        elif text_response.startswith("```"):
            text_response = text_response[3:-3]
            
        data = json.loads(text_response.strip())
        analysis = GarmentAnalysis(**data)
        return analysis
    except Exception as e:
        raise ValueError(f"Error al procesar la respuesta de Gemini: {str(e)}")
