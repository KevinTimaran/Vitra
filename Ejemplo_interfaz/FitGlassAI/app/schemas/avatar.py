from pydantic import BaseModel, Field
from typing import Optional


class AvatarGenerateRequest(BaseModel):
    image: Optional[str] = Field(None, description="Fotografía de cuerpo entero del usuario en Base64 o URL")
    image_data: Optional[str] = Field(None, description="Alias para imagen en Base64 o URL")

    def get_image(self) -> str:
        img = self.image or self.image_data
        if not img or not img.strip():
            raise ValueError("Se requiere 'image' o 'image_data' con una fotografía de cuerpo entero.")
        return img.strip()


class AvatarGenerateResponse(BaseModel):
    avatar_url: str = Field(..., description="URL de descarga del archivo avatar_base.glb")
    status: str = Field("completed", description="Estado de la generación de avatar")
