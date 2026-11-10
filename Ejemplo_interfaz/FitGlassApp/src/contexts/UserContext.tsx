import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Garment, UserProfile } from '../types';
import { MOCK_GARMENTS, MOCK_SAVED_LOOKS } from '../data/mockData';
import { DEFAULT_LOOK_CATEGORIES, PRESET_AVATARS } from './user/userDefaults';
import { COLLECTION_STORAGE, loadCollection, loadPersistedProfile, normalizeSavedLooks } from './user/userStorage';
import { useSavedLooksState } from './user/useSavedLooksState';
import { useUserProfileState } from './user/useUserProfileState';
import { useWardrobeState } from './user/useWardrobeState';
import type { UserContextValue } from './user/userTypes';
import { useAuth } from './AuthContext';

export { DEFAULT_LOOK_CATEGORIES, PRESET_AVATARS } from './user/userDefaults';
export type { CompleteOnboardingData, UserContextValue } from './user/userTypes';

const UserContext = createContext<UserContextValue | undefined>(undefined);

const normalizeGarments = (items: unknown[]): Garment[] =>
  items.filter((item): item is Garment => {
    if (typeof item !== 'object' || item === null) return false;
    const garment = item as Record<string, unknown>;
    return typeof garment.id === 'string' && typeof garment.name === 'string';
  });

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userToken } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const profileState = useUserProfileState(isReady);
  const wardrobeState = useWardrobeState(isReady);
  const looksState = useSavedLooksState(isReady);
  const hydrateProfile = profileState.hydrateProfile;
  const syncProfileWithBackend = profileState.syncProfileWithBackend;
  const resetUserProfile = profileState.resetProfile;
  const setWardrobeItems = wardrobeState.setWardrobeItems;
  const setSavedLooks = looksState.setSavedLooks;
  const setLookCategories = looksState.setLookCategories;

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const [profile, wardrobe, savedLooks, categories] = await Promise.all([
          loadPersistedProfile(),
          loadCollection(
            COLLECTION_STORAGE.wardrobe.fileName,
            COLLECTION_STORAGE.wardrobe.webKey,
            normalizeGarments
          ),
          loadCollection(
            COLLECTION_STORAGE.savedLooks.fileName,
            COLLECTION_STORAGE.savedLooks.webKey,
            normalizeSavedLooks
          ),
          loadCollection(
            COLLECTION_STORAGE.lookCategories.fileName,
            COLLECTION_STORAGE.lookCategories.webKey,
            (items) => items.filter((item): item is string => typeof item === 'string')
          ),
        ]);

        if (!isMounted) return;
        hydrateProfile(profile);
        setWardrobeItems(wardrobe ?? MOCK_GARMENTS);
        setSavedLooks(savedLooks ?? []);
        setLookCategories(categories ?? DEFAULT_LOOK_CATEGORIES);
      } catch (error) {
        console.warn('[UserContext] Error al cargar el estado local:', error);
      } finally {
        if (isMounted) setIsReady(true);
      }
    };

    void hydrate();
    return () => {
      isMounted = false;
    };
  }, [hydrateProfile, setWardrobeItems, setSavedLooks, setLookCategories]);

  useEffect(() => {
    if (isReady) void syncProfileWithBackend();
  }, [isReady, userToken, syncProfileWithBackend]);

  const profile = profileState.profile;
  const presetForGender = PRESET_AVATARS[profile.gender] || PRESET_AVATARS.female;
  const avatar2dImage = profile.bodyPhotoUri || profile.userPhotoUri || presetForGender.image_2d;
  const avatar3dBaseUrl = profile.avatarUrl || '';
  const hasCustomAvatar = profile.avatarType === 'custom_3d' && Boolean(profile.avatarUrl);
  const hasAvatar = Boolean(profile.avatarUrl);

  const userProfile = useMemo<UserProfile & { age?: number; facePhotoUri?: string; bodyPhotoUri?: string }>(
    () => ({
      id: profile.userEmail || 'user-default',
      email: profile.userEmail,
      name: profile.userName,
      age: profile.userAge,
      gender: profile.gender,
      avatar_type: profile.avatarType,
      avatar_created_at: profile.avatarCreatedAt,
      facePhotoUri: profile.facePhotoUri,
      bodyPhotoUri: profile.bodyPhotoUri,
      avatar_url: profile.avatarUrl,
      color_profile: profile.colorProfile,
      body_profile: profile.bodyProfile,
      completedOnboarding: profile.completedOnboarding,
    }), [profile]
  );

  const resetProfile = useCallback(() => {
    resetUserProfile();
    setWardrobeItems(MOCK_GARMENTS);
    setSavedLooks(MOCK_SAVED_LOOKS);
    setLookCategories(DEFAULT_LOOK_CATEGORIES);
  }, [resetUserProfile, setWardrobeItems, setSavedLooks, setLookCategories]);

  const value = useMemo<UserContextValue>(() => ({
    isReady,
    userProfile,
    colorProfile: profile.colorProfile,
    avatarUrl: profile.avatarUrl,
    avatarType: profile.avatarType,
    avatarCreatedAt: profile.avatarCreatedAt,
    gender: profile.gender,
    userPhotoUri: profile.userPhotoUri,
    facePhotoUri: profile.facePhotoUri,
    bodyPhotoUri: profile.bodyPhotoUri,
    completedOnboarding: profile.completedOnboarding,
    avatar_2d_image: avatar2dImage,
    avatar_3d_base_url: avatar3dBaseUrl,
    colorimetry_profile: profile.colorProfile,
    wardrobe_items: wardrobeState.wardrobeItems,
    wardrobeItems: wardrobeState.wardrobeItems,
    savedLooks: looksState.savedLooks,
    lookCategories: looksState.lookCategories,
    hasCustomAvatar,
    hasAvatar,
    wardrobeCount: wardrobeState.wardrobeCount,
    favoriteWardrobeCount: wardrobeState.favoriteWardrobeCount,
    savedLooksCount: looksState.savedLooksCount,
    favoriteLooksCount: looksState.favoriteLooksCount,
    isGeneratingAvatar: profile.isGeneratingAvatar,
    avatarError: profile.avatarError,
    isSyncing: profile.isSyncing,
    syncError: profile.syncError,
    lastSyncAt: profile.lastSyncAt,
    clearAvatarError: profileState.clearAvatarError,
    clearSyncError: profileState.clearSyncError,
    addGarmentToWardrobe: wardrobeState.addGarmentToWardrobe,
    removeGarmentFromWardrobe: wardrobeState.removeGarmentFromWardrobe,
    toggleFavoriteGarment: wardrobeState.toggleFavoriteGarment,
    setWardrobeItems: wardrobeState.setWardrobeItems,
    clearWardrobe: wardrobeState.clearWardrobe,
    addLookCategory: looksState.addLookCategory,
    removeLookCategory: looksState.removeLookCategory,
    updateLookCategory: looksState.updateLookCategory,
    toggleFavoriteLook: looksState.toggleFavoriteLook,
    saveLook: looksState.saveLook,
    removeLook: looksState.removeLook,
    updateLook: looksState.updateLook,
    clearSavedLooks: looksState.clearSavedLooks,
    setGender: profileState.setGender,
    setPresetAvatar: profileState.setPresetAvatar,
    createCustomAvatar: profileState.createCustomAvatar,
    replaceAvatar: profileState.replaceAvatar,
    deleteAvatar: profileState.deleteAvatar,
    updateColorProfile: profileState.updateColorProfile,
    updateAvatarUrl: profileState.updateAvatarUrl,
    setUserPhotoUri: profileState.setUserPhotoUri,
    updateBodyProfile: profileState.updateBodyProfile,
    completeOnboarding: profileState.completeOnboarding,
    syncProfileWithBackend: profileState.syncProfileWithBackend,
    resetProfile,
  }), [
    isReady,
    userProfile,
    profile,
    avatar2dImage,
    avatar3dBaseUrl,
    hasCustomAvatar,
    hasAvatar,
    wardrobeState,
    looksState,
    profileState,
    resetProfile,
  ]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser debe utilizarse dentro de un UserProvider');
  return context;
};
