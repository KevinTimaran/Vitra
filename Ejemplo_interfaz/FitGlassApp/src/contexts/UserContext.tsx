import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, ColorProfile, BodyProfile } from '../types';
import { INITIAL_BODY_PROFILE } from '../data/mockData';

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

interface UserContextValue {
  userProfile: UserProfile;
  colorProfile: ColorProfile;
  avatarUrl?: string;
  userPhotoUri?: string;
  updateColorProfile: (profile: Partial<ColorProfile> & { season: string; recommended_colors: string[] }) => void;
  updateAvatarUrl: (url: string) => void;
  setUserPhotoUri: (uri: string) => void;
  updateBodyProfile: (body: BodyProfile) => void;
  completeOnboarding: (data?: {
    avatarUrl?: string;
    colorProfile?: ColorProfile;
    photoUri?: string;
  }) => void;
  resetProfile: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorProfile, setColorProfile] = useState<ColorProfile>(DEFAULT_COLOR_PROFILE);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf'
  );
  const [userPhotoUri, setUserPhotoUri] = useState<string | undefined>(undefined);
  const [bodyProfile, setBodyProfile] = useState<BodyProfile>(INITIAL_BODY_PROFILE);
  const [completedOnboarding, setCompletedOnboarding] = useState<boolean>(false);

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

  const completeOnboarding = (data?: {
    avatarUrl?: string;
    colorProfile?: ColorProfile;
    photoUri?: string;
  }) => {
    if (data?.avatarUrl) setAvatarUrl(data.avatarUrl);
    if (data?.colorProfile) setColorProfile(data.colorProfile);
    if (data?.photoUri) setUserPhotoUri(data.photoUri);
    setCompletedOnboarding(true);
  };

  const resetProfile = () => {
    setColorProfile(DEFAULT_COLOR_PROFILE);
    setAvatarUrl(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf'
    );
    setUserPhotoUri(undefined);
    setCompletedOnboarding(false);
  };

  const userProfile: UserProfile = {
    id: 'user-default',
    name: 'Atelier User',
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
