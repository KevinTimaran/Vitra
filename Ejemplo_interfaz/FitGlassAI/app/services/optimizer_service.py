import asyncio
import logging
import os
import subprocess
import tempfile
import uuid
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Directorio donde se almacenan los modelos 3D optimizados (.glb con Draco y WebP)
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
        cmd = [
            "npx",
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
                timeout=90,
            )

        result = await asyncio.to_thread(_run_cli)

        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            original_size = os.path.getsize(input_file_path) if os.path.exists(input_file_path) else 0
            optimized_size = os.path.getsize(output_path)
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

    cmd = [
        "npx",
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
        return subprocess.run(cmd, capture_output=True, text=True, timeout=90)

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

