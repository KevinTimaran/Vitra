import React, { createContext, useContext, useState, useEffect } from 'react';
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
    if (Paths?.document) {
      return new File(Paths.document, WARDROBE_STORAGE_FILE);
    }
  } catch {}
  return null;
};

const getSavedLooksFile = () => {
  try {
    if (Paths?.document) {
      return new File(Paths.document, SAVED_LOOKS_STORAGE_FILE);
    }
  } catch {}
  return null;
};

const getCategoriesFile = () => {
  try {
    if (Paths?.document) {
      return new File(Paths.document, CATEGORIES_STORAGE_FILE);
    }
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
    image_2d: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
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
  palette_name: 'Clear Winter Editorial',
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

  // Propiedades VTON + Colorimetría globales
  avatar_2d_image: string;
  avatar_3d_base_url: string;
  colorimetry_profile: ColorProfile;
  wardrobe_items: Garment[];
  wardrobeItems: Garment[];
  savedLooks: SavedLookItem[];

  // Acciones de Armario
  addGarmentToWardrobe: (garment: Garment) => void;
  removeGarmentFromWardrobe: (id: string) => void;
  toggleFavoriteGarment: (id: string) => void;
  setWardrobeItems: React.Dispatch<React.SetStateAction<Garment[]>>;

  // Acciones de Looks Guardados y Categorías
  lookCategories: string[];
  addLookCategory: (categoryName: string) => void;
  updateLookCategory: (lookId: string, category: string) => void;
  toggleFavoriteLook: (id: string) => void;
  saveLook: (look: SavedLookItem) => void;
  removeLook: (id: string) => void;
  updateLook: (look: SavedLookItem) => void;

  // Acciones de Gemelo Digital / Avatar
  setGender: (gender: 'female' | 'male' | 'non-binary' | string) => void;
  setPresetAvatar: (gender: string) => Promise<void> | void;
  createCustomAvatar: (imageUriOrBase64: string) => Promise<string>;
  replaceAvatar: (imageUriOrBase64: string) => Promise<string>;
  deleteAvatar: () => Promise<void>;

  updateColorProfile: (profile: Partial<ColorProfile> & { season: string; recommended_colors: string[] }) => void;
  updateAvatarUrl: (url: string) => void;
  setUserPhotoUri: (uri: string) => void;
  updateBodyProfile: (body: BodyProfile) => void;
  completeOnboarding: (data?: CompleteOnboardingData) => void;
  syncProfileWithBackend: () => Promise<void>;
  resetProfile: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  // 1. Cargar estado de Onboarding y Género
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
            getDefaultAvatarModel(savedGender).then((res) => {
              if (res?.avatar_url) {
                setAvatarUrl(res.avatar_url);
              }
            }).catch(() => {});
          }
          const savedCreatedAt = localStorage.getItem('vitra_avatar_created_at');
          if (savedCreatedAt) setAvatarCreatedAt(savedCreatedAt);
          const savedFace = localStorage.getItem('vitra_face_photo_uri');
          if (savedFace) setFacePhotoUri(savedFace);
          const savedBody = localStorage.getItem('vitra_body_photo_uri');
          if (savedBody) setBodyPhotoUri(savedBody);
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
            getDefaultAvatarModel(savedGender).then((res) => {
              if (res?.avatar_url) {
                setAvatarUrl(res.avatar_url);
              }
            }).catch(() => {});
          }
          const savedCreatedAt = await SecureStore.getItemAsync('vitra_avatar_created_at');
          if (savedCreatedAt) setAvatarCreatedAt(savedCreatedAt);
          const savedFace = await SecureStore.getItemAsync('vitra_face_photo_uri');
          if (savedFace) setFacePhotoUri(savedFace);
          const savedBody = await SecureStore.getItemAsync('vitra_body_photo_uri');
          if (savedBody) setBodyPhotoUri(savedBody);
        }
        if (saved === 'true') {
          setCompletedOnboarding(true);
        }

        // Sincronizar en segundo plano con el backend para recuperar el avatar 3D más reciente
        syncProfileWithBackend().catch(() => {});
      } catch (err) {
        console.warn('[UserContext] Error al leer estado de onboarding:', err);
      }
    };

    loadSavedState();
  }, []);

  // 2. Cargar Armario Persistente
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
        // Si no hay datos guardados, inicializar con mock
        setWardrobeItems(MOCK_GARMENTS);
      } catch (err) {
        console.warn('[UserContext] Error al cargar prendas del armario:', err);
      }
    };
    loadWardrobe();
  }, []);

  const [lookCategories, setLookCategories] = useState<string[]>(DEFAULT_LOOK_CATEGORIES);

  // Cargar Categorías de Looks Persistentes
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

  const saveCategoriesToDisk = async (categories: string[]) => {
    try {
      const file = getCategoriesFile();
      if (file) {
        await file.write(JSON.stringify(categories));
      }
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('vitra_look_categories_v1', JSON.stringify(categories));
      }
    } catch (e) {
      console.warn('[UserContext] Error al persistir categorías:', e);
    }
  };

  const addLookCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setLookCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === trimmed.toLowerCase());
      if (exists) return prev;
      const next = [...prev, trimmed];
      saveCategoriesToDisk(next);
      return next;
    });
  };

  const updateLookCategory = (lookId: string, category: string) => {
    setSavedLooks((prev) => {
      const next = prev.map((l) => (l.id === lookId ? { ...l, category } : l));
      saveLooksToDisk(next);
      return next;
    });
  };

  const toggleFavoriteLook = (id: string) => {
    setSavedLooks((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, isFavorite: !l.isFavorite } : l
      );
      saveLooksToDisk(next);
      return next;
    });
  };

  // 3. Cargar Looks Guardados Persistentes
  useEffect(() => {
    const loadSavedLooks = async () => {
      try {
        const file = getSavedLooksFile();
        if (file && file.exists) {
          const content = await file.text();
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              const realLooks = parsed
                .filter((l: SavedLookItem) => l.id !== 'look-1' && l.id !== 'look-2')
                .map((l: SavedLookItem, idx: number) => ({
                  ...l,
                  category: l.category || (idx % 2 === 0 ? 'Elegante' : 'Fiesta'),
                  isFavorite: Boolean(l.isFavorite),
                }));
              setSavedLooks(realLooks);
              return;
            }
          }
        }
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          const webSaved = localStorage.getItem('vitra_saved_looks_v1');
          if (webSaved) {
            const parsed = JSON.parse(webSaved);
            if (Array.isArray(parsed)) {
              const realLooks = parsed
                .filter((l: SavedLookItem) => l.id !== 'look-1' && l.id !== 'look-2')
                .map((l: SavedLookItem, idx: number) => ({
                  ...l,
                  category: l.category || (idx % 2 === 0 ? 'Elegante' : 'Fiesta'),
                  isFavorite: Boolean(l.isFavorite),
                }));
              setSavedLooks(realLooks);
              return;
            }
          }
        }
        // Inicializar sin looks adicionales ficticios (solo el avatar principal del usuario)
        setSavedLooks([]);
      } catch (err) {
        console.warn('[UserContext] Error al cargar looks guardados:', err);
      }
    };
    loadSavedLooks();
  }, []);

  const saveWardrobeToDisk = async (items: Garment[]) => {
    try {
      const file = getWardrobeFile();
      if (file) {
        await file.write(JSON.stringify(items));
      }
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('vitra_wardrobe_v1', JSON.stringify(items));
      }
    } catch (e) {
      console.warn('[UserContext] Error al persistir prendas en disco:', e);
    }
  };

  const saveLooksToDisk = async (looks: SavedLookItem[]) => {
    try {
      const file = getSavedLooksFile();
      if (file) {
        await file.write(JSON.stringify(looks));
      }
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('vitra_saved_looks_v1', JSON.stringify(looks));
      }
    } catch (e) {
      console.warn('[UserContext] Error al persistir looks en disco:', e);
    }
  };

  const addGarmentToWardrobe = (garment: Garment) => {
    setWardrobeItems((prev) => {
      const idx = prev.findIndex((g) => g.id === garment.id);
      let next: Garment[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = garment;
      } else {
        next = [garment, ...prev];
      }
      saveWardrobeToDisk(next);
      return next;
    });
  };

  const removeGarmentFromWardrobe = (id: string) => {
    setWardrobeItems((prev) => {
      const next = prev.filter((g) => g.id !== id);
      saveWardrobeToDisk(next);
      return next;
    });
  };

  const toggleFavoriteGarment = (id: string) => {
    setWardrobeItems((prev) => {
      const next = prev.map((g) =>
        g.id === id ? { ...g, isFavorite: !g.isFavorite } : g
      );
      saveWardrobeToDisk(next);
      return next;
    });
  };

  // Acciones de Looks
  const saveLook = (look: SavedLookItem) => {
    setSavedLooks((prev) => {
      const idx = prev.findIndex((l) => l.id === look.id);
      let next: SavedLookItem[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = look;
      } else {
        next = [look, ...prev];
      }
      saveLooksToDisk(next);
      return next;
    });
  };

  const removeLook = (id: string) => {
    setSavedLooks((prev) => {
      const next = prev.filter((l) => l.id !== id);
      saveLooksToDisk(next);
      return next;
    });
  };

  const updateLook = (look: SavedLookItem) => {
    saveLook(look);
  };

  // Gestión de Gemelo Digital / Avatar
  const setPresetAvatar = async (selectedGender: string) => {
    console.log('[UserContext] Asignando avatar preset para género:', selectedGender);
    setGender(selectedGender);
    setAvatarType('preset');
    setBodyPhotoUri(undefined);

    // Resolver modelo 3D optimizado por defecto según el género
    try {
      const defaultRes = await getDefaultAvatarModel(selectedGender);
      if (defaultRes?.avatar_url) {
        console.log('[UserContext] Modelo optimizado por defecto obtenido:', defaultRes.avatar_url);
        setAvatarUrl(defaultRes.avatar_url);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('vitra_avatar_url', defaultRes.avatar_url);
        } else if (typeof SecureStore?.setItemAsync === 'function') {
          SecureStore.setItemAsync('vitra_avatar_url', defaultRes.avatar_url).catch(() => {});
        }
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
  };

  const createCustomAvatar = async (imageUriOrBase64: string): Promise<string> => {
    console.log('[UserContext] Generando avatar personalizado con Tripo3D...');
    let newUrl = '';
    const token = await getAuthToken();

    try {
      // Flow 3: Persistir y generar en users_db vía backend
      const res = await updateUserAvatar(imageUriOrBase64, token);
      newUrl = res.avatar_url;
      console.log('[UserContext] Avatar actualizado en backend users_db exitosamente:', newUrl);
    } catch (backendErr: any) {
      console.warn('[UserContext] Falló /api/users/avatar, usando fallback generateAvatar:', backendErr?.message);
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
  };

  const replaceAvatar = async (imageUriOrBase64: string): Promise<string> => {
    return await createCustomAvatar(imageUriOrBase64);
  };

  const deleteAvatar = async (): Promise<void> => {
    console.log('[UserContext] Eliminando avatar 3D activo y revirtiendo a preset...');
    let presetUrl = '';
    try {
      const token = await getAuthToken();
      const res: any = await deleteCurrentAvatar(token);
      if (res?.avatar_url) {
        presetUrl = res.avatar_url;
      }
    } catch (delErr) {
      console.warn('[UserContext] Error al eliminar avatar en backend:', delErr);
    }
    setAvatarType('preset');
    setBodyPhotoUri(undefined);
    setAvatarCreatedAt(undefined);

    // Asignar el modelo optimizado por defecto
    if (presetUrl) {
      setAvatarUrl(presetUrl);
    } else {
      try {
        const defaultRes = await getDefaultAvatarModel(gender || 'female');
        if (defaultRes?.avatar_url) {
          setAvatarUrl(defaultRes.avatar_url);
        } else {
          setAvatarUrl('');
        }
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
  };

  const updateColorProfile = (
    profileData: Partial<ColorProfile> & { season: string; recommended_colors: string[] }
  ) => {
    setColorProfile((prev) => ({
      ...prev,
      ...profileData,
      skin_tone: profileData.skin_tone || prev.skin_tone,
      hair_color: profileData.hair_color || prev.hair_color,
      season: profileData.season || prev.season,
      description: profileData.description || prev.description,
      recommended_colors: profileData.recommended_colors || prev.recommended_colors,
      colors_to_avoid: profileData.colors_to_avoid || prev.colors_to_avoid,
    }));
  };

  const updateAvatarUrl = (url: string) => {
    setAvatarUrl(url);
    if (url) {
      setAvatarType('custom_3d');
    }
  };

  const updateBodyProfile = (body: BodyProfile) => {
    setBodyProfile(body);
  };

  const syncProfileWithBackend = async (): Promise<void> => {
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
              console.log('[UserContext] Perfil de colorimetría sincronizado desde backend:', me.color_profile);
              setColorProfile(me.color_profile);
            }
            if (me.body_profile) {
              setBodyProfile(me.body_profile);
            }
            if (me.avatar_url) {
              console.log('[UserContext] Avatar 3D sincronizado desde backend (/me):', me.avatar_url);
              setAvatarUrl(me.avatar_url);
              setAvatarType((me.avatar_type as any) || 'custom_3d');
              avatarFound = true;
              if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.setItem('vitra_avatar_url', me.avatar_url);
                localStorage.setItem('vitra_avatar_type', me.avatar_type || 'custom_3d');
              } else if (typeof SecureStore?.setItemAsync === 'function') {
                SecureStore.setItemAsync('vitra_avatar_url', me.avatar_url).catch(() => {});
                SecureStore.setItemAsync('vitra_avatar_type', me.avatar_type || 'custom_3d').catch(() => {});
              }
            } else if (me.avatar_type === 'preset' || !me.avatar_url) {
              setAvatarType('preset');
              avatarFound = true;
              try {
                const defaultRes = await getDefaultAvatarModel(me.gender || gender || 'female');
                if (defaultRes?.avatar_url) {
                  setAvatarUrl(defaultRes.avatar_url);
                }
              } catch {}
            }
          }
        } catch (authErr) {
          console.log('[UserContext] Token no activo en /me, verificando modelo en /api/avatar/latest...');
        }
      }

      // Solo si el usuario NO está autenticado (!token) y se perdió la referencia local del avatar
      if (!avatarFound && !token) {
        try {
          const latest = await getLatestAvatarModel();
          if (latest?.avatar_url && !latest.avatar_url.includes('default_')) {
            console.log('[UserContext] ¡Modelo 3D personalizado recuperado con éxito desde latest!:', latest.avatar_url);
            setAvatarUrl(latest.avatar_url);
            setAvatarType('custom_3d');
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
              localStorage.setItem('vitra_avatar_url', latest.avatar_url);
              localStorage.setItem('vitra_avatar_type', 'custom_3d');
            } else if (typeof SecureStore?.setItemAsync === 'function') {
              SecureStore.setItemAsync('vitra_avatar_url', latest.avatar_url).catch(() => {});
              SecureStore.setItemAsync('vitra_avatar_type', 'custom_3d').catch(() => {});
            }
          }
        } catch (latestErr) {
          console.warn('[UserContext] Error consultando avatar latest:', latestErr);
        }
      }

    } catch (e) {
      console.warn('[UserContext] Error sincronizando con backend:', e);
    }
  };

  const completeOnboarding = (data?: CompleteOnboardingData) => {
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
      // Resolver avatar optimizado por defecto si no se especificó URL
      getDefaultAvatarModel(data?.gender || gender || 'female')
        .then((res) => {
          if (res?.avatar_url) {
            console.log('[UserContext] completeOnboarding: avatar por defecto asignado:', res.avatar_url);
            setAvatarUrl(res.avatar_url);
          }
        })
        .catch((err) => {
          console.warn('[UserContext] completeOnboarding: error obteniendo avatar por defecto:', err);
        });
    }

    if (data?.colorProfile) setColorProfile(data.colorProfile);
    if (data?.photoUri !== undefined) setUserPhotoUri(data.photoUri || undefined);

    setCompletedOnboarding(true);

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      } else if (typeof SecureStore?.setItemAsync === 'function') {
        SecureStore.setItemAsync(ONBOARDING_KEY, 'true').catch(() => {});
      }
    } catch {}
  };

  const resetProfile = () => {
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
    saveWardrobeToDisk(MOCK_GARMENTS);
    saveLooksToDisk(MOCK_SAVED_LOOKS);
    setCompletedOnboarding(false);

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(ONBOARDING_KEY);
        localStorage.removeItem('vitra_gender');
        localStorage.removeItem('vitra_avatar_type');
        localStorage.removeItem('vitra_avatar_url');
        localStorage.removeItem('vitra_avatar_created_at');
        localStorage.removeItem('vitra_face_photo_uri');
        localStorage.removeItem('vitra_body_photo_uri');
      } else if (typeof SecureStore?.deleteItemAsync === 'function') {
        SecureStore.deleteItemAsync(ONBOARDING_KEY).catch(() => {});
        SecureStore.deleteItemAsync('vitra_gender').catch(() => {});
        SecureStore.deleteItemAsync('vitra_avatar_type').catch(() => {});
        SecureStore.deleteItemAsync('vitra_avatar_url').catch(() => {});
        SecureStore.deleteItemAsync('vitra_avatar_created_at').catch(() => {});
        SecureStore.deleteItemAsync('vitra_face_photo_uri').catch(() => {});
        SecureStore.deleteItemAsync('vitra_body_photo_uri').catch(() => {});
      }
    } catch {}
  };

  // Resolución de silueta 2D según fotos o preset del género seleccionado
  const presetForGender = PRESET_AVATARS[gender] || PRESET_AVATARS.female;
  const avatar_2d_image =
    bodyPhotoUri || userPhotoUri || presetForGender.image_2d;

  const avatar_3d_base_url = avatarUrl || DEFAULT_SAMPLE_MODEL_URL;
  const colorimetry_profile = colorProfile;

  const userProfile: UserProfile & { age?: number; facePhotoUri?: string; bodyPhotoUri?: string } = {
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
  };

  return (
    <UserContext.Provider
      value={{
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
        addLookCategory,
        updateLookCategory,
        toggleFavoriteLook,
        addGarmentToWardrobe,
        removeGarmentFromWardrobe,
        toggleFavoriteGarment,
        setWardrobeItems,
        saveLook,
        removeLook,
        updateLook,
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
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe utilizarse dentro de un UserProvider');
  }
  return context;
};
