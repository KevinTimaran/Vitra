"""Almacén privado de fotos del usuario (fuera de /static).

La base de datos JSON solo guardaba los primeros 50 caracteres de la foto, así que la cascada
nunca podía usar la imagen real del usuario. Ahora la foto se guarda en app/data/photos y en el
registro queda una referencia `photo://<archivo>`.
"""
import base64
import hashlib
import os
import re
from typing import Optional

PHOTOS_DIR = os.environ.get("USER_PHOTOS_DIR") or os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "photos"
)
PHOTO_PREFIX = "photo://"
_DATA_URI = re.compile(r"^data:image/(png|jpe?g|webp);base64,(.+)$", re.DOTALL)
_SAFE_NAME = re.compile(r"^[a-f0-9]{24}\.(png|jpg|webp)$")


def save_photo(image: Optional[str]) -> Optional[str]:
    """Guarda un data URI y devuelve `photo://archivo`. URLs http(s) se devuelven tal cual."""
    if not image or not image.strip():
        return None
    image = image.strip()
    if image.startswith(PHOTO_PREFIX) or image.startswith(("http://", "https://")):
        return image
    m = _DATA_URI.match(image)
    if not m:
        return None
    ext = {"png": "png", "jpg": "jpg", "jpeg": "jpg", "webp": "webp"}[m.group(1)]
    try:
        raw = base64.b64decode(m.group(2), validate=False)
    except Exception:
        return None
    if not raw:
        return None
    name = f"{hashlib.sha256(raw).hexdigest()[:24]}.{ext}"
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    path = os.path.join(PHOTOS_DIR, name)
    if not os.path.exists(path):
        with open(path, "wb") as f:
            f.write(raw)
    return PHOTO_PREFIX + name


def load_photo(ref: Optional[str]) -> Optional[str]:
    """Devuelve una imagen utilizable (data URI o URL) a partir de una referencia guardada, o None."""
    if not ref:
        return None
    if ref.startswith(("http://", "https://")):
        return ref
    if not ref.startswith(PHOTO_PREFIX):
        return None  # valores antiguos truncados ("data:...base64,/9j/4AA...")
    name = ref[len(PHOTO_PREFIX):]
    if not _SAFE_NAME.match(name):
        return None
    path = os.path.join(PHOTOS_DIR, name)
    if not os.path.exists(path):
        return None
    mime = {"png": "png", "jpg": "jpeg", "webp": "webp"}[name.rsplit(".", 1)[1]]
    with open(path, "rb") as f:
        return f"data:image/{mime};base64," + base64.b64encode(f.read()).decode("ascii")
