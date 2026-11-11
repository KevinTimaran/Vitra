// Lógica pura del récord del juego (sin React Native): se prueba con node.

export interface GameRecord {
  best: number;
  updatedAt: number;
}

export const EMPTY_RECORD: GameRecord = { best: 0, updatedAt: 0 };

/** Convierte lo guardado en disco en un récord válido (ignora basura o valores negativos). */
export const normalizeRecord = (items: unknown[]): GameRecord[] => {
  const raw = items[0] as Partial<GameRecord> | undefined;
  if (!raw || typeof raw !== 'object') return [];
  const best = typeof raw.best === 'number' && Number.isFinite(raw.best) ? Math.max(0, Math.floor(raw.best)) : 0;
  const updatedAt = typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0;
  return [{ best, updatedAt }];
};

/** Una puntuación es récord solo si supera ESTRICTAMENTE al mejor anterior. */
export const isNewRecord = (score: number, best: number): boolean =>
  Number.isFinite(score) && Math.floor(score) > Math.max(0, Math.floor(best));

/** Devuelve el récord resultante tras una puntuación (el mismo objeto si no hay mejora). */
export const applyScore = (record: GameRecord, score: number, now: number = Date.now()): GameRecord =>
  isNewRecord(score, record.best) ? { best: Math.floor(score), updatedAt: now } : record;

/** Texto para mostrar el récord (ajustes, barra superior). */
export const formatRecord = (best: number): string => (best > 0 ? best.toLocaleString('es-ES') : 'Sin récord');
