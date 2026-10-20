from pydantic import BaseModel, Field
from typing import Optional


class TryOnRequest(BaseModel):
    human_image: str = Field(..., description="URL o imagen Base64 de la persona")
    garment_image: str = Field(..., description="URL o imagen Base64 de la prenda")
    category: Optional[str] = Field("upper_body", description="Categoría de la prenda (upper_body, lower_body, dresses)")
    garment_description: Optional[str] = Field("clothing", description="Descripción de la prenda")


class TryOnResponse(BaseModel):
    image_2d_url: str = Field(..., description="URL de la imagen 2D fusionada (VTON)")
    model_3d_url: str = Field(..., description="URL de descarga del modelo 3D (.glb)")
    status: str = Field("completed", description="Estado del proceso de orquestación")
