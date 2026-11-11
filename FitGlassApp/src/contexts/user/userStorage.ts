import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import type { BodyProfile, ColorProfile, Garment, SavedLookItem } from '../../types';
import {
  DEFAULT_BODY_PROFILE,
  DEFAULT_COLOR_PROFILE,
  DEFAULT_GENDER,
  DEFAULT_USER_NAME,
  USER_COLLECTIONS,
  USER_STORAGE_KEYS,
} from './userDefaults';

export interface PersistedProfile {
  userName: string;
  userEmail?: string;
  userAge?: number;
  gender: string;
  facePhotoUri?: string;
  bodyPhotoUri?: string;
  userPhotoUri?: string;
  colorProfile: ColorProfile;
  avatarUrl?: string;
  avatarType: 'preset' | 'custom_3d' | 'none';
  avatarCreatedAt?: string;
  bodyProfile: BodyProfile;
  completedOnboarding: boolean;
}

const cloneDefaultBodyProfile = () => ({ ...DEFAULT_BODY_PROFILE });
let writeQueue: Promise<void> = Promise.resolve();

const enqueueWrite = <T,>(operation: () => Promise<T>): Promise<T> => {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
};

const getCollectionFile = (fileName: string): File | null => {
  try {
    return Paths?.document ? new File(Paths.document, fileName) : null;
  } catch (error) {
    console.warn('[UserStorage] No se pudo resolver el directorio de documentos:', error);
    return null;
  }
};

// SecureStore no admite valores grandes de forma fiable (~2 KB). Antes se omitían en silencio (y se perdían);
// ahora esos valores se guardan en un archivo de documentos y SecureStore queda sin la clave.
const SECURE_STORE_MAX_CHARS = 1800;
const overflowFile = (key: string): File | null => getCollectionFile('vitra_kv_' + key + '.json');

const readOverflow = async (key: string): Promise<string | null> => {
  try {
    const file = overflowFile(key);
    return file && file.exists ? await file.text() : null;
  } catch {
    return null;
  }
};

const writeOverflow = async (key: string, value: string | null): Promise<void> => {
  const file = overflowFile(key);
  if (!file) return;
  if (value === null) {
    if (file.exists) file.delete();
    return;
  }
  if (!file.exists) file.create();
  await file.write(value);
};

const readValue = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    if (await SecureStore.isAvailableAsync()) {
      return (await SecureStore.getItemAsync(key)) ?? (await readOverflow(key));
    }
  } catch (error) {
    console.warn('[UserStorage] No se pudo leer la preferencia ' + key + ':', error);
  }
  return null;
};

const readValues = async (keys: string[]): Promise<(string | null)[]> => {
  if (Platform.OS === 'web') return Promise.all(keys.map(readValue));
  try {
    if (!(await SecureStore.isAvailableAsync())) return keys.map(() => null);
    return await Promise.all(keys.map(async (key) => {
      try {
        return (await SecureStore.getItemAsync(key)) ?? (await readOverflow(key));
      } catch (error) {
        console.warn('[UserStorage] No se pudo leer la preferencia ' + key + ':', error);
        return null;
      }
    }));
  } catch (error) {
    console.warn('[UserStorage] No se pudo consultar SecureStore:', error);
    return keys.map(() => null);
  }
};

const writeNativeValue = async (key: string, value: string | null): Promise<void> => {
  if (value === null) {
    await SecureStore.deleteItemAsync(key);
    await writeOverflow(key, null);
  } else if (value.length > SECURE_STORE_MAX_CHARS) {
    await writeOverflow(key, value);
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
    await writeOverflow(key, null);
  }
};

const writeValues = async (entries: [string, string | null][]): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    entries.forEach(([key, value]) => {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch (error) {
        console.warn('[UserStorage] No se pudo persistir la preferencia ' + key + ':', error);
      }
    });
    return;
  }

  try {
    if (!(await SecureStore.isAvailableAsync())) return;
    const results = await Promise.allSettled(entries.map(([key, value]) => writeNativeValue(key, value)));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn('[UserStorage] No se pudo persistir la preferencia ' + entries[index][0] + ':', result.reason);
      }
    });
  } catch (error) {
    console.warn('[UserStorage] No se pudo consultar SecureStore para guardar el perfil:', error);
  }
};

const parseJson = <T,>(value: string | null, fallback: T, validate: (value: unknown) => value is T): T => {
  if (value === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(value);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isColorProfile = (value: unknown): value is ColorProfile =>
  isRecord(value) && isString(value.season) && Array.isArray(value.recommended_colors);
const isBodyProfile = (value: unknown): value is BodyProfile =>
  isRecord(value) &&
  typeof value.height === 'number' &&
  typeof value.chest === 'number' &&
  typeof value.waist === 'number' &&
  typeof value.hips === 'number';

const normalizeGarment = (value: unknown): Garment | null => {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name)) return null;
  return value as unknown as Garment;
};

const normalizeSavedLook = (value: unknown, index: number): SavedLookItem | null => {
  if (!isRecord(value) || !isString(value.id) || !isString(value.title)) return null;
  if (value.id === 'look-1' || value.id === 'look-2') return null;
  const garments = Array.isArray(value.garments)
    ? value.garments.map(normalizeGarment).filter((garment): garment is Garment => garment !== null)
    : [];
  return {
    id: value.id,
    title: value.title,
    date: isString(value.date) ? value.date : '',
    garments,
    fitScore: isString(value.fitScore) ? value.fitScore : '',
    paletteTheme: isString(value.paletteTheme) ? value.paletteTheme : '',
    model3dUrl: isString(value.model3dUrl) ? value.model3dUrl : undefined,
    image2dUrl: isString(value.image2dUrl) ? value.image2dUrl : undefined,
    category: isString(value.category) ? value.category : (index % 2 === 0 ? 'Elegante' : 'Fiesta'),
    isFavorite: Boolean(value.isFavorite),
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : undefined,
  };
};

export const normalizeSavedLooks = (values: unknown[]): SavedLookItem[] =>
  values.map(normalizeSavedLook).filter((look): look is SavedLookItem => look !== null);

export async function loadPersistedProfile(): Promise<PersistedProfile> {
  const keys = USER_STORAGE_KEYS;
  const [
    completed,
    userName,
    userEmail,
    userAge,
    gender,
    avatarType,
    avatarUrl,
    avatarCreatedAt,
    facePhotoUri,
    bodyPhotoUri,
    userPhotoUri,
    colorProfile,
    bodyProfile,
  ] = await readValues([
    keys.onboarding,
    keys.name,
    keys.email,
    keys.age,
    keys.gender,
    keys.avatarType,
    keys.avatarUrl,
    keys.avatarCreatedAt,
    keys.facePhotoUri,
    keys.bodyPhotoUri,
    keys.userPhotoUri,
    keys.colorProfile,
    keys.bodyProfile,
  ]);

  const parsedAge = userAge === null ? undefined : Number(userAge);
  const parsedColorProfile = parseJson(colorProfile, DEFAULT_COLOR_PROFILE, isColorProfile);
  const parsedBodyProfile = parseJson(bodyProfile, cloneDefaultBodyProfile(), isBodyProfile);
  const normalizedAvatarType = avatarType === 'custom_3d' || avatarType === 'none' ? avatarType : 'preset';

  return {
    completedOnboarding: completed === 'true',
    userName: userName || DEFAULT_USER_NAME,
    userEmail: userEmail || undefined,
    userAge: Number.isFinite(parsedAge) ? parsedAge : undefined,
    gender: gender || DEFAULT_GENDER,
    avatarType: normalizedAvatarType,
    avatarUrl: avatarUrl || undefined,
    avatarCreatedAt: avatarCreatedAt || undefined,
    facePhotoUri: facePhotoUri || undefined,
    bodyPhotoUri: bodyPhotoUri || undefined,
    userPhotoUri: userPhotoUri || undefined,
    colorProfile: parsedColorProfile,
    bodyProfile: parsedBodyProfile,
  };
}

export function persistProfile(profile: PersistedProfile): Promise<void> {
  return enqueueWrite(async () => {
    const keys = USER_STORAGE_KEYS;
    const entries: [string, string | null][] = [
      [keys.onboarding, profile.completedOnboarding ? 'true' : null],
      [keys.name, profile.userName || null],
      [keys.email, profile.userEmail || null],
      [keys.age, profile.userAge === undefined ? null : String(profile.userAge)],
      [keys.gender, profile.gender || DEFAULT_GENDER],
      [keys.avatarType, profile.avatarType],
      [keys.avatarUrl, profile.avatarUrl || null],
      [keys.avatarCreatedAt, profile.avatarCreatedAt || null],
      [keys.facePhotoUri, profile.facePhotoUri || null],
      [keys.bodyPhotoUri, profile.bodyPhotoUri || null],
      [keys.userPhotoUri, profile.userPhotoUri || null],
      [keys.colorProfile, JSON.stringify(profile.colorProfile)],
      [keys.bodyProfile, JSON.stringify(profile.bodyProfile)],
    ];
    await writeValues(entries);
  });
}

// ---------------------------------------------------------------------------
// Colecciones (armario, looks, categorías, estado de sincronización) POR USUARIO
// ---------------------------------------------------------------------------
export type CollectionLoad<T> =
  | { status: 'ok'; items: T[] }
  | { status: 'missing' }
  | { status: 'error'; error: unknown };

/** Identificador estable y seguro para nombres de archivo/claves a partir del correo (o 'guest'). */
export const scopeKeyFor = (email?: string | null): string => {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return 'guest';
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) hash = ((hash << 5) + hash + normalized.charCodeAt(i)) >>> 0;
  return 'u' + hash.toString(16);
};

const scopedFileName = (fileName: string, scope: string) => fileName.replace(/\.json$/, '') + '.' + scope + '.json';
const scopedWebKey = (webKey: string, scope: string) => webKey + ':' + scope;

// Archivos que NO se pudieron leer: no se sobrescriben jamás (evita perder datos por una lectura fallida).
const blockedWrites = new Set<string>();

const readCollectionRaw = async (fileName: string, webKey: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(webKey) : null;
  }
  const file = getCollectionFile(fileName);
  if (!file || !file.exists) return null;
  return await file.text();
};

const removeLegacyCollection = async (fileName: string, webKey: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(webKey);
      return;
    }
    const file = getCollectionFile(fileName);
    if (file && file.exists) file.delete();
  } catch (error) {
    console.warn('[UserStorage] No se pudo retirar el archivo anterior ' + fileName + ':', error);
  }
};

export function persistCollection(fileName: string, webKey: string, values: unknown[], scope: string = 'guest'): Promise<void> {
  const scopedFile = scopedFileName(fileName, scope);
  const scopedKey = scopedWebKey(webKey, scope);
  return enqueueWrite(async () => {
    if (blockedWrites.has(scopedFile)) {
      console.warn('[UserStorage] Escritura omitida: ' + scopedFile + ' no se pudo leer y se conserva intacto.');
      return;
    }
    const serialized = JSON.stringify(values);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(scopedKey, serialized);
      return;
    }

    const file = getCollectionFile(scopedFile);
    if (!file) return;
    if (!file.exists) file.create();
    await file.write(serialized);
  });
}

export async function loadCollection<T>(
  fileName: string,
  webKey: string,
  normalize: (value: unknown[]) => T[],
  scope: string = 'guest'
): Promise<CollectionLoad<T>> {
  const scopedFile = scopedFileName(fileName, scope);
  const scopedKey = scopedWebKey(webKey, scope);
  try {
    let raw = await readCollectionRaw(scopedFile, scopedKey);

    // Migración: el archivo anterior (sin usuario) lo adopta la primera cuenta que inicia sesión.
    if (raw === null && scope !== 'guest') {
      const legacy = await readCollectionRaw(fileName, webKey);
      if (legacy !== null) {
        const parsedLegacy: unknown = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy)) {
          raw = legacy;
          blockedWrites.delete(scopedFile);
          await persistCollection(fileName, webKey, parsedLegacy, scope);
          await removeLegacyCollection(fileName, webKey);
        }
      }
    }

    blockedWrites.delete(scopedFile);
    if (raw === null) return { status: 'missing' };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('el contenido no es una lista');
    return { status: 'ok', items: normalize(parsed) };
  } catch (error) {
    console.warn('[UserStorage] No se pudo cargar ' + scopedFile + ' (se protege de sobrescritura):', error);
    blockedWrites.add(scopedFile);
    return { status: 'error', error };
  }
}

export const COLLECTION_STORAGE = USER_COLLECTIONS;
