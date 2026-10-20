from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import garments, tryon

app = FastAPI(title="FitGlassAI", description="Orquestador de IA Generativa para Vitra")

# Configurar CORS para desarrollo con el cliente móvil Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FitGlassAI API running"}

# Rutas de la API bajo el prefijo /api
app.include_router(garments.router, prefix="/api/garments", tags=["garments"])
app.include_router(tryon.router, prefix="/api/tryon", tags=["tryon"])
