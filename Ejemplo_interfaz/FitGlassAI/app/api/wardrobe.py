"""API del armario: prendas, looks y categorías por usuario (SQLite).

Todas las rutas exigen un token y trabajan SIEMPRE con el correo del token: un usuario nunca ve ni toca
datos de otro. La fusión usa last-write-wins por `updatedAt` (ms).
"""
import json
import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app import db as vitra_db
from app.api.auth import _resolve_base_url, users_db
from app.schemas.wardrobe import CategoriesPayload, SyncRequest, Tombstone, WardrobeItem, WardrobeState
from app.services import photo_store
from app.services.auth_service import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer(auto_error=False)

MAX_ITEM_JSON_BYTES = 64 * 1024          # tamaño máximo de una prenda/look sin imágenes
MAX_IMAGE_DATA_URI_CHARS = 12_000_000    # ~9 MB de imagen
IMAGE_FIELDS = ("imageUrl", "image2dUrl", "image")


def current_email(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere iniciar sesión.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    email = (payload.get("sub") or payload.get("email") or "").lower()
    if not email or email not in users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cuenta no encontrada.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return email


# ---------------------------------------------------------------- imágenes
def _store_images(data: Dict[str, Any]) -> Dict[str, Any]:
    """Los data URI de imagen se guardan en el almacén privado y en la fila queda `photo://hash`."""
    for field in IMAGE_FIELDS:
        value = data.get(field)
        if isinstance(value, str) and value.startswith("data:"):
            if len(value) > MAX_IMAGE_DATA_URI_CHARS:
                raise HTTPException(status_code=413, detail=f"La imagen '{field}' es demasiado grande.")
            ref = photo_store.save_photo(value)
            if not ref:
                raise HTTPException(status_code=400, detail=f"La imagen '{field}' no es un PNG/JPEG/WebP válido.")
            data[field] = ref
        elif isinstance(value, str) and value.startswith("file:"):
            # Un URI local del móvil no sirve a otros dispositivos: no se guarda como imagen remota.
            data[field] = None
    return data


def _expand_images(data: Dict[str, Any], base_url: str) -> Dict[str, Any]:
    """`photo://hash` -> URL absoluta (la URL pública de ngrok puede cambiar entre ejecuciones)."""
    for field in IMAGE_FIELDS:
        value = data.get(field)
        if isinstance(value, str) and value.startswith(photo_store.PHOTO_PREFIX):
            name = value[len(photo_store.PHOTO_PREFIX):]
            data[field] = f"{base_url.rstrip('/')}/api/wardrobe/image/{name}"
    return data


def _prepare_item(item: WardrobeItem) -> tuple[str, Dict[str, Any], int]:
    data = item.model_dump(exclude_none=False)
    updated_at = int(data.get("updatedAt") or vitra_db.now_ms())
    data["updatedAt"] = updated_at
    data = _store_images(data)
    if len(json.dumps(data, ensure_ascii=False).encode("utf-8")) > MAX_ITEM_JSON_BYTES:
        raise HTTPException(status_code=413, detail=f"El elemento '{item.id}' es demasiado grande.")
    return item.id, data, updated_at


def _state(email: str, base_url: str) -> WardrobeState:
    return WardrobeState(
        garments=[_expand_images(g, base_url) for g in vitra_db.list_items("garments", email)],
        looks=[_expand_images(l, base_url) for l in vitra_db.list_items("looks", email)],
        categories=_categories(email),
        deletedGarments=vitra_db.list_deleted_ids("garments", email),
        deletedLooks=vitra_db.list_deleted_ids("looks", email),
    )


def _categories(email: str) -> Optional[CategoriesPayload]:
    cats = vitra_db.get_categories(email)
    return CategoriesPayload(items=cats["items"], updatedAt=cats["updatedAt"]) if cats else None


# ---------------------------------------------------------------- rutas
@router.get("", response_model=WardrobeState)
@router.get("/", response_model=WardrobeState, include_in_schema=False)
async def get_wardrobe(request: Request, email: str = Depends(current_email)):
    return _state(email, _resolve_base_url(request))


@router.put("/garments/{item_id}")
async def put_garment(item_id: str, item: WardrobeItem, request: Request, email: str = Depends(current_email)):
    return _put("garments", item_id, item, email, request)


@router.put("/looks/{item_id}")
async def put_look(item_id: str, item: WardrobeItem, request: Request, email: str = Depends(current_email)):
    return _put("looks", item_id, item, email, request)


def _put(table: str, item_id: str, item: WardrobeItem, email: str, request: Request):
    if item.id != item_id:
        raise HTTPException(status_code=400, detail="El id de la ruta y del cuerpo no coinciden.")
    _id, data, updated_at = _prepare_item(item)
    applied = vitra_db.upsert_item(table, email, _id, data, updated_at)
    return {"applied": applied, "item": _expand_images(dict(data), _resolve_base_url(request))}


@router.delete("/garments/{item_id}")
async def delete_garment(item_id: str, updatedAt: Optional[int] = None, email: str = Depends(current_email)):
    return {"applied": vitra_db.delete_item("garments", email, item_id, updatedAt or vitra_db.now_ms())}


@router.delete("/looks/{item_id}")
async def delete_look(item_id: str, updatedAt: Optional[int] = None, email: str = Depends(current_email)):
    return {"applied": vitra_db.delete_item("looks", email, item_id, updatedAt or vitra_db.now_ms())}


@router.put("/categories")
async def put_categories(payload: CategoriesPayload, email: str = Depends(current_email)):
    applied = vitra_db.set_categories(email, payload.items, payload.updatedAt or vitra_db.now_ms())
    return {"applied": applied, "categories": _categories(email)}


@router.post("/sync", response_model=WardrobeState)
async def sync_wardrobe(payload: SyncRequest, request: Request, email: str = Depends(current_email)):
    """Fusiona lo que envía el cliente con el servidor (last-write-wins) y devuelve el estado resultante."""
    prepared_g = [_prepare_item(i) for i in payload.garments]
    prepared_l = [_prepare_item(i) for i in payload.looks]
    for item_id, data, ts in prepared_g:
        vitra_db.upsert_item("garments", email, item_id, data, ts)
    for item_id, data, ts in prepared_l:
        vitra_db.upsert_item("looks", email, item_id, data, ts)
    for t in payload.deletedGarments:
        vitra_db.delete_item("garments", email, t.id, t.updatedAt or vitra_db.now_ms())
    for t in payload.deletedLooks:
        vitra_db.delete_item("looks", email, t.id, t.updatedAt or vitra_db.now_ms())
    if payload.categories is not None:
        vitra_db.set_categories(email, payload.categories.items, payload.categories.updatedAt or vitra_db.now_ms())
    return _state(email, _resolve_base_url(request))


@router.get("/image/{name}")
async def get_image(name: str):
    """Sirve una imagen del almacén privado. El nombre es un hash de 24 hex (no adivinable)."""
    if not photo_store._SAFE_NAME.match(name):
        raise HTTPException(status_code=404, detail="Imagen no encontrada.")
    path = os.path.join(photo_store.PHOTOS_DIR, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Imagen no encontrada.")
    media = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}[name.rsplit(".", 1)[1]]
    return FileResponse(path, media_type=media, headers={"Cache-Control": "private, max-age=86400"})
