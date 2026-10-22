from pydantic import BaseModel, Field, model_validator
from typing import Optional, List


class GarmentItemPayload(BaseModel):
    image: str = Field(..., description="URL o imagen Base64 de la prenda")
    category: Optional[str] = Field("upper_body", description="Categoría de la prenda (upper_body, lower_body, dresses, shoes, accessories)")
    name: Optional[str] = Field("clothing", description="Descripción o nombre de la prenda")


class TryOnRequest(BaseModel):
    human_image: str = Field(..., description="URL o imagen Base64 de la persona")
    garment_image: Optional[str] = Field(None, description="URL o imagen Base64 de la prenda")
    category: Optional[str] = Field("upper_body", description="Categoría de la prenda (upper_body, lower_body, dresses)")
    garment_description: Optional[str] = Field("clothing", description="Descripción de la prenda")
    garments: Optional[List[GarmentItemPayload]] = Field(None, description="Lista de múltiples prendas del look completo")
    allow_fallback: Optional[bool] = Field(False, description="Si es True, aplica modelos 3D o vistas de respaldo si las APIs externas no tienen créditos")

    @model_validator(mode="after")
    def check_at_least_one_garment(self):
        if not self.garment_image and (not self.garments or len(self.garments) == 0):
            raise ValueError("Se requiere 'garment_image' o una lista 'garments' con al menos una prenda.")
        return self


class TryOnResponse(BaseModel):
    image_2d_url: str = Field(..., description="URL de la imagen 2D fusionada (VTON)")
    model_3d_url: str = Field(..., description="URL de descarga del modelo 3D (.glb)")
    status: str = Field("completed", description="Estado del proceso de orquestación")
