import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import { UserProfile, ColorProfile, BodyProfile, Garment, SavedLookItem } from '../types';
import { INITIAL_BODY_PROFILE, MOCK_GARMENTS, MOCK_SAVED_LOOKS } from '../data/mockData';
import { generateAvatar, deleteCurrentAvatar, getLatestAvatarModel } from '../services/ai/garmentAnalyzer';
import { getDefaultAvatarModel, updateUserAvatar, fetchCurrentUser } from '../services/auth/authClient';
import { getAuthToken } from '../services/auth/secureStorage';

const ONBOARDING_KEY = 'vitra_user_onboarding_v2';
const WARDROBE_STORAGE_FILE = 'vitra_wardrobe_v1.json';
const SAVED_LOOKS_STORAGE_FILE = 'vitra_saved_looks_v1.json';
const CATEGORIES_STORAGE_FILE = 'vitra_look_categories_v1.json';

const getWardrobeFile = () => {
  try {
    if (Paths?.document) return new File(Paths.document, WARDROBE_STORAGE_FILE);
  } catch {}
  return null;
};

const getSavedLooksFile = () => {
  try {
    if (Paths?.document) return new File(Paths.document, SAVED_LOOKS_STORAGE_FILE);
  } catch {}
  return null;
};

const getCategoriesFile = () => {
  try {
    if (Paths?.document) return new File(Paths.document, CATEGORIES_STORAGE_FILE);
  } catch {}
  return null;
};

export const DEFAULT_LOOK_CATEGORIES = [
  'Todos',
  'Elegante',
  'Fiesta',
  'Casual',
  'Formal',
  'Deportivo',
];

const DEFAULT_SAMPLE_MODEL_URL = '';

export const PRESET_AVATARS: Record<string, { image_2d: string; model_3d: string; label: string }> = {
  female: {
    image_2d: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    model_3d: '',
    label: 'Silueta Femenina Atelier',
  },
  male: {
    image_2d: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
    model_3d: '',
    label: 'Silueta Masculina Atelier',
  },
  'non-binary': {
    image_2d: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    model_3d: '',
    label: 'Silueta Fluida / Neutra',
  },
};

const DEFAULT_COLOR_PROFILE: ColorProfile = {
  skin_tone: '#E2D3C4',
  hair_color: '#1C1917',
  eye_color: '#292524',
  season: 'Invierno Brillante',
  palette_name: 'PUTA',
  description:
    'Contraste elevado entre el subtono frío de la tez y la profundidad del cabello. Los tonos fríos saturados, el carbón mineral y los acentos zafiro y magenta maximizan la luminosidad y presencia estética.',
  recommended_colors: [
    '#1C1C1E',
    '#1E3A8A',
    '#0284C7',
    '#7C3AED',
    '#E11D48',
    '#10B981',
    '#0F172A',
    '#F8FAFC',
  ],
  colors_to_avoid: ['#D97706', '#84CC16', '#B45309', '#CA8A04'],
};

export interface CompleteOnboardingData {
  fullName?: string | null;
  age?: number | null;
  gender?: 'female' | 'male' | 'non-binary' | string | null;
  facePhotoUri?: string | null;
  bodyPhotoUri?: string | null;
  avatarUrl?: string | null;
  avatarType?: 'preset' | 'custom_3d' | 'none';
  colorProfile?: ColorProfile | null;
  photoUri?: string | null;
}

export interface UserContextValue {
  // --- Estado de arranque ---
  isReady: boolean;

  // --- Identidad ---
  userProfile: UserProfile & { age?: number; facePhotoUri?: string; bodyPhotoUri?: string };
  colorProfile: ColorProfile;
  avatarUrl?: string;
  avatarType: 'preset' | 'custom_3d' | 'none';
  avatarCreatedAt?: string;
  gender: 'female' | 'male' | 'non-binary' | string;
  userPhotoUri?: string;
  facePhotoUri?: string;
  bodyPhotoUri?: string;
  completedOnboarding: boolean;

  // --- VTON + Colorimetría ---
  avatar_2d_image: string;
  avatar_3d_base_url: string;
  colorimetry_profile: ColorProfile;

  // --- Armario y Looks ---
  wardrobe_items: Garment[];        // alias deprecado de wardrobeItems
  wardrobeItems: Garment[];
  savedLooks: SavedLookItem[];
  lookCategories: string[];

  // --- Derivados para UI (evitan recalcular en pantalla) ---
  hasCustomAvatar: boolean;
  hasAvatar: boolean;
  wardrobeCount: number;
  favoriteWardrobeCount: number;
  savedLooksCount: number;
  favoriteLooksCount: number;

  // --- Estados async visibles para la UI ---
  isGeneratingAvatar: boolean;
  avatarError: string | null;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncAt: Date | null;
  clearAvatarError: () => void;
  clearSyncError: () => void;

  // --- Acciones de Armario ---
  addGarmentToWardrobe: (garment: Garment) => void;
  removeGarmentFromWardrobe: (id: string) => void;
  toggleFavoriteGarment: (id: string) => void;
  setWardrobeItems: React.Dispatch<React.SetStateAction<Garment[]>>;
  clearWardrobe: () => void;

  // --- Acciones de Looks y Categorías ---
  addLookCategory: (categoryName: string) => void;
  removeLookCategory: (categoryName: string) => void;
  updateLookCategory: (lookId: string, category: string) => void;
  toggleFavoriteLook: (id: string) => void;
  saveLook: (look: SavedLookItem) => void;
  removeLook: (id: string) => void;
  updateLook: (look: SavedLookItem) => void;
  clearSavedLooks: () => void;

  // --- Avatar / Gemelo Digital ---
  setGender: (gender: 'female' | 'male' | 'non-binary' | string) => void;
  setPresetAvatar: (gender: string) => Promise<void> | void;
  createCustomAvatar: (imageUriOrBase64: string) => Promise<string>;
  replaceAvatar: (imageUriOrBase64: string) => Promise<string>;
  deleteAvatar: () => Promise<void>;

  // --- Perfil ---
  updateColorProfile: (profile: Partial<ColorProfile> & { season: string; recommended_colors: string[] }) => void;
  updateAvatarUrl: (url: string) => void;
  setUserPhotoUri: (uri: string) => void;
  updateBodyProfile: (body: BodyProfile) => void;
  completeOnboarding: (data?: CompleteOnboardingData) => void;
  syncProfileWithBackend: () => Promise<void>;
  resetProfile: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

const errorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Ocurrió un error inesperado';
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  const [userName, setUserName] = useState<string>('Atelier User');
  const [userAge, setUserAge] = useState<number | undefined>(undefined);
  const [gender, setGender] = useState<'female' | 'male' | 'non-binary' | string>('female');
  const [facePhotoUri, setFacePhotoUri] = useState<string | undefined>(undefined);
  const [bodyPhotoUri, setBodyPhotoUri] = useState<string | undefined>(undefined);

  const [colorProfile, setColorProfile] = useState<ColorProfile>(DEFAULT_COLOR_PROFILE);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [avatarType, setAvatarType] = useState<'preset' | 'custom_3d' | 'none'>('preset');
  const [avatarCreatedAt, setAvatarCreatedAt] = useState<string | undefined>(undefined);
  const [userPhotoUri, setUserPhotoUri] = useState<string | undefined>(undefined);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(INITIAL_BODY_PROFILE);
  const [completedOnboarding, setCompletedOnboarding] = useState<boolean>(false);

  const [wardrobeItems, setWardrobeItems] = useState<Garment[]>(MOCK_GARMENTS);
  const [savedLooks, setSavedLooks] = useState<SavedLookItem[]>([]);
  const [lookCategories, setLookCategories] = useState<string[]>(DEFAULT_LOOK_CATEGORIES);

  // --- Estados async visibles para la UI ---
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const clearAvatarError = useCallback(() => setAvatarError(null), []);
  const clearSyncError = useCallback(() => setSyncError(null), []);

  // ---------------------------------------------------------------------------
  // Persistencia
  // ---------------------------------------------------------------------------
  const saveWardrobeToDisk = useCallback(async (items: Garment[]) => {
    try {
      const file = getWardrobeFile();
      if (file) await file.write(JSON.stringify(items));
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('vitra_wardrobe_v1', JSON.stringify(items));
      }
    } catch (e) {
      console.warn('[UserContext] Error al persistir prendas en disco:', e);
    }
  }, []);

  const saveLooksToDisk = useCallback(async (looks: SavedLookItem[]) => {
    try {
      const file = getSavedLooksFile();
      if (file) await file.write(JSON.stringify(looks));
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('vitra_saved_looks_v1', JSON.stringify(looks));
      }
    } catch (e) {
      console.warn('[UserContext] Error al persistir looks en disco:', e);
    }
  }, []);

  const saveCategoriesToDisk = useCallback(async (categories: string[]) => {
    try {
      const file = getCategoriesFile();
      if (file) await file.write(JSON.stringify(categories));
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('vitra_look_categories_v1', JSON.stringify(categories));
      }
    } catch (e) {
      console.warn('[UserContext] Error al persistir categorías:', e);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Sincronización con backend
  // ---------------------------------------------------------------------------
  const syncProfileWithBackend = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      let avatarFound = false;
      const token = await getAuthToken();

      if (token) {
        try {
          const me = await fetchCurrentUser(token);
          if (me) {
            if (me.name) setUserName(me.name);
            if (me.gender) setGender(me.gender);
            if (me.age) setUserAge(me.age);

            if (me.color_profile) {
              setColorProfile(me.color_profile);
              try {
                const jsonStr = JSON.stringify(me.color_profile);
                if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                  localStorage.setItem('vitra_color_profile', jsonStr);
                } else if (typeof SecureStore?.setItemAsync === 'function') {
                  SecureStore.setItemAsync('vitra_color_profile', jsonStr).catch(() => {});
                }
              } catch {}
            }

            if (me.body_profile) setBodyProfile(me.body_profile);

            if (me.avatar_url) {
              setAvatarUrl(me.avatar_url);
              setAvatarType((me.avatar_type as any) || 'custom_3d');
              avatarFound = true;
              try {
                if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                  localStorage.setItem('vitra_avatar_url', me.avatar_url);
                  localStorage.setItem('vitra_avatar_type', me.avatar_type || 'custom_3d');
                } else if (typeof SecureStore?.setItemAsync === 'function') {
                  SecureStore.setItemAsync('vitra_avatar_url', me.avatar_url).catch(() => {});
                  SecureStore.setItemAsync('vitra_avatar_type', me.avatar_type || 'custom_3d').catch(() => {});
                }
              } catch {}
            } else if (me.avatar_type === 'preset' || !me.avatar_url) {
              setAvatarType('preset');
              avatarFound = true;
              try {
                const defaultRes = await getDefaultAvatarModel(me.gender || gender || 'female');
                if (defaultRes?.avatar_url) setAvatarUrl(defaultRes.avatar_url);
              } catch {}
            }
          }
        } catch {
          // Token inactivo: seguimos al fallback latest
        }
      }

      if (!avatarFound && !token) {
        try {
          const latest = await getLatestAvatarModel();
          if (latest?.avatar_url && !latest.avatar_url.includes('default_')) {
            setAvatarUrl(latest.avatar_url);
            setAvatarType('custom_3d');
            try {
              if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.setItem('vitra_avatar_url', latest.avatar_url);
                localStorage.setItem('vitra_avatar_type', 'custom_3d');
              } else if (typeof SecureStore?.setItemAsync === 'function') {
                SecureStore.setItemAsync('vitra_avatar_url', latest.avatar_url).catch(() => {});
                SecureStore.setItemAsync('vitra_avatar_type', 'custom_3d').catch(() => {});
              }
            } catch {}
          }
        } catch (latestErr) {
          console.warn('[UserContext] Error consultando avatar latest:', latestErr);
        }
      }

      setLastSyncAt(new Date());
    } catch (e) {
      const msg = errorMessage(e);
      setSyncError(msg);
      console.warn('[UserContext] Error sincronizando con backend:', msg);
    } finally {
      setIsSyncing(false);
    }
  }, [gender]);

  // ---------------------------------------------------------------------------
  // Bootstrap inicial
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        let saved: string | null = null;

        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          saved = localStorage.getItem(ONBOARDING_KEY);
          const savedGender = localStorage.getItem('vitra_gender');
          if (savedGender) setGender(savedGender);
          const savedAvatarType = localStorage.getItem('vitra_avatar_type');
          if (savedAvatarType) setAvatarType(savedAvatarType as any);
          const savedAvatarUrl = localStorage.getItem('vitra_avatar_url');
          if (savedAvatarUrl) {
            setAvatarUrl(savedAvatarUrl);
          } else if (savedGender) {
            getDefaultAvatarModel(savedGender)
              .then((res) => { if (res?.avatar_url) setAvatarUrl(res.avatar_url); })
              .catch(() => {});
          }
          const savedCreatedAt = localStorage.getItem('vitra_avatar_created_at');
          if (savedCreatedAt) setAvatarCreatedAt(savedCreatedAt);
          const savedFace = localStorage.getItem('vitra_face_photo_uri');
          if (savedFace) setFacePhotoUri(savedFace);
          const savedBody = localStorage.getItem('vitra_body_photo_uri');
          if (savedBody) setBodyPhotoUri(savedBody);
          const savedColor = localStorage.getItem('vitra_color_profile');
          if (savedColor) {
            try {
              const parsed = JSON.parse(savedColor);
              if (parsed && parsed.season) setColorProfile(parsed);
            } catch {}
          }
        } else if (typeof SecureStore?.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync())) {
          saved = await SecureStore.getItemAsync(ONBOARDING_KEY);
          const savedGender = await SecureStore.getItemAsync('vitra_gender');
          if (savedGender) setGender(savedGender);
          const savedAvatarType = await SecureStore.getItemAsync('vitra_avatar_type');
          if (savedAvatarType) setAvatarType(savedAvatarType as any);
          const savedAvatarUrl = await SecureStore.getItemAsync('vitra_avatar_url');
          if (savedAvatarUrl) {
            setAvatarUrl(savedAvatarUrl);
          } else if (savedGender) {
            getDefaultAvatarModel(savedGender)
              .then((res) => { if (res?.avatar_url) setAvatarUrl(res.avatar_url); })
              .catch(() => {});
          }
          const savedCreatedAt = await SecureStore.getItemAsync('vitra_avatar_created_at');
          if (savedCreatedAt) setAvatarCreatedAt(savedCreatedAt);
          const savedFace = await SecureStore.getItemAsync('vitra_face_photo_uri');
          if (savedFace) setFacePhotoUri(savedFace);
          const savedBody = await SecureStore.getItemAsync('vitra_body_photo_uri');
          if (savedBody) setBodyPhotoUri(savedBody);
          const savedColor = await SecureStore.getItemAsync('vitra_color_profile');
          if (savedColor) {
            try {
              const parsed = JSON.parse(savedColor);
              if (parsed && parsed.season) setColorProfile(parsed);
            } catch {}
          }
        }

        if (saved === 'true') setCompletedOnboarding(true);

        // Sincronización en segundo plano (no bloquea el primer render)
        syncProfileWithBackend().catch(() => {});
      } catch (err) {
        console.warn('[UserContext] Error al leer estado de onboarding:', err);
      } finally {
        setIsReady(true);
      }
    };

    loadSavedState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Carga de armario
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadWardrobe = async () => {
      try {
        const file = getWardrobeFile();
        if (file && file.exists) {
          const content = await file.text();
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setWardrobeItems(parsed);
              return;
            }
          }
        }
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          const webSaved = localStorage.getItem('vitra_wardrobe_v1');
          if (webSaved) {
            const parsed = JSON.parse(webSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setWardrobeItems(parsed);
              return;
            }
          }
        }
        setWardrobeItems(MOCK_GARMENTS);
      } catch (err) {
        console.warn('[UserContext] Error al cargar prendas del armario:', err);
      }
    };
    loadWardrobe();
  }, []);

  // ---------------------------------------------------------------------------
  // Carga de categorías
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const file = getCategoriesFile();
        if (file && file.exists) {
          const content = await file.text();
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLookCategories(parsed);
              return;
            }
          }
        }
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          const webSaved = localStorage.getItem('vitra_look_categories_v1');
          if (webSaved) {
            const parsed = JSON.parse(webSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLookCategories(parsed);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('[UserContext] Error al cargar categorías de looks:', err);
      }
    };
    loadCategories();
  }, []);

  // ---------------------------------------------------------------------------
  // Carga de looks guardados
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadSavedLooks = async () => {
      try {
        const normalize = (parsed: any[]): SavedLookItem[] =>
          parsed
            .filter((l: SavedLookItem) => l.id !== 'look-1' && l.id !== 'look-2')
            .map((l: SavedLookItem, idx: number) => ({
              ...l,
              category: l.category || (idx % 2 === 0 ? 'Elegante' : 'Fiesta'),
              isFavorite: Boolean(l.isFavorite),
            }));

        const file = getSavedLooksFile();
        if (file && file.exists) {
          const content = await file.text();
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              setSavedLooks(normalize(parsed));
              return;
            }
          }
        }
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          const webSaved = localStorage.getItem('vitra_saved_looks_v1');
          if (webSaved) {
            const parsed = JSON.parse(webSaved);
            if (Array.isArray(parsed)) {
              setSavedLooks(normalize(parsed));
              return;
            }
          }
        }
        setSavedLooks([]);
      } catch (err) {
        console.warn('[UserContext] Error al cargar looks guardados:', err);
      }
    };
    loadSavedLooks();
  }, []);

  // ---------------------------------------------------------------------------
  // Categorías
  // ---------------------------------------------------------------------------
  const addLookCategory = useCallback((categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setLookCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === trimmed.toLowerCase());
      if (exists) return prev;
      const next = [...prev, trimmed];
      saveCategoriesToDisk(next);
      return next;
    });
  }, [saveCategoriesToDisk]);

  const removeLookCategory = useCallback((categoryName: string) => {
    setLookCategories((prev) => {
      const next = prev.filter((c) => c !== categoryName);
      saveCategoriesToDisk(next);
      return next;
    });
  }, [saveCategoriesToDisk]);

  // ---------------------------------------------------------------------------
  // Armario
  // ---------------------------------------------------------------------------
  const addGarmentToWardrobe = useCallback((garment: Garment) => {
    setWardrobeItems((prev) => {
      const idx = prev.findIndex((g) => g.id === garment.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), garment, ...prev.slice(idx + 1)] : [garment, ...prev];
      saveWardrobeToDisk(next);
      return next;
    });
  }, [saveWardrobeToDisk]);

  const removeGarmentFromWardrobe = useCallback((id: string) => {
    setWardrobeItems((prev) => {
      const next = prev.filter((g) => g.id !== id);
      saveWardrobeToDisk(next);
      return next;
    });
  }, [saveWardrobeToDisk]);

  const toggleFavoriteGarment = useCallback((id: string) => {
    setWardrobeItems((prev) => {
      const next = prev.map((g) => (g.id === id ? { ...g, isFavorite: !g.isFavorite } : g));
      saveWardrobeToDisk(next);
      return next;
    });
  }, [saveWardrobeToDisk]);

  const clearWardrobe = useCallback(() => {
    setWardrobeItems([]);
    saveWardrobeToDisk([]);
  }, [saveWardrobeToDisk]);

  // ---------------------------------------------------------------------------
  // Looks
  // ---------------------------------------------------------------------------
  const saveLook = useCallback((look: SavedLookItem) => {
    setSavedLooks((prev) => {
      const idx = prev.findIndex((l) => l.id === look.id);
      const next = idx >= 0 ? [...prev.slice(0, idx), look, ...prev.slice(idx + 1)] : [look, ...prev];
      saveLooksToDisk(next);
      return next;
    });
  }, [saveLooksToDisk]);

  const removeLook = useCallback((id: string) => {
    setSavedLooks((prev) => {
      const next = prev.filter((l) => l.id !== id);
      saveLooksToDisk(next);
      return next;
    });
  }, [saveLooksToDisk]);

  const updateLook = useCallback((look: SavedLookItem) => saveLook(look), [saveLook]);

  const clearSavedLooks = useCallback(() => {
    setSavedLooks([]);
    saveLooksToDisk([]);
  }, [saveLooksToDisk]);

  const updateLookCategory = useCallback((lookId: string, category: string) => {
    setSavedLooks((prev) => {
      const next = prev.map((l) => (l.id === lookId ? { ...l, category } : l));
      saveLooksToDisk(next);
      return next;
    });
  }, [saveLooksToDisk]);

  const toggleFavoriteLook = useCallback((id: string) => {
    setSavedLooks((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, isFavorite: !l.isFavorite } : l));
      saveLooksToDisk(next);
      return next;
    });
  }, [saveLooksToDisk]);

  // ---------------------------------------------------------------------------
  // Avatar: preset
  // ---------------------------------------------------------------------------
  const setPresetAvatar = useCallback(async (selectedGender: string) => {
    setGender(selectedGender);
    setAvatarType('preset');
    setBodyPhotoUri(undefined);
    setAvatarError(null);

    try {
      const defaultRes = await getDefaultAvatarModel(selectedGender);
      if (defaultRes?.avatar_url) {
        setAvatarUrl(defaultRes.avatar_url);
        try {
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.setItem('vitra_avatar_url', defaultRes.avatar_url);
          } else if (typeof SecureStore?.setItemAsync === 'function') {
            SecureStore.setItemAsync('vitra_avatar_url', defaultRes.avatar_url).catch(() => {});
          }
        } catch {}
      }
    } catch (err) {
      console.warn('[UserContext] Error al resolver modelo 3D por defecto:', err);
    }

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('vitra_gender', selectedGender);
        localStorage.setItem('vitra_avatar_type', 'preset');
      } else if (typeof SecureStore?.setItemAsync === 'function') {
        SecureStore.setItemAsync('vitra_gender', selectedGender).catch(() => {});
        SecureStore.setItemAsync('vitra_avatar_type', 'preset').catch(() => {});
      }
    } catch {}
  }, []);

  // ---------------------------------------------------------------------------
  // Avatar: custom
  // ---------------------------------------------------------------------------
  const createCustomAvatar = useCallback(async (imageUriOrBase64: string): Promise<string> => {
    setIsGeneratingAvatar(true);
    setAvatarError(null);

    let newUrl = '';
    try {
      const token = await getAuthToken();

      try {
        const res = await updateUserAvatar(imageUriOrBase64, token);
        newUrl = res.avatar_url;
      } catch (backendErr) {
        console.warn('[UserContext] Falló /api/users/avatar, usando fallback:', errorMessage(backendErr));
        const fallbackRes = await generateAvatar(imageUriOrBase64);
        newUrl = fallbackRes.avatar_url;
      }

      const createdAtStr = new Date().toLocaleDateString();
      setAvatarUrl(newUrl);
      setAvatarType('custom_3d');
      setAvatarCreatedAt(createdAtStr);

      try {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('vitra_avatar_url', newUrl);
          localStorage.setItem('vitra_avatar_type', 'custom_3d');
          localStorage.setItem('vitra_avatar_created_at', createdAtStr);
        } else if (typeof SecureStore?.setItemAsync === 'function') {
          SecureStore.setItemAsync('vitra_avatar_url', newUrl).catch(() => {});
          SecureStore.setItemAsync('vitra_avatar_type', 'custom_3d').catch(() => {});
          SecureStore.setItemAsync('vitra_avatar_created_at', createdAtStr).catch(() => {});
        }
      } catch {}

      return newUrl;
    } catch (err) {
      setAvatarError(errorMessage(err));
      throw err;
    } finally {
      setIsGeneratingAvatar(false);
    }
  }, []);

  const replaceAvatar = useCallback(
    async (imageUriOrBase64: string): Promise<string> => createCustomAvatar(imageUriOrBase64),
    [createCustomAvatar]
  );

  const deleteAvatar = useCallback(async (): Promise<void> => {
    setIsGeneratingAvatar(true);
    setAvatarError(null);

    try {
      let presetUrl = '';
      try {
        const token = await getAuthToken();
        const res: any = await deleteCurrentAvatar(token);
        if (res?.avatar_url) presetUrl = res.avatar_url;
      } catch (delErr) {
        console.warn('[UserContext] Error al eliminar avatar en backend:', delErr);
      }

      setAvatarType('preset');
      setBodyPhotoUri(undefined);
      setAvatarCreatedAt(undefined);

      if (presetUrl) {
        setAvatarUrl(presetUrl);
      } else {
        try {
          const defaultRes = await getDefaultAvatarModel(gender || 'female');
          setAvatarUrl(defaultRes?.avatar_url || '');
        } catch {
          setAvatarUrl('');
        }
      }

      try {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.removeItem('vitra_avatar_url');
          localStorage.removeItem('vitra_avatar_created_at');
          localStorage.removeItem('vitra_body_photo_uri');
          localStorage.setItem('vitra_avatar_type', 'preset');
        } else if (typeof SecureStore?.deleteItemAsync === 'function') {
          SecureStore.deleteItemAsync('vitra_avatar_url').catch(() => {});
          SecureStore.deleteItemAsync('vitra_avatar_created_at').catch(() => {});
          SecureStore.deleteItemAsync('vitra_body_photo_uri').catch(() => {});
          SecureStore.setItemAsync('vitra_avatar_type', 'preset').catch(() => {});
        }
      } catch {}
    } catch (err) {
      setAvatarError(errorMessage(err));
    } finally {
      setIsGeneratingAvatar(false);
    }
  }, [gender]);

  // ---------------------------------------------------------------------------
  // Colorimetría / perfil
  // ---------------------------------------------------------------------------
  const updateColorProfile = useCallback(
    (profileData: Partial<ColorProfile> & { season: string; recommended_colors: string[] }) => {
      setColorProfile((prev) => {
        const merged: ColorProfile = {
          ...prev,
          ...profileData,
          skin_tone: profileData.skin_tone || prev.skin_tone,
          hair_color: profileData.hair_color || prev.hair_color,
          season: profileData.season || prev.season,
          description: profileData.description || prev.description,
          recommended_colors: profileData.recommended_colors || prev.recommended_colors,
          colors_to_avoid: profileData.colors_to_avoid || prev.colors_to_avoid,
        };

        try {
          const jsonStr = JSON.stringify(merged);
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.setItem('vitra_color_profile', jsonStr);
          } else if (typeof SecureStore?.setItemAsync === 'function') {
            SecureStore.setItemAsync('vitra_color_profile', jsonStr).catch(() => {});
          }
        } catch {}

        return merged;
      });
    },
    []
  );

  const updateAvatarUrl = useCallback((url: string) => {
    setAvatarUrl(url);
    if (url) setAvatarType('custom_3d');
  }, []);

  const updateBodyProfile = useCallback((body: BodyProfile) => setBodyProfile(body), []);

  const completeOnboarding = useCallback((data?: CompleteOnboardingData) => {
    if (data?.fullName) setUserName(data.fullName);
    if (data?.age !== undefined && data?.age !== null) setUserAge(data.age);

    if (data?.gender) {
      setGender(data.gender);
      try {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('vitra_gender', data.gender);
        } else if (typeof SecureStore?.setItemAsync === 'function') {
          SecureStore.setItemAsync('vitra_gender', data.gender).catch(() => {});
        }
      } catch {}
    }

    if (data?.facePhotoUri !== undefined) {
      setFacePhotoUri(data.facePhotoUri || undefined);
      try {
        if (data.facePhotoUri) {
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.setItem('vitra_face_photo_uri', data.facePhotoUri);
          } else if (typeof SecureStore?.setItemAsync === 'function') {
            SecureStore.setItemAsync('vitra_face_photo_uri', data.facePhotoUri).catch(() => {});
          }
        }
      } catch {}
    }

    if (data?.bodyPhotoUri !== undefined) {
      setBodyPhotoUri(data.bodyPhotoUri || undefined);
      try {
        if (data.bodyPhotoUri) {
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.setItem('vitra_body_photo_uri', data.bodyPhotoUri);
          } else if (typeof SecureStore?.setItemAsync === 'function') {
            SecureStore.setItemAsync('vitra_body_photo_uri', data.bodyPhotoUri).catch(() => {});
          }
        }
      } catch {}
    }

    if (data?.avatarUrl) {
      setAvatarUrl(data.avatarUrl);
      setAvatarType(data.avatarType || 'custom_3d');
    } else {
      setAvatarType(data?.avatarType || 'preset');
      getDefaultAvatarModel(data?.gender || gender || 'female')
        .then((res) => { if (res?.avatar_url) setAvatarUrl(res.avatar_url); })
        .catch(() => {});
    }

    if (data?.colorProfile) {
      setColorProfile(data.colorProfile);
      try {
        const jsonStr = JSON.stringify(data.colorProfile);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('vitra_color_profile', jsonStr);
        } else if (typeof SecureStore?.setItemAsync === 'function') {
          SecureStore.setItemAsync('vitra_color_profile', jsonStr).catch(() => {});
        }
      } catch {}
    }

    if (data?.photoUri !== undefined) setUserPhotoUri(data.photoUri || undefined);

    setCompletedOnboarding(true);

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      } else if (typeof SecureStore?.setItemAsync === 'function') {
        SecureStore.setItemAsync(ONBOARDING_KEY, 'true').catch(() => {});
      }
    } catch {}
  }, [gender]);

  const resetProfile = useCallback(() => {
    setUserName('Atelier User');
    setUserAge(undefined);
    setGender('female');
    setFacePhotoUri(undefined);
    setBodyPhotoUri(undefined);
    setColorProfile(DEFAULT_COLOR_PROFILE);
    setAvatarUrl(DEFAULT_SAMPLE_MODEL_URL);
    setAvatarType('preset');
    setAvatarCreatedAt(undefined);
    setUserPhotoUri(undefined);
    setWardrobeItems(MOCK_GARMENTS);
    setSavedLooks(MOCK_SAVED_LOOKS);
    setLookCategories(DEFAULT_LOOK_CATEGORIES);
    setBodyProfile(INITIAL_BODY_PROFILE);
    setAvatarError(null);
    setSyncError(null);
    setLastSyncAt(null);

    saveWardrobeToDisk(MOCK_GARMENTS);
    saveLooksToDisk(MOCK_SAVED_LOOKS);
    saveCategoriesToDisk(DEFAULT_LOOK_CATEGORIES);

    setCompletedOnboarding(false);

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        [
          ONBOARDING_KEY,
          'vitra_gender',
          'vitra_avatar_type',
          'vitra_avatar_url',
          'vitra_avatar_created_at',
          'vitra_face_photo_uri',
          'vitra_body_photo_uri',
          'vitra_color_profile',
        ].forEach((k) => localStorage.removeItem(k));
      } else if (typeof SecureStore?.deleteItemAsync === 'function') {
        [
          ONBOARDING_KEY,
          'vitra_gender',
          'vitra_avatar_type',
          'vitra_avatar_url',
          'vitra_avatar_created_at',
          'vitra_face_photo_uri',
          'vitra_body_photo_uri',
          'vitra_color_profile',
        ].forEach((k) => SecureStore.deleteItemAsync(k).catch(() => {}));
      }
    } catch {}
  }, [saveWardrobeToDisk, saveLooksToDisk, saveCategoriesToDisk]);

  // ---------------------------------------------------------------------------
  // Derivados (memoizados para evitar re-render)
  // ---------------------------------------------------------------------------
  const presetForGender = PRESET_AVATARS[gender] || PRESET_AVATARS.female;
  const avatar_2d_image = bodyPhotoUri || userPhotoUri || presetForGender.image_2d;
  const avatar_3d_base_url = avatarUrl || DEFAULT_SAMPLE_MODEL_URL;
  const colorimetry_profile = colorProfile;

  const hasCustomAvatar = avatarType === 'custom_3d' && Boolean(avatarUrl);
  const hasAvatar = Boolean(avatarUrl);

  const wardrobeCount = wardrobeItems.length;
  const favoriteWardrobeCount = useMemo(
    () => wardrobeItems.filter((g) => g.isFavorite).length,
    [wardrobeItems]
  );
  const savedLooksCount = savedLooks.length;
  const favoriteLooksCount = useMemo(
    () => savedLooks.filter((l) => l.isFavorite).length,
    [savedLooks]
  );

  const userProfile = useMemo<UserProfile & { age?: number; facePhotoUri?: string; bodyPhotoUri?: string }>(
    () => ({
      id: 'user-default',
      name: userName,
      age: userAge,
      gender,
      avatar_type: avatarType,
      avatar_created_at: avatarCreatedAt,
      facePhotoUri,
      bodyPhotoUri,
      avatar_url: avatarUrl,
      color_profile: colorProfile,
      body_profile: bodyProfile,
      completedOnboarding,
    }),
    [
      userName, userAge, gender, avatarType, avatarCreatedAt,
      facePhotoUri, bodyPhotoUri, avatarUrl, colorProfile,
      bodyProfile, completedOnboarding,
    ]
  );

  const value = useMemo<UserContextValue>(
    () => ({
      isReady,
      userProfile,
      colorProfile,
      avatarUrl,
      avatarType,
      avatarCreatedAt,
      gender,
      userPhotoUri,
      facePhotoUri,
      bodyPhotoUri,
      completedOnboarding,
      avatar_2d_image,
      avatar_3d_base_url,
      colorimetry_profile,
      wardrobe_items: wardrobeItems,
      wardrobeItems,
      savedLooks,
      lookCategories,
      hasCustomAvatar,
      hasAvatar,
      wardrobeCount,
      favoriteWardrobeCount,
      savedLooksCount,
      favoriteLooksCount,
      isGeneratingAvatar,
      avatarError,
      isSyncing,
      syncError,
      lastSyncAt,
      clearAvatarError,
      clearSyncError,
      addLookCategory,
      removeLookCategory,
      updateLookCategory,
      toggleFavoriteLook,
      addGarmentToWardrobe,
      removeGarmentFromWardrobe,
      toggleFavoriteGarment,
      setWardrobeItems,
      clearWardrobe,
      saveLook,
      removeLook,
      updateLook,
      clearSavedLooks,
      setGender,
      setPresetAvatar,
      createCustomAvatar,
      replaceAvatar,
      deleteAvatar,
      updateColorProfile,
      updateAvatarUrl,
      setUserPhotoUri,
      updateBodyProfile,
      completeOnboarding,
      syncProfileWithBackend,
      resetProfile,
    }),
    [
      isReady, userProfile, colorProfile, avatarUrl, avatarType, avatarCreatedAt,
      gender, userPhotoUri, facePhotoUri, bodyPhotoUri, completedOnboarding,
      avatar_2d_image, avatar_3d_base_url, colorimetry_profile,
      wardrobeItems, savedLooks, lookCategories,
      hasCustomAvatar, hasAvatar, wardrobeCount, favoriteWardrobeCount,
      savedLooksCount, favoriteLooksCount,
      isGeneratingAvatar, avatarError, isSyncing, syncError, lastSyncAt,
      clearAvatarError, clearSyncError,
      addLookCategory, removeLookCategory, updateLookCategory, toggleFavoriteLook,
      addGarmentToWardrobe, removeGarmentFromWardrobe, toggleFavoriteGarment,
      clearWardrobe, saveLook, removeLook, updateLook, clearSavedLooks,
      setPresetAvatar, createCustomAvatar, replaceAvatar, deleteAvatar,
      updateColorProfile, updateAvatarUrl, updateBodyProfile, completeOnboarding,
      syncProfileWithBackend, resetProfile,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser debe utilizarse dentro de un UserProvider');
  return context;
};