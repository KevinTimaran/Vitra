import logging
import os
from dotenv import load_dotenv

load_dotenv()

# Configurar logging centralizado para trazabilidad completa de servicios y pipelines
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("FitGlassAI")

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .api import garments, tryon, colorimetry, avatar, auth, users

app = FastAPI(title="FitGlassAI", description="Orquestador de IA Generativa para Vitra")

# Configurar directorio de archivos estáticos (modelos 3D optimizados)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
MODELS_DIR = os.path.join(STATIC_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Configurar CORS para desarrollo con el cliente móvil Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
