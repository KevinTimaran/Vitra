import io
import os
import logging
from typing import Tuple, Optional
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Asegurar compatibilidad de numba en Python 3.14+
os.environ.setdefault("NUMBA_DISABLE_JIT", "1")

_rembg_session = None


def _get_rembg_session():
    """Retorna una sesión singleton precalentada de rembg especializada en siluetas humanas."""
    global _rembg_session
    if _rembg_session is None:
        try:
            import rembg
            logger.info("[ImagePreprocessor] Inicializando sesión rembg con modelo 'u2net_human_seg'...")
            _rembg_session = rembg.new_session("u2net_human_seg")
            logger.info("[ImagePreprocessor] Sesión rembg ('u2net_human_seg') lista para inferencia.")
        except Exception as e:
            logger.warning(f"[ImagePreprocessor] No se pudo inicializar modelo específico u2net_human_seg ({e}). Usando sesión por defecto.")
            try:
                import rembg
                _rembg_session = rembg.new_session()
            except Exception as e2:
                logger.error(f"[ImagePreprocessor] Error fatal inicializando rembg: {e2}")
                _rembg_session = False
    return _rembg_session if _rembg_session is not False else None


def preprocess_avatar_image(
    image_bytes: bytes,
    target_size: int = 1024,
    background_color: str = "white",
    safe_margin_ratio: float = 0.04,
) -> Tuple[bytes, str, str]:
    """
    Preprocesa estrictamente una fotografía corporal para maximizar la resolución 3D en Tripo3D:
    1. Corrige la orientación EXIF de la cámara móvil (evita fotos rotadas 90° o 270°).
    2. Remueve el fondo mediante segmentación humana de alta precisión (rembg).
    3. Encuentra la caja delimitadora (bounding box) exacta de la persona (de cabeza a pies).
    4. Recorta ajustadamente al sujeto para eliminar todo el espacio muerto horizontal y vertical.
    5. Escala proporcionalmente el sujeto con interpolación Lanczos para ocupar el ~92-96% del canvas.
    6. Centra al sujeto en un lienzo cuadrado de 1024x1024 con fondo blanco sólido o transparente.

    Retorna:
        Tuple[bytes, str, str]: (bytes_procesados, mime_type, filename)
    """
    if not image_bytes:
        raise ValueError("image_bytes no puede estar vacío.")

    try:
        # Paso 1: Cargar y corregir orientación EXIF
        original_img = Image.open(io.BytesIO(image_bytes))
        original_img = ImageOps.exif_transpose(original_img)
        orig_w, orig_h = original_img.size
        logger.info(f"[ImagePreprocessor] Procesando imagen de entrada: {orig_w}x{orig_h} modo={original_img.mode}")

        # Convertir a RGBA para procesar transparencia
        if original_img.mode != "RGBA":
            original_img = original_img.convert("RGBA")

        raw_png_buffer = io.BytesIO()
        original_img.save(raw_png_buffer, format="PNG")
        input_png_bytes = raw_png_buffer.getvalue()

        # Paso 2: Eliminación de fondo con rembg
        session = _get_rembg_session()
        rgba_img: Optional[Image.Image] = None

        if session is not None:
            try:
                import rembg
                logger.info("[ImagePreprocessor] Ejecutando remoción de fondo con rembg...")
                cutout_bytes = rembg.remove(input_png_bytes, session=session)
                rgba_img = Image.open(io.BytesIO(cutout_bytes)).convert("RGBA")
                logger.info("[ImagePreprocessor] Fondo removido exitosamente.")
            except Exception as rembg_err:
                logger.warning(f"[ImagePreprocessor] Error en rembg.remove ({rembg_err}), usando imagen original.")
                rgba_img = original_img
        else:
            logger.warning("[ImagePreprocessor] rembg no disponible, procesando directamente sobre imagen original.")
            rgba_img = original_img

        # Paso 3: Obtener la caja delimitadora exacta (bounding box de pixels no transparentes)
        bbox = None
        if rgba_img.mode == "RGBA":
            alpha = rgba_img.split()[3]
            bbox = alpha.getbbox()

        if not bbox:
            logger.warning("[ImagePreprocessor] No se detectó bounding box alfa claro. Usando dimensiones completas.")
            bbox = (0, 0, rgba_img.width, rgba_img.height)

        crop_x1, crop_y1, crop_x2, crop_y2 = bbox
        subject_w = max(1, crop_x2 - crop_x1)
        subject_h = max(1, crop_y2 - crop_y1)
        logger.info(f"[ImagePreprocessor] Sujeto detectado: caja [{crop_x1}, {crop_y1}, {crop_x2}, {crop_y2}] ({subject_w}x{subject_h} px)")

        # Recorte ajustado de cabeza a pies
        subject_cropped = rgba_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))

        # Paso 4: Escalar proporcionalmente al 1024x1024 conservando un margen de seguridad
        # El sujeto ocupará hasta (1.0 - 2 * safe_margin_ratio) del lienzo (ej. 92% = 942 px)
        usable_canvas_dim = int(target_size * (1.0 - (2 * safe_margin_ratio)))
        scale = min(usable_canvas_dim / subject_w, usable_canvas_dim / subject_h)
        new_w = max(1, int(subject_w * scale))
        new_h = max(1, int(subject_h * scale))

        scaled_subject = subject_cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        logger.info(f"[ImagePreprocessor] Sujeto escalado a {new_w}x{new_h} px (canvas: {target_size}x{target_size})")

        # Paso 5: Centrar en un lienzo cuadrado de 1024x1024
        # Tripo3D funciona de manera óptima con un fondo blanco sólido o transparente
        if background_color == "transparent":
            canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        else:
            # Fondo blanco sólido #FFFFFF
            canvas = Image.new("RGBA", (target_size, target_size), (255, 255, 255, 255))

        offset_x = (target_size - new_w) // 2
        offset_y = (target_size - new_h) // 2

        # Pegar el sujeto centrado utilizando su máscara alfa
        if scaled_subject.mode == "RGBA":
            canvas.paste(scaled_subject, (offset_x, offset_y), mask=scaled_subject.split()[3])
        else:
            canvas.paste(scaled_subject, (offset_x, offset_y))

        # Convertir a RGB si el fondo es blanco para máxima compatibilidad con Tripo3D
        final_img = canvas.convert("RGB") if background_color == "white" else canvas

        out_buffer = io.BytesIO()
        final_img.save(out_buffer, format="PNG", optimize=True)
        out_bytes = out_buffer.getvalue()

        logger.info(
            f"[ImagePreprocessor ÉXITO] Imagen preprocesada: {len(out_bytes)} bytes | {target_size}x{target_size} px | centrado [{offset_x}, {offset_y}]"
        )
        return out_bytes, "image/png", "avatar_1024_preprocessed.png"

    except Exception as e:
        logger.error(f"[ImagePreprocessor ERROR] Falló preprocesamiento ({type(e).__name__}: {e}). Devolviendo original.")
        return image_bytes, "image/jpeg", "avatar_raw.jpg"
