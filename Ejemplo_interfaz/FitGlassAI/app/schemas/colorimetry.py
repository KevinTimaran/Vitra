from pydantic import BaseModel, Field
from typing import List, Optional


class ColorimetryRequest(BaseModel):
    image: Optional[str] = Field(None, description="Fotografía facial o frontal del usuario en Base64 o URL")
    image_data: Optional[str] = Field(None, description="Alias para imagen en Base64 o URL")
    face_image: Optional[str] = Field(None, description="Alias para fotografía facial en Base64 o URL")

    def get_image(self) -> str:
        img = self.image or self.image_data or self.face_image
        if not img or not img.strip():
            raise ValueError("Se requiere 'image', 'image_data' o 'face_image' con una imagen en Base64 o URL.")
        return img.strip()


class ColorimetryData(BaseModel):
    is_valid_image: bool = Field(True, description="Indica si la imagen muestra claramente un rostro o persona")
    validation_error_message: Optional[str] = Field(None, description="Mensaje explicativo si la imagen no es válida")
    skin_tone: Optional[str] = Field(None, description="Código HEX y descripción del tono de piel")
    hair_color: Optional[str] = Field(None, description="Código HEX del color de cabello")
    eye_color: Optional[str] = Field(None, description="Código HEX del color de ojos")
    season: Optional[str] = Field(None, description="Estación de colorimetría (ej. Invierno Brillante, Otoño Cálido)")
    palette_name: Optional[str] = Field(None, description="Nombre descriptivo de la paleta")
    description: Optional[str] = Field(None, description="Explicación estética de la armonía de color")
    recommended_colors: List[str] = Field(default_factory=list, description="Lista de códigos HEX de prendas recomendadas")
    colors_to_avoid: Optional[List[str]] = Field(default_factory=list, description="Lista de colores no recomendados")


class ColorimetryResponse(BaseModel):
    success: bool = True
    data: Optional[ColorimetryData] = None
    error: Optional[str] = None
