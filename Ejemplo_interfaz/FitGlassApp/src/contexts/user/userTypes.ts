import type { Dispatch, SetStateAction } from 'react';
import type { BodyProfile, ColorProfile, Garment, SavedLookItem, UserProfile } from '../../types';

export interface CompleteOnboardingData {
  fullName?: string | null;
  email?: string | null;
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
  isReady: boolean;
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

  avatar_2d_image: string;
  avatar_3d_base_url: string;
  colorimetry_profile: ColorProfile;

  wardrobe_items: Garment[];
  wardrobeItems: Garment[];
  savedLooks: SavedLookItem[];
  lookCategories: string[];

  hasCustomAvatar: boolean;
  hasAvatar: boolean;
  wardrobeCount: number;
  favoriteWardrobeCount: number;
  savedLooksCount: number;
  favoriteLooksCount: number;

  isGeneratingAvatar: boolean;
  avatarError: string | null;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncAt: Date | null;
  clearAvatarError: () => void;
  clearSyncError: () => void;

  addGarmentToWardrobe: (garment: Garment) => void;
  removeGarmentFromWardrobe: (id: string) => void;
  toggleFavoriteGarment: (id: string) => void;
  setWardrobeItems: Dispatch<SetStateAction<Garment[]>>;
  clearWardrobe: () => void;

  addLookCategory: (categoryName: string) => void;
  removeLookCategory: (categoryName: string) => void;
  updateLookCategory: (lookId: string, category: string) => void;
  toggleFavoriteLook: (id: string) => void;
  saveLook: (look: SavedLookItem) => void;
  removeLook: (id: string) => void;
  updateLook: (look: SavedLookItem) => void;
  clearSavedLooks: () => void;

  setGender: (gender: 'female' | 'male' | 'non-binary' | string) => void;
  setPresetAvatar: (gender: string) => Promise<void>;
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
