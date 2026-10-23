from typing import Optional
from pydantic import BaseModel, Field


class UserProfileSetup(BaseModel):
    full_name: str = Field(..., max_length=50, description="Nombre completo del usuario (máximo 50 caracteres)")
    age: int = Field(..., ge=1, le=120, description="Edad del usuario (entre 1 y 120)")
    gender: Optional[str] = Field(default=None, description="Género del usuario ('female', 'male', 'non-binary')")
    face_image: Optional[str] = Field(default=None, description="Fotografía facial para colorimetría (Base64 o URL)")
    body_image: Optional[str] = Field(default=None, description="Fotografía de cuerpo entero para avatar 3D (Base64 o URL)")


class UserProfileSetupResponse(BaseModel):
    status: str = Field(default="success", description="Estado de la operación")
    message: str = Field(default="Perfil configurado correctamente", description="Mensaje informativo")
    full_name: Optional[str] = Field(default=None, description="Nombre configurado")
    age: Optional[int] = Field(default=None, description="Edad configurada")
    gender: Optional[str] = Field(default=None, description="Género configurado")
    avatar_url: Optional[str] = Field(default=None, description="URL del modelo 3D (.glb) asignado u optimizado")
    avatar_type: Optional[str] = Field(default=None, description="Tipo de avatar: 'custom_3d' o 'preset'")
    base_garments: Optional[list] = Field(default_factory=list, description="Lista de prendas base asignadas al avatar")
    color_profile: Optional[dict] = Field(default=None, description="Perfil de colorimetría facial del usuario")

