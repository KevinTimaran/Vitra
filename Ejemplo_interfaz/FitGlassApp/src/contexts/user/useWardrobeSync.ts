import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Garment, SavedLookItem } from '../../types';
import { MOCK_GARMENTS, MOCK_SAVED_LOOKS } from '../../data/mockData';
import { ensureBase64DataUri } from '../../services/ai/garmentAnalyzer';
import { syncWardrobe, wardrobeBaseUrl } from '../../services/wardrobe/wardrobeApi';
import {
  mergeCategories,
  mergeCollection,
  rebaseItemImages,
  sanitizeLookForUpload,
  selectDirty,
  upsertTombstone,
  type Tombstone,
} from '../../services/wardrobe/wardrobeMerge';
import { COLLECTION_STORAGE, loadCollection, persistCollection } from './userStorage';

const DEMO_GARMENT_IDS = new Set(MOCK_GARMENTS.map((g) => g.id));
const DEMO_LOOK_IDS = new Set(MOCK_SAVED_LOOKS.map((l) => l.id));
const DEBOUNCE_MS = 2500;

interface SyncState {
  lastSyncAt: number;
  categoriesUpdatedAt: number;
  deletedGarments: Tombstone[];
  deletedLooks: Tombstone[];
}

const EMPTY_STATE: SyncState = { lastSyncAt: 0, categoriesUpdatedAt: 0, deletedGarments: [], deletedLooks: [] };

const normalizeSyncState = (items: unknown[]): SyncState[] => {
  const raw = items[0] as Partial<SyncState> | undefined;
  if (!raw || typeof raw !== 'object') return [];
  const tombs = (list: unknown): Tombstone[] =>
    Array.isArray(list)
      ? list.filter((t): t is Tombstone => !!t && typeof (t as Tombstone).id === 'string' && typeof (t as Tombstone).updatedAt === 'number')
      : [];
  return [{
    lastSyncAt: typeof raw.lastSyncAt === 'number' ? raw.lastSyncAt : 0,
    categoriesUpdatedAt: typeof raw.categoriesUpdatedAt === 'number' ? raw.categoriesUpdatedAt : 0,
    deletedGarments: tombs(raw.deletedGarments),
    deletedLooks: tombs(raw.deletedLooks),
  }];
};

const uploadableImages = async <T extends Record<string, any>>(item: T): Promise<T> => {
  const out: Record<string, any> = { ...item };
  for (const field of ['imageUrl', 'image2dUrl']) {
    const value = out[field];
    if (typeof value === 'string' && value && !/^https?:\/\//i.test(value)) {
      try {
        out[field] = await ensureBase64DataUri(value);
      } catch (error) {
        console.warn('[WardrobeSync] No se pudo preparar la imagen ' + field + ' de ' + item.id + ':', error);
        delete out[field];
      }
    }
  }
  return out as T;
};

interface Params {
  scope: string;
  isReady: boolean;
  token: string | null;
  garments: Garment[];
  looks: SavedLookItem[];
  categories: string[];
  setGarments: Dispatch<SetStateAction<Garment[]>>;
  setLooks: Dispatch<SetStateAction<SavedLookItem[]>>;
  setCategories: Dispatch<SetStateAction<string[]>>;
}

/**
 * Sincroniza armario, looks y categorías con el servidor (SQLite) sin bloquear la UI:
 * - envía solo lo modificado desde la última sincronización (+ borrados) y recibe el estado fusionado;
 * - si no hay red o el servidor falla, los datos siguen guardados localmente y se reintenta con el próximo cambio.
 */
export function useWardrobeSync({
  scope, isReady, token, garments, looks, categories, setGarments, setLooks, setCategories,
}: Params) {
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [lastWardrobeSyncAt, setLastWardrobeSyncAt] = useState<Date | null>(null);
  const [wardrobeSyncError, setWardrobeSyncError] = useState<string | null>(null);

  const stateRef = useRef<SyncState>({ ...EMPTY_STATE });
  const garmentsRef = useRef(garments);
  const looksRef = useRef(looks);
  const categoriesRef = useRef(categories);
  const tokenRef = useRef(token);
  const scopeRef = useRef(scope);
  const inflightRef = useRef(false);
  const pendingRef = useRef(false);
  const lastCategoriesJson = useRef('');

  garmentsRef.current = garments;
  looksRef.current = looks;
  categoriesRef.current = categories;
  tokenRef.current = token;
  scopeRef.current = scope;

  const ready = isReady && loadedScope === scope;

  const persistState = useCallback(() => {
    void persistCollection(
      COLLECTION_STORAGE.syncState.fileName,
      COLLECTION_STORAGE.syncState.webKey,
      [stateRef.current],
      scopeRef.current
    ).catch((error) => console.warn('[WardrobeSync] No se pudo guardar el estado de sincronización:', error));
  }, []);

  // Carga el estado de sincronización del usuario cuando su armario ya está hidratado.
  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    void (async () => {
      const result = await loadCollection(
        COLLECTION_STORAGE.syncState.fileName,
        COLLECTION_STORAGE.syncState.webKey,
        normalizeSyncState,
        scope
      );
      if (cancelled) return;
      stateRef.current = result.status === 'ok' && result.items[0] ? result.items[0] : { ...EMPTY_STATE };
      lastCategoriesJson.current = JSON.stringify(categoriesRef.current);
      setLoadedScope(scope);
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, scope]);

  // Marca de tiempo de las categorías cuando cambian localmente.
  useEffect(() => {
    if (!ready) return;
    const json = JSON.stringify(categories);
    if (json !== lastCategoriesJson.current) {
      lastCategoriesJson.current = json;
      stateRef.current = { ...stateRef.current, categoriesUpdatedAt: Date.now() };
      persistState();
    }
  }, [ready, categories, persistState]);

  const syncNow = useCallback(async (force = false): Promise<void> => {
    const authToken = tokenRef.current;
    if (!authToken) return;
    if (inflightRef.current) {
      pendingRef.current = true;
      return;
    }

    const state = stateRef.current;
    const dirtyGarments = selectDirty(garmentsRef.current, state.lastSyncAt, (id) => DEMO_GARMENT_IDS.has(id));
    const dirtyLooks = selectDirty(looksRef.current, state.lastSyncAt, (id) => DEMO_LOOK_IDS.has(id));
    const categoriesDirty = state.categoriesUpdatedAt > state.lastSyncAt;
    const sentGarmentTombs = [...state.deletedGarments];
    const sentLookTombs = [...state.deletedLooks];

    if (!force && !dirtyGarments.length && !dirtyLooks.length && !categoriesDirty && !sentGarmentTombs.length && !sentLookTombs.length) {
      return;
    }

    inflightRef.current = true;
    const startedAt = Date.now();
    const syncScope = scopeRef.current;
    try {
      const garmentsPayload = await Promise.all(dirtyGarments.map((g) => uploadableImages(g)));
      const looksPayload = await Promise.all(dirtyLooks.map((l) => uploadableImages(sanitizeLookForUpload(l))));

      const remote = await syncWardrobe(authToken, {
        garments: garmentsPayload,
        looks: looksPayload,
        deletedGarments: sentGarmentTombs,
        deletedLooks: sentLookTombs,
        categories: categoriesDirty ? { items: categoriesRef.current, updatedAt: state.categoriesUpdatedAt } : undefined,
      });

      if (scopeRef.current !== syncScope) return; // el usuario cambió durante la petición: se descarta

      const base = wardrobeBaseUrl();
      const remoteGarments = remote.garments.map((g) => rebaseItemImages(g, base)) as unknown as Garment[];
      const remoteLooks = remote.looks.map((l) => rebaseItemImages(l, base)) as unknown as SavedLookItem[];

      setGarments((previous) =>
        mergeCollection(
          remoteGarments.length ? previous.filter((g) => !DEMO_GARMENT_IDS.has(g.id)) : previous,
          remoteGarments,
          remote.deletedGarments
        )
      );
      setLooks((previous) => mergeCollection(previous, remoteLooks, remote.deletedLooks));

      const mergedCategories = mergeCategories(
        { items: categoriesRef.current, updatedAt: state.categoriesUpdatedAt },
        remote.categories
      );
      if (mergedCategories.changed) {
        lastCategoriesJson.current = JSON.stringify(mergedCategories.items);
        setCategories(mergedCategories.items);
      }

      const sentG = new Set(sentGarmentTombs.map((t) => `${t.id}:${t.updatedAt}`));
      const sentL = new Set(sentLookTombs.map((t) => `${t.id}:${t.updatedAt}`));
      stateRef.current = {
        lastSyncAt: startedAt,
        categoriesUpdatedAt: Math.max(stateRef.current.categoriesUpdatedAt, mergedCategories.updatedAt),
        deletedGarments: stateRef.current.deletedGarments.filter((t) => !sentG.has(`${t.id}:${t.updatedAt}`)),
        deletedLooks: stateRef.current.deletedLooks.filter((t) => !sentL.has(`${t.id}:${t.updatedAt}`)),
      };
      persistState();
      setLastWardrobeSyncAt(new Date());
      setWardrobeSyncError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[WardrobeSync] No se pudo sincronizar (los datos siguen guardados en el dispositivo):', message);
      setWardrobeSyncError(message);
    } finally {
      inflightRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        setTick((value) => value + 1);
      }
    }
  }, [persistState, setCategories, setGarments, setLooks]);

  // Sincronización completa al iniciar sesión / abrir la app.
  useEffect(() => {
    if (ready && token) void syncNow(true);
  }, [ready, token, scope, syncNow]);

  // Sincronización diferida tras cualquier cambio local.
  useEffect(() => {
    if (!ready || !token) return;
    const timer = setTimeout(() => void syncNow(false), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [ready, token, garments, looks, categories, tick, syncNow]);

  const recordDeletion = useCallback((kind: 'garments' | 'looks', id: string) => {
    const now = Date.now();
    const isDemo = kind === 'garments' ? DEMO_GARMENT_IDS.has(id) : DEMO_LOOK_IDS.has(id);
    if (isDemo) return;
    const state = stateRef.current;
    stateRef.current = kind === 'garments'
      ? { ...state, deletedGarments: upsertTombstone(state.deletedGarments, id, now) }
      : { ...state, deletedLooks: upsertTombstone(state.deletedLooks, id, now) };
    persistState();
    setTick((value) => value + 1);
  }, [persistState]);

  return { recordDeletion, syncNow, lastWardrobeSyncAt, wardrobeSyncError };
}
