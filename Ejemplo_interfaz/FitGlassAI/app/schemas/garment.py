from pydantic import BaseModel, Field
from typing import List, Optional, Union
from enum import Enum


class GarmentRequest(BaseModel):
    image_data: str = Field(..., description="Imagen en formato Base64 o URL para procesamiento")


class GarmentAnalysisRequest(BaseModel):
    image: Optional[str] = Field(None, description="Imagen en formato Base64 o URL")
    image_data: Optional[str] = Field(None, description="Alias para imagen en formato Base64 o URL")

    def get_image(self) -> str:
        val = self.image or self.image_data
        if not val or not val.strip():
            raise ValueError("Se requiere el campo 'image' o 'image_data' con una URL o Base64.")
        return val.strip()


class GarmentMetadata(BaseModel):
    tipo_prenda: Optional[str] = Field(None, description="Tipo o categoría de la prenda detectada")
    color_dominante: Optional[str] = Field(None, description="Color dominante de la prenda")
    colores_secundarios: Optional[List[str]] = Field(default_factory=list, description="Lista de colores secundarios")
    estilo_recomendado: Optional[str] = Field(None, description="Estilo de moda sugerido")
    corte: Optional[str] = Field(None, description="Corte o ajuste de la prenda")
    ocasion_recomendada: Optional[str] = Field(None, description="Ocasión de uso recomendada")
    detalles: Optional[str] = Field(None, description="Detalles visuales adicionales")


# Enums y modelos conservados para retrocompatibilidad
class CategoryEnum(str, Enum):
    Tops = "Tops"
    Outerwear = "Outerwear"
    Pants = "Pants"
    Shoes = "Shoes"
    Accessories = "Accessories"
    Other = "Other"


class SleeveEnum(str, Enum):
    Sleeveless = "Sleeveless"
    Short = "Short"
    Long = "Long"
    Unknown = "Unknown"


class NeckEnum(str, Enum):
    Crew = "Crew"
    V_Neck = "V-Neck"
    Polo = "Polo"
    Mock = "Mock"
    Hooded = "Hooded"
    None_ = "None"
    Unknown = "Unknown"


class FitEnum(str, Enum):
    Skinny = "Skinny"
    Slim = "Slim"
    Regular = "Regular"
    Relaxed = "Relaxed"
    Oversized = "Oversized"
    Unknown = "Unknown"


class GarmentAnalysis(BaseModel):
    category: CategoryEnum = Field(description="Categoría principal de la prenda")
    sleeve: SleeveEnum = Field(description="Tipo de manga de la prenda")
    neck: NeckEnum = Field(description="Tipo de cuello de la prenda")
    fit: FitEnum = Field(description="Corte o ajuste de la prenda")
    dominantColor: str = Field(description="Color dominante en formato HEX (ej. #FFFFFF)")
    secondaryColors: List[str] = Field(description="Lista de colores secundarios en formato HEX")
    pattern: str = Field(description="Patrón de la prenda (ej. Solid, Striped, Plaid)")
    hasPocket: bool = Field(description="¿Tiene bolsillos visibles?")
    hasButtons: bool = Field(description="¿Tiene botones visibles?")
    hasZipper: bool = Field(description="¿Tiene cremallera visible?")
    confidence: float = Field(ge=0.0, le=1.0, description="Confianza del análisis entre 0 y 1")


class GarmentAnalysisResponse(BaseModel):
    success: bool = True
    data: Optional[Union[GarmentMetadata, GarmentAnalysis, dict]] = None
    error: Optional[str] = None
