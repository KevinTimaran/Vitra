# FitGlassAI

Backend para FitGlass enfocado en el análisis de prendas de ropa utilizando la API de Gemini.

# FitGlass — Guía de ejecución local

## 1. Ejecutar desde el PC de escritorio

### Terminal 1 — Backend (FastAPI)

Abre una terminal Fish y ejecuta:

```fish
cd ~/Universidad/interfaces/AppMovil/Vitra/Ejemplo_interfaz/FitGlassAI

source .venv/bin/activate.fish

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verifica que el backend esté funcionando abriendo en el navegador:

- Health: `http://127.0.0.1:8000/health`
- Documentación: `http://127.0.0.1:8000/docs`

### Terminal 2 — Frontend (Expo)

Abre otra terminal Fish:

```fish
cd ~/Universidad/interfaces/AppMovil/Vitra/Ejemplo_interfaz/FitGlassApp

npx expo start -c
```

### Configurar la IP del PC de escritorio

Consulta la IP local:

```fish
ip -4 addr show wlan0
```

Busca la dirección que aparece después de `inet`. Por ejemplo, en el PC actual es `192.168.1.11`.

Edita el archivo `.env` del frontend:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.11:8000
```

**Importante:** reemplaza la IP por la dirección actual de tu PC. Si cambia, actualiza este archivo y reinicia Expo.

---

## 2. Ejecutar desde el portátil de la universidad

### Terminal 1 — Backend (FastAPI)

```fish
cd ~/Universidad/interfaces/AppMovil/Vitra/Ejemplo_interfaz/FitGlassAI

source .venv/bin/activate.fish

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Si el proyecto está en otra ruta del portátil, utiliza la ruta real donde tengas la carpeta `FitGlassAI`.

### Terminal 2 — Frontend (Expo)

```fish
cd ~/Universidad/interfaces/AppMovil/Vitra/Ejemplo_interfaz/FitGlassApp

npx expo start -c
```

### Configurar la IP del portátil

Consulta la IP del portátil conectado a la red:

```fish
ip -4 addr show wlan0
```

Si estás conectado por Ethernet, también puedes consultar:

```fish
ip -4 addr
```

Copia la IP local del portátil y actualiza `FitGlassApp/.env`. Por ejemplo, si la IP del portátil fuera `192.168.0.25`:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.25:8000
```

La IP del ejemplo es ilustrativa; utiliza la que te muestre el comando en tu portátil.

---

## 3. Comprobar la conexión desde el iPhone

Conecta el iPhone y el ordenador a la misma red Wi-Fi.

En Safari, abre esta dirección, reemplazando la IP por la del ordenador que estés utilizando:

```text
http://IP_DEL_ORDENADOR:8000/health
```

La respuesta esperada es:

```json
{"status":"ok"}
```

Si no abre, comprueba que FastAPI esté ejecutándose con `--host 0.0.0.0`, que ambos dispositivos estén en la misma red y que el firewall permita las conexiones al puerto `8000`.

---

## 4. Orden correcto de ejecución

1. Abre la terminal del backend.
2. Activa el entorno virtual y ejecuta FastAPI.
3. Comprueba `/health`.
4. Actualiza la IP en el `.env` del frontend.
5. Abre otra terminal y ejecuta Expo con `npx expo start -c`.
6. Abre la aplicación en Expo Go desde el iPhone.
7. Prueba el análisis de una prenda.

**No cierres las terminales** mientras estés utilizando la aplicación.

---

## 5. Si el entorno virtual no existe

Si al activar `.venv` aparece un error porque no encuentra el archivo, crea el entorno e instala las dependencias desde `pyproject.toml`:

```fish
cd ~/Universidad/interfaces/AppMovil/Vitra/Ejemplo_interfaz/FitGlassAI

python -m venv .venv

source .venv/bin/activate.fish

python -m pip install -e .
```

Después, inicia FastAPI con el comando de la sección 1.

## 6. Recordatorios importantes

- El backend y el frontend deben estar ejecutándose al mismo tiempo.
- La IP que configures debe pertenecer al ordenador donde corre FastAPI, no al iPhone.
- Cada equipo puede tener una IP diferente y esta puede cambiar al conectarse a otra red.
- Si utilizas el backend en el PC de escritorio, pero el frontend en el portátil, configura la IP del PC de escritorio en el `.env` del portátil. Ambos deben poder comunicarse por la red.
- No compartas ni subas el archivo `.env` del backend si contiene tu clave de Gemini.

