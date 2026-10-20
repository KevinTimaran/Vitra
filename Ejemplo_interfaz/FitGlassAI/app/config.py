import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Cargar variables de entorno desde el archivo .env
load_dotenv()

class Settings(BaseModel):
    GEMINI_API_KEY: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", "").strip())
    GEMINI_MODEL: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip())
    REPLICATE_API_TOKEN: str = Field(default_factory=lambda: os.getenv("REPLICATE_API_TOKEN", "").strip())
    TRIPO_API_KEY: str = Field(default_factory=lambda: os.getenv("TRIPO_API_KEY", "").strip())
    EXPO_PUBLIC_API_BASE_URL: str = Field(default_factory=lambda: os.getenv("EXPO_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000").strip())

    @property
    def has_gemini(self) -> bool:
        return bool(self.GEMINI_API_KEY)

    @property
    def has_replicate(self) -> bool:
        return bool(self.REPLICATE_API_TOKEN)

    @property
    def has_tripo(self) -> bool:
        return bool(self.TRIPO_API_KEY)

# Instancia global de configuración
settings = Settings()
