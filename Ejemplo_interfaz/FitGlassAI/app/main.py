import logging
import os
os.environ.setdefault("NUMBA_DISABLE_JIT", "1")
from dotenv import load_dotenv

load_dotenv()

# Configurar logging centralizado para trazabilidad completa de servicios y pipelines
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("FitGlassAI")

from contextlib import asynccontextmanager
from pyngrok import ngrok, conf
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .api import garments, tryon, colorimetry, avatar, auth, users

NGROK_AUTHTOKEN = os.getenv("NGROK_AUTHTOKEN", "3LFj7re9ubOoWjAPjczCp0oKgbZ_P1VRGH3FbJHySo4xSqET")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Inicializa el túnel seguro de ngrok en el puerto 8000 durante el inicio de FastAPI.
    Expone la URL pública en los logs para su fácil integración con FitGlassApp.
    """
    public_url = None
    try:
        # Autenticación programática con el AuthToken provisto
        try:
            ngrok.set_auth_token(NGROK_AUTHTOKEN)
        except Exception as auth_err:
            if "already set" not in str(auth_err).lower():
                logger.warning("[NGROK] Nota sobre authtoken en archivo de config: %s", auth_err)

        pyngrok_config = conf.PyngrokConfig(auth_token=NGROK_AUTHTOKEN)

        # Comprobar si ya existe un túnel en el puerto 8000 o crear uno nuevo
        active_tunnels = ngrok.get_tunnels()
        existing = next((t for t in active_tunnels if ":8000" in t.config.get("addr", "")), None)
        if existing:
            public_url = existing.public_url
        else:
            try:
                tunnel = ngrok.connect(8000, pyngrok_config=pyngrok_config)
                public_url = tunnel.public_url
            except Exception as conn_err:
                # Si el daemon local de ngrok ya tiene el endpoint abierto (ej. durante uvicorn reload)
                if "already online" in str(conn_err).lower() or "334" in str(conn_err):
                    import urllib.request
                    import json
                    try:
                        with urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels", timeout=3) as resp:
                            data = json.loads(resp.read().decode())
                            for t in data.get("tunnels", []):
                                if ":8000" in str(t.get("config", {}).get("addr", "")) or t.get("proto") == "https":
                                    public_url = t.get("public_url")
                                    break
                    except Exception:
                        pass
                if not public_url:
                    raise conn_err

        app.state.public_url = public_url
        os.environ["EXPO_PUBLIC_API_BASE_URL"] = public_url

        # Log prominente en consola
        logger.info("\n" + "=" * 70)
        logger.info("🚀 [NGROK] TUNNEL ESTABLISHED ON PORT 8000")
        logger.info("🌍 [NGROK] PUBLIC URL: %s", public_url)
        logger.info("📱 [FRONTEND] Set EXPO_PUBLIC_API_BASE_URL in FitGlassApp/.env:")
        logger.info("   EXPO_PUBLIC_API_BASE_URL=%s", public_url)
        logger.info("=" * 70 + "\n")
    except Exception as e:
        logger.error("❌ [NGROK] Error al iniciar el túnel: %s", e)

    yield

    # Limpieza ordenada al apagar el servidor
    logger.info("[NGROK] Cerrando túnel...")
    try:
        if public_url:
            ngrok.disconnect(public_url)
        ngrok.kill()
    except Exception as e:
        logger.warning("[NGROK] Aviso al desconectar: %s", e)


app = FastAPI(
    title="FitGlassAI",
    description="Orquestador de IA Generativa para Vitra",
    lifespan=lifespan,
)

# Configurar directorio de archivos estáticos (modelos 3D optimizados)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
MODELS_DIR = os.path.join(STATIC_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Configurar CORS para permitir peticiones desde Expo y orígenes ngrok (* y *.ngrok-free.app) sin bloqueos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^https?:\/\/([a-zA-Z0-9-]+\.)*(ngrok-free\.(app|dev)|ngrok\.io|localhost)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok", "message": "FitGlassAI API running"}

# Rutas de la API bajo el prefijo /api
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(garments.router, prefix="/api/garments", tags=["garments"])
app.include_router(tryon.router, prefix="/api/tryon", tags=["tryon"])
app.include_router(colorimetry.router, prefix="/api/colorimetry", tags=["colorimetry"])
app.include_router(avatar.router, prefix="/api/avatar", tags=["avatar"])
