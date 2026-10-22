import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import { UserProfile, ColorProfile, BodyProfile, Garment, SavedLookItem } from '../types';
import { INITIAL_BODY_PROFILE, MOCK_GARMENTS, MOCK_SAVED_LOOKS } from '../data/mockData';
import { generateAvatar, deleteCurrentAvatar } from '../services/ai/garmentAnalyzer';

const ONBOARDING_KEY = 'vitra_user_onboarding_v2';
const WARDROBE_STORAGE_FILE = 'vitra_wardrobe_v1.json';
const SAVED_LOOKS_STORAGE_FILE = 'vitra_saved_looks_v1.json';

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

  // Acciones de Looks Guardados
  saveLook: (look: SavedLookItem) => void;
  removeLook: (id: string) => void;
  updateLook: (look: SavedLookItem) => void;

  // Acciones de Gemelo Digital / Avatar
  setGender: (gender: 'female' | 'male' | 'non-binary' | string) => void;
  setPresetAvatar: (gender: string) => void;
  createCustomAvatar: (imageUriOrBase64: string) => Promise<string>;
  replaceAvatar: (imageUriOrBase64: string) => Promise<string>;
  deleteAvatar: () => Promise<void>;

  updateColorProfile: (profile: Partial<ColorProfile> & { season: string; recommended_colors: string[] }) => void;
  updateAvatarUrl: (url: string) => void;
  setUserPhotoUri: (uri: string) => void;
  updateBodyProfile: (body: BodyProfile) => void;
  completeOnboarding: (data?: CompleteOnboardingData) => void;
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
  const [savedLooks, setSavedLooks] = useState<SavedLookItem[]>(MOCK_SAVED_LOOKS);

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
          if (savedAvatarUrl) setAvatarUrl(savedAvatarUrl);
        } else if (typeof SecureStore?.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync())) {
          saved = await SecureStore.getItemAsync(ONBOARDING_KEY);
          const savedGender = await SecureStore.getItemAsync('vitra_gender');
          if (savedGender) setGender(savedGender);
          const savedAvatarType = await SecureStore.getItemAsync('vitra_avatar_type');
          if (savedAvatarType) setAvatarType(savedAvatarType as any);
          const savedAvatarUrl = await SecureStore.getItemAsync('vitra_avatar_url');
          if (savedAvatarUrl) setAvatarUrl(savedAvatarUrl);
        }
        if (saved === 'true') {
          setCompletedOnboarding(true);
        }
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

  // 3. Cargar Looks Guardados Persistentes
  useEffect(() => {
    const loadSavedLooks = async () => {
      try {
        const file = getSavedLooksFile();
        if (file && file.exists) {
          const content = await file.text();
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSavedLooks(parsed);
              return;
            }
          }
        }
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          const webSaved = localStorage.getItem('vitra_saved_looks_v1');
          if (webSaved) {
            const parsed = JSON.parse(webSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSavedLooks(parsed);
              return;
            }
          }
        }
        // Si no hay datos guardados, inicializar con mock
        setSavedLooks(MOCK_SAVED_LOOKS);
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
  const setPresetAvatar = (selectedGender: string) => {
    setGender(selectedGender);
    setAvatarType('preset');
    setAvatarUrl(DEFAULT_SAMPLE_MODEL_URL);
    setBodyPhotoUri(undefined);

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('vitra_gender', selectedGender);
        localStorage.setItem('vitra_avatar_type', 'preset');
        localStorage.removeItem('vitra_avatar_url');
      } else if (typeof SecureStore?.setItemAsync === 'function') {
        SecureStore.setItemAsync('vitra_gender', selectedGender).catch(() => {});
        SecureStore.setItemAsync('vitra_avatar_type', 'preset').catch(() => {});
        SecureStore.deleteItemAsync('vitra_avatar_url').catch(() => {});
      }
    } catch {}
  };

  const createCustomAvatar = async (imageUriOrBase64: string): Promise<string> => {
    console.log('[UserContext] Generando avatar personalizado con Tripo3D...');
    const res = await generateAvatar(imageUriOrBase64);
    const newUrl = res.avatar_url;
    setAvatarUrl(newUrl);
    setAvatarType('custom_3d');
    setAvatarCreatedAt(new Date().toLocaleDateString());

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem('vitra_avatar_url', newUrl);
        localStorage.setItem('vitra_avatar_type', 'custom_3d');
      } else if (typeof SecureStore?.setItemAsync === 'function') {
        SecureStore.setItemAsync('vitra_avatar_url', newUrl).catch(() => {});
        SecureStore.setItemAsync('vitra_avatar_type', 'custom_3d').catch(() => {});
      }
    } catch {}

    return newUrl;
  };

  const replaceAvatar = async (imageUriOrBase64: string): Promise<string> => {
    return await createCustomAvatar(imageUriOrBase64);
  };

  const deleteAvatar = async (): Promise<void> => {
    console.log('[UserContext] Eliminando avatar 3D activo y revirtiendo a preset...');
    await deleteCurrentAvatar();
    setAvatarUrl(DEFAULT_SAMPLE_MODEL_URL);
    setAvatarType('preset');
    setBodyPhotoUri(undefined);
    setAvatarCreatedAt(undefined);

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('vitra_avatar_url');
        localStorage.setItem('vitra_avatar_type', 'preset');
      } else if (typeof SecureStore?.deleteItemAsync === 'function') {
        SecureStore.deleteItemAsync('vitra_avatar_url').catch(() => {});
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
    if (data?.facePhotoUri !== undefined) setFacePhotoUri(data.facePhotoUri || undefined);
    if (data?.bodyPhotoUri !== undefined) setBodyPhotoUri(data.bodyPhotoUri || undefined);

    if (data?.avatarUrl) {
      setAvatarUrl(data.avatarUrl);
      setAvatarType('custom_3d');
    } else if (data?.avatarType) {
      setAvatarType(data.avatarType);
    } else {
      setAvatarType('preset');
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
      } else if (typeof SecureStore?.deleteItemAsync === 'function') {
        SecureStore.deleteItemAsync(ONBOARDING_KEY).catch(() => {});
        SecureStore.deleteItemAsync('vitra_gender').catch(() => {});
        SecureStore.deleteItemAsync('vitra_avatar_type').catch(() => {});
        SecureStore.deleteItemAsync('vitra_avatar_url').catch(() => {});
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
