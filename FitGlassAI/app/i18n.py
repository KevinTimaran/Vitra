"""Idioma de la petición actual.

La app envía la cabecera `Accept-Language` ("es" o "en") con el idioma elegido por el usuario. Un middleware la guarda
en un ContextVar para que los servicios de IA respondan en ese idioma sin tener que pasar el dato por cada función.
Español es el idioma por defecto (y el de los mensajes internos del backend).
"""
from contextvars import ContextVar
from typing import Optional

SUPPORTED_LANGUAGES = ("es", "en")
DEFAULT_LANGUAGE = "es"

_request_language: ContextVar[str] = ContextVar("request_language", default=DEFAULT_LANGUAGE)


def parse_accept_language(header: Optional[str]) -> str:
    """Primer idioma soportado de una cabecera Accept-Language ("en-US,en;q=0.9" -> "en"). Desconocido => español."""
    if not header:
        return DEFAULT_LANGUAGE
    for part in header.split(","):
        code = part.split(";")[0].strip().lower().replace("_", "-").split("-")[0]
        if code in SUPPORTED_LANGUAGES:
            return code
    return DEFAULT_LANGUAGE


def set_request_language(language: str):
    """Fija el idioma de la petición actual; devuelve el token para restaurarlo."""
    return _request_language.set(language if language in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE)


def reset_request_language(token) -> None:
    _request_language.reset(token)


def get_request_language() -> str:
    return _request_language.get()


# Mensajes de validación de imagen que la IA debe devolver literalmente (el cliente los reconoce por su inicio).
INVALID_GARMENT_MESSAGE = {
    "es": "No detectamos ropa en esta imagen. Por favor sube una foto clara de la prenda.",
    "en": "We couldn't detect clothing in this image. Please upload a clear photo of the garment.",
}
INVALID_PERSON_MESSAGE = {
    "es": "Esta imagen no parece ser de una persona. Por favor sube una foto tuya.",
    "en": "This image doesn't look like a person. Please upload a photo of yourself.",
}


def invalid_garment_message(language: Optional[str] = None) -> str:
    return INVALID_GARMENT_MESSAGE[language or get_request_language()]


def invalid_person_message(language: Optional[str] = None) -> str:
    return INVALID_PERSON_MESSAGE[language or get_request_language()]


def output_language_instruction(language: Optional[str] = None) -> str:
    """Instrucción que se añade al final de los prompts de IA para fijar el idioma de los textos libres."""
    lang = language or get_request_language()
    if lang == "en":
        return (
            "\n    IDIOMA DE SALIDA (obligatorio): escribe TODOS los valores de texto libre del JSON en INGLÉS "
            "(nombres de colores, tipo de prenda, estilo, corte, ocasión, detalles, estación cromática, nombre de la "
            "paleta, descripción, subtonos y validation_error_message). Las claves del JSON, los códigos HEX y los "
            "valores de las listas cerradas (category, sleeve, neck, fit...) no se traducen. Si la imagen no es válida, "
            f'usa exactamente este validation_error_message: "{{invalid_message}}".\n'
        )
    return (
        "\n    IDIOMA DE SALIDA (obligatorio): escribe todos los valores de texto libre del JSON en ESPAÑOL. "
        "Las claves del JSON, los códigos HEX y los valores de las listas cerradas no se traducen. Si la imagen no es "
        f'válida, usa exactamente este validation_error_message: "{{invalid_message}}".\n'
    )


def garment_language_instruction(language: Optional[str] = None) -> str:
    return output_language_instruction(language).replace("{invalid_message}", invalid_garment_message(language))


def person_language_instruction(language: Optional[str] = None) -> str:
    return output_language_instruction(language).replace("{invalid_message}", invalid_person_message(language))
