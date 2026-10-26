import io
import pytest
from PIL import Image, ImageDraw
from app.services.image_preprocessor import preprocess_avatar_image


def test_preprocess_avatar_image_centers_on_1024():
    # Crear imagen sintética de prueba
    img = Image.new("RGB", (400, 700), (200, 220, 240))
    draw = ImageDraw.Draw(img)
    # Dibujar silueta humana simple
    draw.ellipse([150, 50, 250, 150], fill=(220, 180, 160)) # Cabeza
    draw.rectangle([160, 150, 240, 420], fill=(30, 30, 30))  # Torso
    draw.rectangle([165, 420, 195, 650], fill=(20, 20, 80))  # Pierna izq
    draw.rectangle([205, 420, 235, 650], fill=(20, 20, 80))  # Pierna der

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    raw_bytes = buf.getvalue()

    processed_bytes, mime, filename = preprocess_avatar_image(raw_bytes, target_size=1024, background_color="white")
    assert mime == "image/png"
    assert "avatar" in filename
    assert len(processed_bytes) > 0

    # Verificar que el resultado sea estrictamente 1024x1024
    out_img = Image.open(io.BytesIO(processed_bytes))
    assert out_img.size == (1024, 1024)
    assert out_img.mode == "RGB"


def test_preprocess_avatar_image_transparent_mode():
    img = Image.new("RGBA", (300, 500), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([100, 50, 200, 150], fill=(200, 100, 50, 255))
    draw.rectangle([110, 150, 190, 400], fill=(50, 50, 150, 255))

    buf = io.BytesIO()
    img.save(buf, format="PNG")

    processed_bytes, mime, filename = preprocess_avatar_image(buf.getvalue(), target_size=1024, background_color="transparent")
    out_img = Image.open(io.BytesIO(processed_bytes))
    assert out_img.size == (1024, 1024)
    assert out_img.mode == "RGBA"


def test_preprocess_avatar_image_graceful_fallback_on_corrupt_data():
    garbage_bytes = b"corrupt_non_image_data_12345"
    out_bytes, mime, filename = preprocess_avatar_image(garbage_bytes, target_size=1024)
    # Debe retornar de forma segura los bytes sin lanzar excepción no capturada
    assert out_bytes == garbage_bytes
