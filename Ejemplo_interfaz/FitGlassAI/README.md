# FitGlassAI

Backend para FitGlass enfocado en el análisis de prendas de ropa utilizando la API de Gemini.

## Configuración

1. Crear el entorno virtual:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
2. Instalar dependencias:
   ```bash
   pip install -e ".[dev]"
   ```
3. Configurar variables de entorno:
   Copiar `.env.example` a `.env` y establecer `GEMINI_API_KEY`.

## Ejecución

Arrancar el servidor en modo desarrollo:
```bash
uvicorn app.main --reload
```
El backend estará disponible en `http://127.0.0.1:8000`.
La documentación Swagger estará en `http://127.0.0.1:8000/docs`.

## Notas de Desarrollo
CORS está configurado temporalmente para permitir solicitudes desde todos los orígenes durante el desarrollo con Expo. Esto deberá ajustarse para producción.
