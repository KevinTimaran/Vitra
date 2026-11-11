// Matemática pura del recortador de fotos (sin React Native): se prueba con node (ver __tests__/cropMath.test.mjs).
//
// Modelo: un marco fijo de `fw × fh` px sobre la pantalla; la foto (W × H px reales) se dibuja con
//   escala = minScale · zoom   y su centro desplazado (tx, ty) px respecto al centro del marco.
// minScale hace que la foto siempre CUBRA el marco (no hay barras): con zoom 1 y un marco con la proporción de la
// foto se ve la foto COMPLETA (nunca se corta cabeza ni pies por defecto). Lo que se ve es exactamente lo que se recorta.

export interface Size {
  width: number;
  height: number;
}

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface CropState {
  zoom: number;
  tx: number;
  ty: number;
}

export const MAX_ZOOM = 4;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Proporción del marco: la de la foto, limitada al rango de un retrato de cuerpo entero (0,5–0,8). */
export const frameAspectFor = (natural: Size, min = 0.5, max = 0.8): number =>
  clamp(natural.width / Math.max(1, natural.height), min, max);

/** Mayor marco de esa proporción que cabe en el espacio disponible. */
export const fitFrame = (maxWidth: number, maxHeight: number, aspect: number): Size => {
  let width = maxWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return { width: Math.round(width), height: Math.round(height) };
};

/** Escala mínima: la foto cubre todo el marco. */
export const minScale = (natural: Size, frame: Size): number =>
  Math.max(frame.width / natural.width, frame.height / natural.height);

export const clampZoom = (zoom: number): number => clamp(zoom, 1, MAX_ZOOM);

/** Limita el desplazamiento para que la foto nunca deje huecos dentro del marco. */
export const clampTranslate = (natural: Size, frame: Size, zoom: number, tx: number, ty: number): { tx: number; ty: number } => {
  const scale = minScale(natural, frame) * clampZoom(zoom);
  const maxX = Math.max(0, (natural.width * scale - frame.width) / 2);
  const maxY = Math.max(0, (natural.height * scale - frame.height) / 2);
  return { tx: clamp(tx, -maxX, maxX), ty: clamp(ty, -maxY, maxY) };
};

/** Cambia el zoom manteniendo el mismo punto bajo el centro del marco y respetando los límites. */
export const applyZoom = (natural: Size, frame: Size, state: CropState, nextZoom: number): CropState => {
  const zoom = clampZoom(nextZoom);
  const ratio = zoom / Math.max(1e-6, state.zoom);
  const { tx, ty } = clampTranslate(natural, frame, zoom, state.tx * ratio, state.ty * ratio);
  return { zoom, tx, ty };
};

/** Rectángulo (en píxeles de la foto original) que queda dentro del marco. */
export const cropRect = (natural: Size, frame: Size, state: CropState): CropRect => {
  const zoom = clampZoom(state.zoom);
  const { tx, ty } = clampTranslate(natural, frame, zoom, state.tx, state.ty);
  const scale = minScale(natural, frame) * zoom;

  const width = Math.min(natural.width, frame.width / scale);
  const height = Math.min(natural.height, frame.height / scale);
  const centerX = natural.width / 2 - tx / scale;
  const centerY = natural.height / 2 - ty / scale;

  const originX = clamp(centerX - width / 2, 0, natural.width - width);
  const originY = clamp(centerY - height / 2, 0, natural.height - height);

  return {
    originX: Math.round(originX),
    originY: Math.round(originY),
    width: Math.max(1, Math.min(natural.width - Math.round(originX), Math.round(width))),
    height: Math.max(1, Math.min(natural.height - Math.round(originY), Math.round(height))),
  };
};

/** Tamaño con el que se dibuja la foto en pantalla (para posicionarla dentro del marco). */
export const displaySize = (natural: Size, frame: Size, zoom: number): Size => {
  const scale = minScale(natural, frame) * clampZoom(zoom);
  return { width: natural.width * scale, height: natural.height * scale };
};

/** Distancia entre dos toques (pellizco). */
export const touchDistance = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);
