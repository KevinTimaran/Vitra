from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

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
    success: bool
    data: Optional[GarmentAnalysis] = None
    error: Optional[str] = None
