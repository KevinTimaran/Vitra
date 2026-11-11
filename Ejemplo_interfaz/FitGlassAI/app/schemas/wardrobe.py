from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

MAX_ITEMS_PER_SYNC = 500


class WardrobeItem(BaseModel):
    """Prenda o look. Se aceptan campos extra (el cliente evoluciona), solo id y nombre son obligatorios."""
    model_config = ConfigDict(extra="allow")

    id: str = Field(..., min_length=1, max_length=120)
    name: Optional[str] = Field(None, max_length=300)
    title: Optional[str] = Field(None, max_length=300)
    updatedAt: Optional[int] = Field(None, description="Milisegundos desde epoch; se usa para last-write-wins")


class Tombstone(BaseModel):
    id: str = Field(..., min_length=1, max_length=120)
    updatedAt: Optional[int] = None


class CategoriesPayload(BaseModel):
    items: List[str] = Field(default_factory=list, max_length=100)
    updatedAt: Optional[int] = None


class SyncRequest(BaseModel):
    garments: List[WardrobeItem] = Field(default_factory=list, max_length=MAX_ITEMS_PER_SYNC)
    looks: List[WardrobeItem] = Field(default_factory=list, max_length=MAX_ITEMS_PER_SYNC)
    deletedGarments: List[Tombstone] = Field(default_factory=list, max_length=MAX_ITEMS_PER_SYNC)
    deletedLooks: List[Tombstone] = Field(default_factory=list, max_length=MAX_ITEMS_PER_SYNC)
    categories: Optional[CategoriesPayload] = None


class WardrobeState(BaseModel):
    garments: List[Dict[str, Any]]
    looks: List[Dict[str, Any]]
    categories: Optional[CategoriesPayload] = None
    deletedGarments: List[str] = Field(default_factory=list)
    deletedLooks: List[str] = Field(default_factory=list)
