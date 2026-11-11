import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Garment, UserProfile } from '../types';
import { MOCK_GARMENTS } from '../data/mockData';
import { DEFAULT_LOOK_CATEGORIES, PRESET_AVATARS } from './user/userDefaults';
import {
  COLLECTION_STORAGE,
  loadCollection,
  loadPersistedProfile,
  normalizeSavedLooks,
  scopeKeyFor,
} from './user/userStorage';
import { useSavedLooksState } from './user/useSavedLooksState';
import { useUserProfileState } from './user/useUserProfileState';
import { useWardrobeState } from './user/useWardrobeState';
import { useWardrobeSync } from './user/useWardrobeSync';
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

// Los datos guardados antes de existir `updatedAt` se marcan una vez para poder sincronizarlos.
const withTimestamps = <T extends { updatedAt?: number }>(items: T[]): T[] => {
  const now = Date.now();
  return items.map((item) => (typeof item.updatedAt === 'number' ? item : { ...item, updatedAt: now }));
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userToken, userEmail, isLoadingToken } = useAuth();

  // Cada cuenta (o "guest") tiene sus propios archivos; el estado en memoria solo está "listo" para el usuario
  // cuyos datos se cargaron. Así cerrar sesión o cambiar de cuenta nunca escribe datos sobre otro usuario.
  const scope = useMemo(() => scopeKeyFor(userEmail), [userEmail]);
  const [readyScope, setReadyScope] = useState<string | null>(null);
  const isReady = readyScope === scope;

  const profileState = useUserProfileState(isReady);
  const wardrobeState = useWardrobeState(isReady, scope);
  const looksState = useSavedLooksState(isReady, scope);
  const hydrateProfile = profileState.hydrateProfile;
  const syncProfileWithBackend = profileState.syncProfileWithBackend;
  const resetUserProfile = profileState.resetProfile;
  const setWardrobeItems = wardrobeState.setWardrobeItems;
  const setSavedLooks = looksState.setSavedLooks;
  const setLookCategories = looksState.setLookCategories;

  useEffect(() => {
    if (isLoadingToken) return; // primero hay que saber qué usuario hay
    let isMounted = true;

    const hydrate = async () => {
      try {
        const [profile, wardrobe, savedLooks, categories] = await Promise.all([
          loadPersistedProfile(),
          loadCollection(COLLECTION_STORAGE.wardrobe.fileName, COLLECTION_STORAGE.wardrobe.webKey, normalizeGarments, scope),
          loadCollection(COLLECTION_STORAGE.savedLooks.fileName, COLLECTION_STORAGE.savedLooks.webKey, normalizeSavedLooks, scope),
          loadCollection(
            COLLECTION_STORAGE.lookCategories.fileName,
            COLLECTION_STORAGE.lookCategories.webKey,
            (items) => items.filter((item): item is string => typeof item === 'string'),
            scope
          ),
        ]);

        if (!isMounted) return;
        hydrateProfile(profile);
        // Si un archivo no se pudo leer ('error') se muestran los valores por defecto, pero userStorage
        // bloquea su escritura: los datos reales del disco no se sobrescriben.
        setWardrobeItems(withTimestamps(wardrobe.status === 'ok' ? wardrobe.items : MOCK_GARMENTS));
        setSavedLooks(withTimestamps(savedLooks.status === 'ok' ? savedLooks.items : []));
        setLookCategories(categories.status === 'ok' ? categories.items : DEFAULT_LOOK_CATEGORIES);
      } catch (error) {
        console.warn('[UserContext] Error al cargar el estado local:', error);
      } finally {
        if (isMounted) setReadyScope(scope);
      }
    };

    void hydrate();
    return () => {
      isMounted = false;
    };
  }, [scope, isLoadingToken, hydrateProfile, setWardrobeItems, setSavedLooks, setLookCategories]);

  useEffect(() => {
    if (isReady) void syncProfileWithBackend();
  }, [isReady, userToken, syncProfileWithBackend]);

  const wardrobeSync = useWardrobeSync({
    scope,
    isReady,
    token: userToken,
    garments: wardrobeState.wardrobeItems,
    looks: looksState.savedLooks,
    categories: looksState.lookCategories,
    setGarments: setWardrobeItems,
    setLooks: setSavedLooks,
    setCategories: setLookCategories,
  });
  const recordDeletion = wardrobeSync.recordDeletion;

  const removeGarmentFromWardrobe = useCallback((id: string) => {
    wardrobeState.removeGarmentFromWardrobe(id);
    recordDeletion('garments', id);
  }, [wardrobeState.removeGarmentFromWardrobe, recordDeletion]);

  const removeLook = useCallback((id: string) => {
    looksState.removeLook(id);
    recordDeletion('looks', id);
  }, [looksState.removeLook, recordDeletion]);

  const clearWardrobe = useCallback(() => {
    wardrobeState.wardrobeItems.forEach((item) => recordDeletion('garments', item.id));
    wardrobeState.clearWardrobe();
  }, [wardrobeState.wardrobeItems, wardrobeState.clearWardrobe, recordDeletion]);

  const clearSavedLooks = useCallback(() => {
    looksState.savedLooks.forEach((look) => recordDeletion('looks', look.id));
    looksState.clearSavedLooks();
  }, [looksState.savedLooks, looksState.clearSavedLooks, recordDeletion]);

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

  // Solo restablece el PERFIL. El armario y los looks no se tocan: pertenecen a la cuenta y se conservan
  // (el cambio de usuario al cerrar sesión recarga los datos del nuevo ámbito).
  const resetProfile = useCallback(() => {
    resetUserProfile();
  }, [resetUserProfile]);

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
    removeGarmentFromWardrobe,
    toggleFavoriteGarment: wardrobeState.toggleFavoriteGarment,
    setWardrobeItems: wardrobeState.setWardrobeItems,
    clearWardrobe,
    addLookCategory: looksState.addLookCategory,
    removeLookCategory: looksState.removeLookCategory,
    updateLookCategory: looksState.updateLookCategory,
    toggleFavoriteLook: looksState.toggleFavoriteLook,
    saveLook: looksState.saveLook,
    removeLook,
    updateLook: looksState.updateLook,
    clearSavedLooks,
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
    lastWardrobeSyncAt: wardrobeSync.lastWardrobeSyncAt,
    wardrobeSyncError: wardrobeSync.wardrobeSyncError,
    syncWardrobeNow: () => wardrobeSync.syncNow(true),
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
    removeGarmentFromWardrobe,
    removeLook,
    clearWardrobe,
    clearSavedLooks,
    wardrobeSync.lastWardrobeSyncAt,
    wardrobeSync.wardrobeSyncError,
    wardrobeSync.syncNow,
  ]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser debe utilizarse dentro de un UserProvider');
  return context;
};
