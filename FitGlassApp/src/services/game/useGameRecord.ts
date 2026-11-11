import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { COLLECTION_STORAGE, loadCollection, persistCollection, scopeKeyFor } from '../../contexts/user/userStorage';
import { applyScore, EMPTY_RECORD, normalizeRecord, type GameRecord } from './gameRecord.ts';

/**
 * Récord del juego POR USUARIO (mismo esquema de archivos por cuenta que el armario). `loaded` es false hasta leer
 * el disco: el juego no se muestra antes para no arrancar con un récord vacío que luego se sobrescriba.
 */
export function useGameRecord() {
  const { userEmail } = useAuth();
  const scope = scopeKeyFor(userEmail);
  const [record, setRecord] = useState<GameRecord>(EMPTY_RECORD);
  const [loaded, setLoaded] = useState(false);
  const recordRef = useRef<GameRecord>(EMPTY_RECORD);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    void (async () => {
      const result = await loadCollection(
        COLLECTION_STORAGE.gameRecord.fileName,
        COLLECTION_STORAGE.gameRecord.webKey,
        normalizeRecord,
        scope
      );
      if (cancelled) return;
      const stored = result.status === 'ok' && result.items[0] ? result.items[0] : EMPTY_RECORD;
      recordRef.current = stored;
      setRecord(stored);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  /** Registra una puntuación; devuelve true si fue un nuevo récord (y lo guarda). */
  const submitScore = useCallback(
    (score: number): boolean => {
      const next = applyScore(recordRef.current, score);
      if (next === recordRef.current) return false;
      recordRef.current = next;
      setRecord(next);
      void persistCollection(
        COLLECTION_STORAGE.gameRecord.fileName,
        COLLECTION_STORAGE.gameRecord.webKey,
        [next],
        scope
      ).catch((error) => console.warn('[GameRecord] No se pudo guardar el récord:', error));
      return true;
    },
    [scope]
  );

  return { record, best: record.best, loaded, submitScore };
}
