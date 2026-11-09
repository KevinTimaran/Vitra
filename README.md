# Prender el .venv
source .venv/bin/activate.fish

## Preparar el proyecto después de clonarlo

Requisitos: Git, Node.js con npm y Python 3.10 o superior. Desde la raíz del repositorio ejecuta:

```sh
node scripts/setup.mjs
```

El script instala las dependencias de Expo usando `npm ci`, crea `FitGlassAI/.venv` e instala el backend desde `pyproject.toml`. Si falta el `.env` del backend, lo crea desde `.env.example` sin sobrescribir archivos existentes. Para instalar solo una parte: `node scripts/setup.mjs --skip-backend` o `node scripts/setup.mjs --skip-frontend`.

Después, configura `GEMINI_API_KEY`, `REPLICATE_API_TOKEN` y `TRIPO_API_KEY` en `Ejemplo_interfaz/FitGlassAI/.env` según los servicios que uses. Ajusta `EXPO_PUBLIC_API_BASE_URL` en el entorno del frontend a la URL del backend; en un teléfono, usa la IP accesible del ordenador en la red, no `127.0.0.1`. Arranca el backend con:

```sh
cd Ejemplo_interfaz/FitGlassAI
.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

En Windows, el ejecutable del entorno está en `.venv\Scripts\python.exe`. En otra terminal inicia Expo:

```sh
cd Ejemplo_interfaz/FitGlassApp
npm start
```

Las claves de servicios externos son personales y no se descargan con Git; hay que configurarlas en cada ordenador.





=============================================================
Va dentro del IP_ADDRESS
http://192.168.168.58:8000
# comprovar que el backend esta corriendo
curl http://[IP_ADDRESS]/health
# Debe de decir = {"status":"ok"}

# Comprobar que el backend esta corriendo desde otro dispositivo en la misma red
curl http://[IP_ADDRESS]/health
# Debe de decir = {"status":"ok"}

# Probar el endpoint de imagen
curl -X POST "http://[IP_ADDRESS]/analyze/image" -F "image=@/home/kevin/Pictures/Captura de pantalla de 2026-10-08 10-59-12.png" -H "Content-Type: multipart/form-data"
# Debe de devolver un JSON con la descripción de la imagen
