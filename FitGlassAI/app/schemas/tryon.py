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


class CascadeGarmentInput(BaseModel):
    id: Optional[str] = Field(None, description="ID único de la prenda en el armario o base de datos")
    image: Optional[str] = Field(None, description="URL o imagen Base64 de la prenda")
    category: Optional[str] = Field("upper_body", description="Categoría de la prenda (upper_body, lower_body, dresses, outerwear, tops, pants)")
    name: Optional[str] = Field("clothing", description="Nombre o descripción de la prenda")


class CascadeTryOnRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="ID o email del usuario para recuperar su foto corporal base si no se envía")
    human_image: Optional[str] = Field(None, description="Imagen 2D base de la persona (A-pose recortada). Si es None, se consulta en el perfil del usuario")
    garment_ids: Optional[List[str]] = Field(None, description="Lista de IDs de las prendas seleccionadas")
    garments: Optional[List[CascadeGarmentInput]] = Field(None, description="Lista de prendas con datos e imágenes para el encadenamiento")
    allow_fallback: Optional[bool] = Field(True, description="Si es True, aplica imágenes/modelos de respaldo en caso de fallos de API externa")


class CascadeStepInfo(BaseModel):
    step_number: int = Field(..., description="Número de paso en la cascada")
    garment_name: str = Field(..., description="Nombre de la prenda aplicada")
    category: str = Field(..., description="Categoría IDM-VTON de la prenda")
    dressed_image_url: str = Field(..., description="URL de la imagen 2D resultante de este paso")


class CascadeTryOnResponse(BaseModel):
    status: str = Field("completed", description="Estado de la cascada (completed, processing, failed)")
    user_id: Optional[str] = Field(None, description="ID del usuario")
    base_human_image_url: str = Field(..., description="Imagen 2D original utilizada como punto de partida en el Paso 0")
    final_dressed_image_url: str = Field(..., description="Imagen 2D final con todas las prendas vestidas en cascada")
    model_3d_url: str = Field(..., description="URL del modelo 3D unificado (.glb) generado por Tripo3D a partir de la imagen final")
    steps_completed: List[CascadeStepInfo] = Field(default_factory=list, description="Historial de pasos de la cascada 2D")
    total_garments_applied: int = Field(0, description="Cantidad total de prendas superpuestas en el ciclo")
    message: Optional[str] = Field("Look en cascada generado exitosamente", description="Mensaje explicativo")

