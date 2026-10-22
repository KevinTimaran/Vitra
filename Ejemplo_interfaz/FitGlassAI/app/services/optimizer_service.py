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

        # 2. Ejecutar @gltf-transform/cli optimize con compresión Draco y WebP
        cmd = [
            "npx",
            "-y",
            "@gltf-transform/cli",
            "optimize",
            input_file_path,
            output_path,
            "--compress",
            "draco",
            "--texture-compress",
            "webp",
        ]

        logger.info(f"[Optimizer] Ejecutando optimización Draco + WebP: {' '.join(cmd)}")

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
