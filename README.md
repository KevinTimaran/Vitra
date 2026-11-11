# Vitra · FitGlass

Armario digital con probador virtual 3D e inteligencia artificial: analiza tus prendas, calcula tu colorimetría
estacional y genera un avatar 3D para probarte la ropa.

## 📱 Descargar la app (Android)

**[⬇️ Descargar APK de prueba](https://github.com/KevinTimaran/Vitra/releases/latest/download/vitra-prueba.apk)**
· [Ver todas las versiones](https://github.com/KevinTimaran/Vitra/releases)

1. Abre el enlace desde el teléfono Android y descarga `vitra-prueba.apk`.
2. Ábrelo y permite *instalar apps de origen desconocido* cuando Android lo pida.
3. Crea una cuenta y empieza a usarla. La IA ya está integrada: la app se conecta al servidor en la nube
   (`https://vitra-fitglassai.onrender.com`), así que no hace falta configurar nada.

> Es una versión de **prueba**. El servidor gratuito se duerme tras 15 min sin uso: la primera acción puede tardar
> ~1 minuto. Funciona en teléfonos Android de 64 bits.

## Estructura del proyecto

| Carpeta | Contenido |
|---|---|
| [`FitGlassApp/`](FitGlassApp) | App móvil (Expo · React Native · TypeScript) |
| [`FitGlassAI/`](FitGlassAI) | Backend de IA (FastAPI · Python): Gemini/OpenAI, Replicate y Tripo3D |
| [`docs/`](docs) | Hoja de ruta, notas de refactorización e imágenes de referencia |
| [`scripts/`](scripts) | `setup.mjs` (prepara todo tras clonar) y `switch_ai.mjs` (cambia el proveedor de IA) |
| `render.yaml` | Despliegue del backend en Render |
| `.github/workflows/` | Compilación automática del APK de Android |

## Ejecutar en local

Requisitos: Git, Node.js con npm y Python 3.10 o superior.

```sh
node scripts/setup.mjs
```

Instala las dependencias de la app (`npm ci`), crea `FitGlassAI/.venv` con el backend y, si falta, crea
`FitGlassAI/.env` desde `.env.example`. Para instalar solo una parte: `--skip-backend` o `--skip-frontend`.

Configura tus claves (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `REPLICATE_API_TOKEN`, `TRIPO_API_KEY`) en
`FitGlassAI/.env`. Son personales y no se suben a Git.

**Backend**

```sh
cd FitGlassAI
.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000   # Windows: .venv\Scripts\python.exe
```

Comprueba que responde: `curl http://<IP-de-tu-PC>:8000/health` → `{"status":"ok"}`.

**App**

```sh
cd FitGlassApp
npm start
```

En `FitGlassApp/.env`, `EXPO_PUBLIC_API_BASE_URL` debe apuntar al backend (en un teléfono usa la IP de tu PC en la
red, no `127.0.0.1`).

## Pruebas

```sh
cd FitGlassAI && .venv/bin/python -m pytest -q tests
cd FitGlassApp && npm test && npx tsc --noEmit && node scripts/check-i18n.mjs
```

## Generar una nueva versión del APK

GitHub → **Actions** → **Android APK** → **Run workflow**. Al terminar (~20–30 min) el APK aparece en
[Releases](https://github.com/KevinTimaran/Vitra/releases) y el enlace de descarga de arriba apunta a la última versión.
