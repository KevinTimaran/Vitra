import { getBaseUrl, getActiveWorkingUrl } from '../ai/garmentAnalyzer';
import { fetchWithLanguage } from '../http/fetchWithLanguage';

export interface RemoteWardrobeState {
  garments: Array<Record<string, any>>;
  looks: Array<Record<string, any>>;
  categories?: { items: string[]; updatedAt?: number } | null;
  deletedGarments: string[];
  deletedLooks: string[];
}

export interface SyncPayload {
  garments: Array<Record<string, any>>;
  looks: Array<Record<string, any>>;
  deletedGarments: Array<{ id: string; updatedAt: number }>;
  deletedLooks: Array<{ id: string; updatedAt: number }>;
  categories?: { items: string[]; updatedAt: number };
}

export const wardrobeBaseUrl = (): string => getActiveWorkingUrl() || getBaseUrl();

/** Sincroniza (fusión last-write-wins en el servidor) y devuelve el estado resultante del usuario. */
export async function syncWardrobe(token: string, payload: SyncPayload, timeoutMs = 45000): Promise<RemoteWardrobeState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchWithLanguage(`${wardrobeBaseUrl()}/api/wardrobe/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Bypass-Tunnel-Reminder': 'true',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const json = await response.json();
        if (json?.detail) detail = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
      } catch {
        // mantener el código HTTP
      }
      const error: Error & { status?: number } = new Error(detail);
      error.status = response.status;
      throw error;
    }
    return (await response.json()) as RemoteWardrobeState;
  } finally {
    clearTimeout(timer);
  }
}
