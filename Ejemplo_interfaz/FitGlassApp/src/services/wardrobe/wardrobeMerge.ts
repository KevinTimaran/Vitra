// Lógica pura (sin React Native) de fusión de armario/looks entre el dispositivo y el servidor.
// Se prueba con `node --test` (ver src/services/wardrobe/__tests__).

export interface Syncable {
  id: string;
  updatedAt?: number;
  imageUrl?: string;
}

export interface Tombstone {
  id: string;
  updatedAt: number;
}

const IMAGE_PATH = '/api/wardrobe/image/';
const LOCAL_SCHEMES = ['file:', 'content:', 'ph:', 'assets-library:'];

export const isLocalUri = (value?: string | null): boolean =>
  typeof value === 'string' && LOCAL_SCHEMES.some((scheme) => value.startsWith(scheme));

const ts = (item: { updatedAt?: number }): number => (typeof item.updatedAt === 'number' ? item.updatedAt : 0);

/**
 * Fusiona dos colecciones por id con last-write-wins (empate: gana lo local).
 * - Los ids borrados en el servidor (`remoteDeletedIds`) se eliminan: el servidor ya aplicó antes nuestros cambios
 *   más nuevos, así que si un id sigue marcado como borrado es que el borrado ganó.
 * - Si gana la versión remota pero no trae imagen y la local sí, se conserva la imagen local.
 * - Devuelve la MISMA referencia de `local` si no hay cambios (evita bucles de render/sincronización).
 */
export function mergeCollection<T extends Syncable>(local: T[], remote: T[], remoteDeletedIds: string[] = []): T[] {
  const deleted = new Set(remoteDeletedIds);
  const byId = new Map<string, T>();
  for (const item of local) byId.set(item.id, item);

  for (const incoming of remote) {
    const current = byId.get(incoming.id);
    if (!current) {
      byId.set(incoming.id, incoming);
    } else if (ts(incoming) > ts(current)) {
      const keepLocalImage = !incoming.imageUrl && current.imageUrl;
      byId.set(incoming.id, keepLocalImage ? { ...incoming, imageUrl: current.imageUrl } : incoming);
    }
  }

  const localIds = new Set(local.map((item) => item.id));
  const merged: T[] = [];
  // Conserva el orden local y añade al final lo nuevo que llegó del servidor.
  for (const item of local) {
    if (deleted.has(item.id)) continue;
    merged.push(byId.get(item.id) as T);
  }
  for (const incoming of remote) {
    if (localIds.has(incoming.id) || deleted.has(incoming.id)) continue;
    merged.push(byId.get(incoming.id) as T);
  }

  const unchanged = merged.length === local.length && merged.every((item, index) => item === local[index]);
  return unchanged ? local : merged;
}

/** Fusión de categorías (una sola lista con marca de tiempo): gana la más reciente. */
export function mergeCategories(
  local: { items: string[]; updatedAt: number },
  remote?: { items: string[]; updatedAt?: number } | null
): { items: string[]; updatedAt: number; changed: boolean } {
  if (!remote || !Array.isArray(remote.items)) return { ...local, changed: false };
  const remoteTs = remote.updatedAt ?? 0;
  if (remoteTs > local.updatedAt) {
    const same = JSON.stringify(remote.items) === JSON.stringify(local.items);
    return { items: same ? local.items : remote.items, updatedAt: remoteTs, changed: !same };
  }
  return { ...local, changed: false };
}

/** La URL pública del backend (ngrok) cambia entre ejecuciones: reubica las imágenes servidas por el backend. */
export function rebaseImageUrl(url: string | undefined | null, baseUrl: string): string | undefined {
  if (!url) return url ?? undefined;
  const index = url.indexOf(IMAGE_PATH);
  if (index < 0) return url;
  return `${baseUrl.replace(/\/+$/, '')}${url.slice(index)}`;
}

export function rebaseItemImages<T extends Record<string, any>>(item: T, baseUrl: string): T {
  let changed = false;
  const next: Record<string, any> = { ...item };
  for (const field of ['imageUrl', 'image2dUrl']) {
    const value = item[field];
    if (typeof value === 'string' && value.includes(IMAGE_PATH)) {
      const rebased = rebaseImageUrl(value, baseUrl);
      if (rebased !== value) {
        next[field] = rebased;
        changed = true;
      }
    }
  }
  return changed ? (next as T) : item;
}

/** Los looks anidan prendas completas; no se suben imágenes locales/base64 repetidas dentro del look. */
export function sanitizeLookForUpload<T extends { garments?: Array<Record<string, any>> }>(look: T): T {
  if (!Array.isArray(look.garments)) return look;
  const garments = look.garments.map((garment) => {
    const copy = { ...garment };
    for (const field of ['imageUrl', 'image2dUrl']) {
      const value = copy[field];
      if (typeof value === 'string' && (value.startsWith('data:') || isLocalUri(value))) delete copy[field];
    }
    return copy;
  });
  return { ...look, garments };
}

/** Elementos que cambiaron desde la última sincronización (los de demostración nunca se suben). */
export function selectDirty<T extends Syncable>(items: T[], lastSyncAt: number, isDemoId: (id: string) => boolean): T[] {
  return items.filter((item) => !isDemoId(item.id) && ts(item) > lastSyncAt);
}

export function upsertTombstone(list: Tombstone[], id: string, updatedAt: number): Tombstone[] {
  return [...list.filter((t) => t.id !== id), { id, updatedAt }];
}
