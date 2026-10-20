from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: str = Field(..., description="Correo electrónico del usuario")
    password: str = Field(..., min_length=6, description="Contraseña de al menos 6 caracteres")
    name: Optional[str] = Field(default=None, description="Nombre opcional del usuario")


class RegisterResponse(BaseModel):
    message: str = Field(..., description="Mensaje de confirmación del registro")
    email: str = Field(..., description="Correo electrónico del usuario registrado")


class LoginRequest(BaseModel):
    email: str = Field(..., description="Correo electrónico del usuario")
    password: str = Field(..., description="Contraseña del usuario")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Token de acceso JWT")
    token_type: str = Field(default="bearer", description="Tipo de token (bearer)")
    email: Optional[str] = Field(default=None, description="Email del usuario autenticado")
