"""Códigos de error estables para el cliente.

Los mensajes (`detail`) del backend están en español. Para que la app los muestre en el idioma del usuario, cada
respuesta de error conocida incluye además un `code` estable (p. ej. "wrong_password"); el cliente traduce por código
y usa `detail` solo como respaldo.
"""
from typing import Optional

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.i18n import get_request_language

# Coincidencia exacta del texto -> código
EXACT_CODES = {
    "Dirección de correo electrónico inválida.": "email_invalid",
    "La contraseña debe tener al menos 6 caracteres.": "password_short",
    "La nueva contraseña debe tener al menos 6 caracteres.": "password_short",
    "Ya existe una cuenta registrada con este correo electrónico.": "account_exists",
    "No se pudo guardar la cuenta. Inténtalo de nuevo.": "save_failed",
    "Credenciales incorrectas o usuario no registrado.": "user_not_found",
    "Contraseña incorrecta. Verifica tu clave o restablece tu contraseña.": "wrong_password",
    "Debes iniciar sesión para cambiar tu contraseña.": "reset_login_required",
    "No puedes cambiar la contraseña de otra cuenta.": "reset_forbidden",
    "No se encontró ninguna cuenta registrada con este correo electrónico.": "reset_user_missing",
    "No se proporcionó el token de autenticación.": "token_missing",
    "Token inválido o expirado.": "token_invalid",
    "Token inválido o expirado": "token_invalid",
    "Se requiere iniciar sesión.": "login_required",
    "Cuenta no encontrada.": "account_missing",
    "Se requiere autenticación para actualizar el perfil de colorimetría.": "login_required",
}

# Coincidencia por inicio del texto -> código (mensajes que pueden venir de la IA o llevar datos variables)
PREFIX_CODES = (
    ("No detectamos ropa en esta imagen", "image_no_garment"),
    ("Esta imagen no parece ser de una persona", "image_no_person"),
    ("We couldn't detect clothing in this image", "image_no_garment"),
    ("This image doesn't look like a person", "image_no_person"),
)

# `detail` en inglés por código, para clientes que piden Accept-Language: en
EN_DETAILS = {
    "email_invalid": "Invalid email address.",
    "password_short": "The password must be at least 6 characters long.",
    "account_exists": "An account with this email already exists.",
    "save_failed": "Couldn't save the account. Please try again.",
    "user_not_found": "Incorrect credentials or user not registered.",
    "wrong_password": "Incorrect password. Check it or reset your password.",
    "reset_login_required": "You must sign in to change your password.",
    "reset_forbidden": "You can't change another account's password.",
    "reset_user_missing": "No account is registered with this email address.",
    "token_missing": "Sign in to continue.",
    "token_invalid": "Your session expired. Please sign in again.",
    "login_required": "Sign in to continue.",
    "account_missing": "Your account was not found.",
    "image_no_garment": "We couldn't detect clothing in this image. Please upload a clear photo of the garment.",
    "image_no_person": "This image doesn't look like a person. Please upload a photo of yourself.",
}


def code_for(detail: object) -> Optional[str]:
    if not isinstance(detail, str):
        return None
    if detail in EXACT_CODES:
        return EXACT_CODES[detail]
    for prefix, code in PREFIX_CODES:
        if detail.startswith(prefix):
            return code
    return None


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    body = {"detail": exc.detail}
    code = code_for(exc.detail)
    if code:
        body["code"] = code
        if get_request_language() == "en" and code in EN_DETAILS:
            body["detail"] = EN_DETAILS[code]
    return JSONResponse(body, status_code=exc.status_code, headers=getattr(exc, "headers", None))


def validation_code(errors: list) -> str:
    """Código para errores de validación de Pydantic (422)."""
    for err in errors:
        loc = err.get("loc") or []
        if "password" in loc and err.get("type") in ("string_too_short", "missing"):
            return "password_short"
    return "validation_error"


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = jsonable_encoder(exc.errors())
    return JSONResponse({"detail": errors, "code": validation_code(errors)}, status_code=422)
