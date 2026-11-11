// Paleta de "El patinador profesional de Ronnie" (extraída del HTML original, agrupada por uso).
// La pantalla del juego y sus avisos usan estos tokens para que todo se sienta parte del mismo mundo.
export const gamePalette = {
  // Fondos (violeta noche)
  bg: '#241e3d',
  frame: '#302b54',
  panel: '#1e1933',
  panelDeep: '#201b38',
  chip: '#2d264f',
  stage: '#1b1730',
  pause: '#161226',
  gameOver: '#1a152e',

  // Superficies y botones
  surface: '#3a3263',
  surfaceTrick: '#4d3877',
  surfaceJump: '#384877',
  surfaceHover: '#4d4380',
  surfaceSoft: '#3f356d',

  // Bordes
  border: '#4c4573',
  borderStrong: '#524982',
  borderLight: '#61579a',
  borderFrame: '#615c8e',
  borderSlide: '#5d5294',
  borderTrick: '#7657b5',
  borderJump: '#5470b9',

  // Primario (violeta)
  primary: '#6c5ce7',
  primaryLight: '#a29bfe',
  primaryDark: '#5b4cc4',
  primaryHover: '#8e85ee',
  primaryBorder: '#d6d1f5',

  // Texto (lavanda)
  text: '#dcd6f7',
  textSoft: '#b9b2e8',
  textMuted: '#b0a8d6',
  title: '#a4aeff',
  white: '#ffffff',

  // Coral / rojo (vidas, reintentar, combo)
  coral: '#ff6b81',
  red: '#ff4757',
  redDark: '#ee5253',
  redDeep: '#eb3b5a',
  coralBorder: '#ffc2c9',
  coralSoft: '#ff7675',

  // Amarillo (estrellas, puntos, trucos)
  yellow: '#feca57',
  yellowLight: '#ffdd59',
  yellowPale: '#ffea79',
  orange: '#f39c12',
  gold: '#fbc531',

  // Cian / azul (distancia, salto)
  cyan: '#48dbfb',
  blue: '#54a0ff',
  cyanLight: '#7ee8fa',
  indigo: '#5f27cd',

  // Acentos
  pink: '#ff9ff3',
  mint: '#1dd1a1',

  // Efectos
  vignette: 'rgba(28, 22, 54, 0.8)',
  buttonGlow: 'rgba(108, 92, 231, 0.5)',
  overlay: 'rgba(22, 18, 38, 0.92)',
} as const;

export type GamePalette = typeof gamePalette;
