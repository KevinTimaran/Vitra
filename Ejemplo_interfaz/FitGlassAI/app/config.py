import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Cargar variables de entorno desde el archivo .env del backend usando ruta absoluta
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseModel):
    AI_PROVIDER: str = Field(default_factory=lambda: os.getenv("AI_PROVIDER", "gemini").lower().strip())
    GEMINI_API_KEY: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", "").strip())
    GEMINI_MODEL: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip())
    OPENAI_API_KEY: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", "").strip())
    OPENAI_MODEL: str = Field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip())
    REPLICATE_API_TOKEN: str = Field(default_factory=lambda: os.getenv("REPLICATE_API_TOKEN", "").strip())
    TRIPO_API_KEY: str = Field(default_factory=lambda: os.getenv("TRIPO_API_KEY", "").strip())
    EXPO_PUBLIC_API_BASE_URL: str = Field(default_factory=lambda: os.getenv("EXPO_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000").strip())
    JWT_SECRET_KEY: str = Field(default_factory=lambda: os.getenv("JWT_SECRET_KEY", "fitglass_ai_secret_super_key_2026_jwt_token").strip())
    JWT_ALGORITHM: str = Field(default_factory=lambda: os.getenv("JWT_ALGORITHM", "HS256").strip())
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default_factory=lambda: int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "525600")))

    @property
    def has_gemini(self) -> bool:
        return bool(self.GEMINI_API_KEY)

    @property
    def has_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY)

    @property
    def active_ai_provider(self) -> str:
        provider = (self.AI_PROVIDER or "gemini").lower().strip()
        if provider == "openai":
            return "openai"
        return "gemini"

    @property
    def has_replicate(self) -> bool:
        return bool(self.REPLICATE_API_TOKEN)

    @property
    def has_tripo(self) -> bool:
        return bool(self.TRIPO_API_KEY)

# Instancia global de configuración
settings = Settings()
