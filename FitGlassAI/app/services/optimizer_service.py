import asyncio
import logging
import os
import struct
import json
import shutil
import subprocess
import tempfile
import uuid
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Directorio donde se almacenan los modelos 3D optimizados (.glb con Draco y WebP)

def sanitize_glb_material_names(path: str) -> None:
    """
    Sanitiza los nombres de materiales en el archivo GLB para prevenir
    el error de compilación GLSL en WebGL / Three.js (ERROR___ERROR_IN_EXPONENT)
    cuando los nombres contienen guiones o patrones tipo UUID (ej. 904e-d624).
    """
    try:
        if not os.path.exists(path) or os.path.getsize(path) < 20:
            return
        with open(path, "rb") as f:
            header = f.read(12)
            if len(header) < 12:
                return
            magic, version, total_len = struct.unpack("<4sII", header)
            if magic != b"glTF":
                return
            c0_len, c0_type = struct.unpack("<II", f.read(8))
            c0_data = f.read(c0_len)
            rest = f.read()

        gltf = json.loads(c0_data.decode("utf-8"))
        changed = False
        for i, mat in enumerate(gltf.get("materials", [])):
            if "name" in mat and ("-" in mat["name"] or " " in mat["name"]):
                mat["name"] = f"VitraMaterial_{i}"
                changed = True

        if not changed:
            return

        new_json = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
        pad_len = (4 - (len(new_json) % 4)) % 4
        new_json += b" " * pad_len

        new_total_len = 12 + 8 + len(new_json) + len(rest)
        new_header = struct.pack("<4sII", magic, version, new_total_len)
        new_c0_header = struct.pack("<II", len(new_json), c0_type)

        with open(path, "wb") as f:
            f.write(new_header)
            f.write(new_c0_header)
            f.write(new_json)
            f.write(rest)
        logger.info(f"[Optimizer] Nombres de materiales en GLB sanitizados para WebGL: {path}")
    except Exception as e:
        logger.warning(f"[Optimizer] Aviso sanitizando materiales en GLB: {e}")

STATIC_MODELS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "models")
)
os.makedirs(STATIC_MODELS_DIR, exist_ok=True)


async def optimize_3d_model(
    input_url_or_path: str,
    base_url: Optional[str] = None
) -> str:
    """
    Descarga y optimiza un modelo 3D (.glb / .gltf) aplicando compresión Draco en geometría
    y compresión WebP en texturas mediante @gltf-transform/cli.
    
    Guarda el archivo resultante en app/static/models/ y retorna la URL pública accesible.
    En caso de cualquier error en la descarga o en la herramienta CLI, retorna el modelo
    original como fallback seguro para no interrumpir el flujo del usuario.
    """
    if not input_url_or_path or not input_url_or_path.strip():
        return input_url_or_path

    input_clean = input_url_or_path.strip()

    # Resolver URL base del servidor (desde parámetro, variable de entorno o localhost)
    effective_base = (
        base_url.rstrip("/")
        if base_url
        else (settings.EXPO_PUBLIC_API_BASE_URL.rstrip("/") if settings.EXPO_PUBLIC_API_BASE_URL else "http://127.0.0.1:8000")
    )

    temp_input_file = None
    raw_name = os.path.splitext(os.path.basename(input_clean.split("?")[0]))[0]
    safe_base_name = "".join(c for c in raw_name if c.isalnum() or c in ("-", "_"))[:30] or "model"
    output_filename = f"{safe_base_name}_{uuid.uuid4().hex[:8]}_opt.glb"
    output_path = os.path.join(STATIC_MODELS_DIR, output_filename)

    try:
        # 1. Obtener la ruta del archivo de entrada (descargar si es URL remota)
        if input_clean.startswith("http://") or input_clean.startswith("https://"):
            suffix = ".gltf" if ".gltf" in input_clean.lower() else ".glb"
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            temp_input_file = temp_file.name
            temp_file.close()

            logger.info(f"[Optimizer] Descargando modelo 3D desde: {input_clean}")
            async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
                resp = await client.get(input_clean)
                if resp.status_code != 200:
                    logger.warning(
                        f"[Optimizer] Fallo al descargar modelo (HTTP {resp.status_code}), usando modelo original."
                    )
                    return input_clean
                with open(temp_input_file, "wb") as f:
                    f.write(resp.content)
            input_file_path = temp_input_file
        else:
            # Ruta local existente
            if not os.path.exists(input_clean):
                logger.warning(f"[Optimizer] Ruta local no encontrada: {input_clean}")
                return input_clean
            input_file_path = input_clean

        # 2. Ejecutar @gltf-transform/cli optimize compatible con React Native (sin Draco/WebP que requieren Web Workers en navegador)
        npx_bin = shutil.which("npx") or "npx"
        cmd = [
            npx_bin,
            "-y",
            "@gltf-transform/cli",
            "optimize",
            input_file_path,
            output_path,
            "--compress",
            "false",
            "--texture-compress",
            "false",
            "--texture-size",
            "1024",
        ]

        logger.info(f"[Optimizer] Ejecutando optimización segura para móviles: {' '.join(cmd)}")

        def _run_cli():
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                shell=(os.name == "nt"),
            )

        result = await asyncio.to_thread(_run_cli)

        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            original_size = os.path.getsize(input_file_path) if os.path.exists(input_file_path) else 0
            optimized_size = os.path.getsize(output_path)
            sanitize_glb_material_names(output_path)
            logger.info(
                f"[Optimizer] Modelo optimizado con éxito: {original_size / 1024:.1f} KB -> {optimized_size / 1024:.1f} KB"
            )
            return f"{effective_base}/static/models/{output_filename}"

        logger.warning(
            f"[Optimizer] gltf-transform finalizó con código {result.returncode}: {result.stderr or result.stdout}. "
            "Usando modelo original como fallback."
        )
        return input_clean

    except Exception as exc:
        logger.warning(
            f"[Optimizer] Error durante la optimización 3D: {exc}. Retornando modelo original como fallback.",
            exc_info=True,
        )
        # Limpiar archivo de salida si quedó incompleto
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except OSError:
                pass
        return input_clean

    finally:
        # Limpiar archivo temporal descargado
        if temp_input_file and os.path.exists(temp_input_file):
            try:
                os.remove(temp_input_file)
            except OSError:
                pass


async def get_or_create_optimized_default_avatar(
    gender: Optional[str] = None,
    base_url: Optional[str] = None
) -> str:
    """
    Asigna y asegura la versión optimizada del avatar 3D por defecto según el género ('female' o 'male').
    Aplica exactamente la misma canalización de optimización de malla 3D utilizada para prendas.
    """
    effective_base = (
        base_url.rstrip("/")
        if base_url
        else (settings.EXPO_PUBLIC_API_BASE_URL.rstrip("/") if settings.EXPO_PUBLIC_API_BASE_URL else "http://127.0.0.1:8000")
    )

    is_male = bool(gender and gender.strip().lower() == "male")
    source_filename = "default_men.glb" if is_male else "default_girl.glb"
    opt_filename = "default_men_opt.glb" if is_male else "default_girl_opt.glb"

    if is_male:
        logger.info("[Optimizer] Assigning default male avatar: default_men.glb")
    else:
        logger.info("[Optimizer] Assigning default female avatar: default_girl.glb")

    default_avatar_dir = os.path.join(STATIC_MODELS_DIR, "default_avatar")
    source_path = os.path.join(default_avatar_dir, source_filename)
    opt_path = os.path.join(STATIC_MODELS_DIR, opt_filename)

    # 1. Si ya existe el modelo optimizado válido, retornarlo de inmediato sin recompilar
    if os.path.exists(opt_path) and os.path.getsize(opt_path) > 100_000:
        logger.info(
            f"[Optimizer] Reusando avatar por defecto optimizado existente ({opt_filename}, {os.path.getsize(opt_path) / 1024:.1f} KB)"
        )
        return f"{effective_base}/static/models/{opt_filename}"

    # 2. Si no existe, ejecutar la canalización de optimización 3D gltf-transform
    logger.info(f"[Optimizer] Starting 3D optimization for default avatar: {source_path} -> {opt_path}...")
    if not os.path.exists(source_path):
        logger.warning(f"[Optimizer] No se encontró el archivo base de avatar en: {source_path}")
        return f"{effective_base}/static/models/{source_filename}"

    npx_bin = shutil.which("npx") or "npx"
    cmd = [
        npx_bin,
        "-y",
        "@gltf-transform/cli",
        "optimize",
        source_path,
        opt_path,
        "--compress",
        "false",
        "--texture-compress",
        "false",
        "--texture-size",
        "1024",
    ]

    def _run():
        return subprocess.run(cmd, capture_output=True, text=True, timeout=120, shell=(os.name == "nt"))

    res = await asyncio.to_thread(_run)

    if res.returncode == 0 and os.path.exists(opt_path) and os.path.getsize(opt_path) > 0:
        logger.info(
            f"[Optimizer] Default avatar 3D optimization completed successfully: {opt_filename} ({os.path.getsize(opt_path) / 1024:.1f} KB)"
        )
        return f"{effective_base}/static/models/{opt_filename}"

    logger.warning(
        f"[Optimizer] Falló optimización de avatar por defecto ({res.returncode}): {res.stderr or res.stdout}. "
        f"Retornando modelo original como fallback."
    )
    return f"{effective_base}/static/models/default_avatar/{source_filename}"
