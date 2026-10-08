from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import garments

app = FastAPI(title="FitGlassAI")

# Configurar CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir Expo en desarrollo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(garments.router, prefix="/api/garments", tags=["garments"])
