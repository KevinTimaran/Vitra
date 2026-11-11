"""Imágenes de las prendas base del avatar.

Antes apuntaban a fotos de Unsplash que no eran prendas (un retrato, un traje). Ahora se generan
ilustraciones planas de camiseta y pantalón (fondo blanco, como espera IDM-VTON) en /static/garments.
"""
import os
from typing import Any, Dict, List, Optional

from PIL import Image, ImageDraw

STATIC_GARMENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "garments")

_BASE_IMAGES = {
    "base-top-1": ("base_top_1.png", "tshirt", (24, 24, 27)),
    "base-bottom-1": ("base_bottom_1.png", "trousers", (39, 39, 42)),
}


def _draw_tshirt(color) -> Image.Image:
    im = Image.new("RGB", (768, 1024), "white")
    d = ImageDraw.Draw(im)
    d.polygon(
        [(250, 200), (330, 170), (438, 170), (518, 200), (680, 300), (620, 400), (540, 350),
         (540, 880), (228, 880), (228, 350), (148, 400), (88, 300)],
        fill=color,
    )
    d.ellipse((330, 150, 438, 230), fill="white")
    return im


def _draw_trousers(color) -> Image.Image:
    im = Image.new("RGB", (768, 1024), "white")
    d = ImageDraw.Draw(im)
    d.polygon(
        [(230, 120), (538, 120), (560, 940), (420, 940), (384, 420), (348, 940), (208, 940)],
        fill=color,
    )
    d.rectangle((230, 120, 538, 160), fill=tuple(min(255, c + 25) for c in color))
    return im


def ensure_base_garment_images() -> None:
    """Crea las ilustraciones si aún no existen."""
    os.makedirs(STATIC_GARMENTS_DIR, exist_ok=True)
    for filename, kind, color in _BASE_IMAGES.values():
        path = os.path.join(STATIC_GARMENTS_DIR, filename)
        if not os.path.exists(path):
            (_draw_tshirt(color) if kind == "tshirt" else _draw_trousers(color)).save(path, "PNG")


def base_garment_image_url(garment_id: str, base_url: str) -> Optional[str]:
    entry = _BASE_IMAGES.get(garment_id)
    if not entry:
        return None
    ensure_base_garment_images()
    return f"{base_url.rstrip('/')}/static/garments/{entry[0]}"


def refresh_base_garment_images(garments: Optional[List[Dict[str, Any]]], base_url: str) -> List[Dict[str, Any]]:
    """Devuelve las prendas con imageUrl corregido para las prendas base conocidas."""
    result: List[Dict[str, Any]] = []
    for g in garments or []:
        g = dict(g)
        url = base_garment_image_url(str(g.get("id", "")), base_url)
        if url:
            g["imageUrl"] = url
        result.append(g)
    return result
