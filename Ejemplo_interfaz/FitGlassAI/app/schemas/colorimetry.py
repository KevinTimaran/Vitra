from pydantic import BaseModel, Field
from typing import List, Optional


class ColorimetryRequest(BaseModel):
    image: Optional[str] = Field(None, description="Fotografía facial o frontal del usuario en Base64 o URL")
    image_data: Optional[str] = Field(None, description="Alias para imagen en Base64 o URL")

    def get_image(self) -> str:
        img = self.image or self.image_data
        if not img or not img.strip():
            raise ValueError("Se requiere 'image' o 'image_data' con una imagen en Base64 o URL.")
        return img.strip()


class ColorimetryData(BaseModel):
    skin_tone: str = Field(..., description="Código HEX y descripción del tono de piel")
    hair_color: str = Field(..., description="Código HEX del color de cabello")
    eye_color: Optional[str] = Field(None, description="Código HEX del color de ojos")
    season: str = Field(..., description="Estación de colorimetría (ej. Invierno Brillante, Otoño Cálido)")
    palette_name: Optional[str] = Field(None, description="Nombre descriptivo de la paleta")
    description: str = Field(..., description="Explicación estética de la armonía de color")
    recommended_colors: List[str] = Field(..., description="Lista de códigos HEX de prendas recomendadas")
    colors_to_avoid: Optional[List[str]] = Field(default_factory=list, description="Lista de colores no recomendados")


class ColorimetryResponse(BaseModel):
    success: bool = True
    data: Optional[ColorimetryData] = None
    error: Optional[str] = None
