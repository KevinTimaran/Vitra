# Hoja de Ruta de Desarrollo: Vitra (Arquitectura Generativa)

## Fase 1: Infraestructura y Cimientos (El Esqueleto)
El objetivo es tener ambos entornos levantados, comunicándose entre sí y con la navegación básica funcionando.

### Backend (FitGlassAI)
* Configurar la estructura base de FastAPI (`main.py`, rutas iniciales).
* Establecer las políticas de CORS para permitir peticiones desde el entorno local de Expo.
* Crear modelos de datos Pydantic para validar las entradas (ej. recibir imágenes en base64 o URLs).
* Implementar un endpoint de prueba (`/health`) para confirmar la conexión desde el celular.

### Frontend (FitGlassApp)
* Configurar React Navigation (Stack y Bottom Tabs) para conectar las pantallas principales (`Home`, `Wardrobe`, `FittingRoom`, `Profile`).
* Establecer el sistema de diseño (colores, tipografías, componentes UI básicos como botones y tarjetas).
* Conectar el frontend a la IP local del backend para realizar las primeras peticiones HTTP.

## Fase 2: Ingesta de Ropa y Cerebro Analítico
Esta fase se centra en poblar el armario digital. El usuario toma la foto y el sistema la clasifica inteligentemente.

### Backend (FitGlassAI)
* Integrar el SDK de Google Gemini (`services/gemini_service.py`).
* Crear el endpoint `/api/garments/analyze`, que reciba la foto de una prenda, le pida a Gemini que extraiga sus características (tipo, color dominante, estilo) y simule guardarla en una base de datos.
* Integrar una API o script local sencillo para remover el fondo de la foto (preparación para el modelo generativo).

### Frontend (FitGlassApp)
* Construir la pantalla `AddGarmentScreen` con acceso a la cámara y galería nativas del iPhone usando las librerías de Expo.
* Diseñar la UI de `WardrobeScreen` (El Armario) para listar las prendas guardadas usando datos simulados y posteriormente los reales del backend.

## Fase 3: El Probador Virtual (El Núcleo Generativo)
Conectamos los modelos de IA de fusión (VTON) y extrusión 3D.

### Backend (FitGlassAI)
* Crear la lógica de orquestación en `/api/fitting-room/generate`.
* **Paso A:** Enviar la foto del usuario y la prenda a la API de *Virtual Try-On* (VTON).
* **Paso B:** Recibir esa imagen combinada y enviarla a la API de conversión 2D-to-3D.
* Devolver al frontend la URL de descarga del archivo `.glb` final.

### Frontend (FitGlassApp)
* Construir `FittingRoomScreen`.
* Implementar `react-three-fiber` para cargar y renderizar modelos `.glb` desde una URL, permitiendo gestos de rotación y zoom.
* **Crucial:** Diseñar `GarmentProcessingScreen`, una pantalla de carga inmersiva con animaciones que mantenga al usuario entretenido durante los 15-30 segundos de latencia de la IA.

## Fase 4: Onboarding, Avatar Base y Colorimetría
Se construye la identidad biométrica del usuario para personalizar la experiencia.

### Backend (FitGlassAI)
* Crear el endpoint para generar el `avatar_base.glb` a partir de la primera foto de cuerpo entero del usuario.
* Crear un endpoint de análisis facial con Gemini para extraer la paleta de colorimetría personal (estación de color).

### Frontend (FitGlassApp)
* Desarrollar el flujo de *Onboarding* (`WelcomeScreen` y `BodyProfileScreen`) para capturar la foto inicial.
* Maquetar `ColorStudioScreen` para mostrar la paleta de colores recomendada y cómo hace *match* con las prendas del armario.

## Fase 5: Pulido, UX y Preparación para Presentación
Optimización de la experiencia para que el prototipo se sienta como una aplicación lista para producción.

### Backend (FitGlassAI)
* Implementar manejo de errores robusto (¿Qué pasa si la API 3D falla o tarda demasiado?). Retornar mensajes de error limpios al frontend.

### Frontend (FitGlassApp)
* Añadir sistema de caché: si el usuario vuelve a probarse una combinación que ya generó antes, la app no llama a la IA, sino que carga el `.glb` guardado localmente.
* Refinar las transiciones *Glassmorphism* y animaciones de micro-interacciones.