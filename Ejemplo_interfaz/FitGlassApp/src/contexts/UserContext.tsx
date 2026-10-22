import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { UserProfile, ColorProfile, BodyProfile, Garment } from '../types';
import { INITIAL_BODY_PROFILE, MOCK_GARMENTS } from '../data/mockData';

const ONBOARDING_KEY = 'vitra_user_onboarding_v2';

const DEFAULT_SAMPLE_MODEL_URL = '';

const DEFAULT_HUMAN_AVATAR_2D =
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';

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

interface CompleteOnboardingData {
  fullName?: string | null;
  age?: number | null;
  facePhotoUri?: string | null;
  bodyPhotoUri?: string | null;
  avatarUrl?: string | null;
  colorProfile?: ColorProfile | null;
  photoUri?: string | null;
}

interface UserContextValue {
  userProfile: UserProfile & { age?: number; facePhotoUri?: string; bodyPhotoUri?: string };
  colorProfile: ColorProfile;
  avatarUrl?: string;
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
  addGarmentToWardrobe: (garment: Garment) => void;
  setWardrobeItems: React.Dispatch<React.SetStateAction<Garment[]>>;
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
  const [facePhotoUri, setFacePhotoUri] = useState<string | undefined>(undefined);
  const [bodyPhotoUri, setBodyPhotoUri] = useState<string | undefined>(undefined);

  const [colorProfile, setColorProfile] = useState<ColorProfile>(DEFAULT_COLOR_PROFILE);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [userPhotoUri, setUserPhotoUri] = useState<string | undefined>(undefined);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(INITIAL_BODY_PROFILE);
  const [completedOnboarding, setCompletedOnboarding] = useState<boolean>(false);

  useEffect(() => {
    const loadSavedOnboarding = async () => {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          saved = localStorage.getItem(ONBOARDING_KEY);
        } else if (typeof SecureStore?.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync())) {
          saved = await SecureStore.getItemAsync(ONBOARDING_KEY);
        }
        if (saved === 'true') {
          setCompletedOnboarding(true);
        }
      } catch (err) {
        console.warn('[UserContext] Error al leer estado de onboarding:', err);
      }
    };

    loadSavedOnboarding();
  }, []);

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
  };

  const updateBodyProfile = (body: BodyProfile) => {
    setBodyProfile(body);
  };

  const completeOnboarding = (data?: CompleteOnboardingData) => {
    if (data?.fullName) setUserName(data.fullName);
    if (data?.age !== undefined && data?.age !== null) setUserAge(data.age);
    if (data?.facePhotoUri !== undefined) setFacePhotoUri(data.facePhotoUri || undefined);
    if (data?.bodyPhotoUri !== undefined) setBodyPhotoUri(data.bodyPhotoUri || undefined);
    if (data?.avatarUrl !== undefined) setAvatarUrl(data.avatarUrl || undefined);
    if (data?.colorProfile) setColorProfile(data.colorProfile);
    if (data?.photoUri !== undefined) setUserPhotoUri(data.photoUri || undefined);

    setCompletedOnboarding(true);

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      } else if (typeof SecureStore?.setItemAsync === 'function') {
        SecureStore.setItemAsync(ONBOARDING_KEY, 'true').catch(() => {});
      }
    } catch {
      // Ignorar
    }
  };

  const [wardrobeItems, setWardrobeItems] = useState<Garment[]>(MOCK_GARMENTS);

  const addGarmentToWardrobe = (garment: Garment) => {
    setWardrobeItems((prev) => {
      const idx = prev.findIndex((g) => g.id === garment.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = garment;
        return copy;
      }
      return [garment, ...prev];
    });
  };

  const resetProfile = () => {
    setUserName('Atelier User');
    setUserAge(undefined);
    setFacePhotoUri(undefined);
    setBodyPhotoUri(undefined);
    setColorProfile(DEFAULT_COLOR_PROFILE);
    setAvatarUrl(DEFAULT_SAMPLE_MODEL_URL);
    setUserPhotoUri(undefined);
    setWardrobeItems(MOCK_GARMENTS);
    setCompletedOnboarding(false);

    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(ONBOARDING_KEY);
      } else if (typeof SecureStore?.deleteItemAsync === 'function') {
        SecureStore.deleteItemAsync(ONBOARDING_KEY).catch(() => {});
      }
    } catch {
      // Ignorar
    }
  };

  const avatar_2d_image =
    bodyPhotoUri || userPhotoUri || DEFAULT_HUMAN_AVATAR_2D;
  const avatar_3d_base_url = avatarUrl || DEFAULT_SAMPLE_MODEL_URL;
  const colorimetry_profile = colorProfile;

  const userProfile: UserProfile & { age?: number; facePhotoUri?: string; bodyPhotoUri?: string } = {
    id: 'user-default',
    name: userName,
    age: userAge,
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
        userPhotoUri,
        facePhotoUri,
        bodyPhotoUri,
        completedOnboarding,
        avatar_2d_image,
        avatar_3d_base_url,
        colorimetry_profile,
        wardrobe_items: wardrobeItems,
        wardrobeItems,
        addGarmentToWardrobe,
        setWardrobeItems,
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
