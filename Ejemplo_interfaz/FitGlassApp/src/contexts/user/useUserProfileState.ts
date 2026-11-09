import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { BodyProfile, ColorProfile } from '../../types';
import { fetchCurrentUser, getDefaultAvatarModel, updateUserAvatar } from '../../services/auth/authClient';
import { deleteCurrentAvatar, generateAvatar, getLatestAvatarModel } from '../../services/ai/garmentAnalyzer';
import { getAuthToken } from '../../services/auth/secureStorage';
import { DEFAULT_BODY_PROFILE, DEFAULT_COLOR_PROFILE, DEFAULT_GENDER, DEFAULT_SAMPLE_MODEL_URL, DEFAULT_USER_NAME } from './userDefaults';
import { persistProfile, type PersistedProfile } from './userStorage';
import type { CompleteOnboardingData } from './userTypes';

export interface UserProfileState extends PersistedProfile {
  isGeneratingAvatar: boolean;
  avatarError: string | null;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncAt: Date | null;
}

type ProfileAction =
  | { type: 'patch'; value: Partial<UserProfileState> }
  | { type: 'mergeColorProfile'; value: Partial<ColorProfile> };

const initialProfileState: UserProfileState = {
  userName: DEFAULT_USER_NAME,
  userEmail: undefined,
  userAge: undefined,
  gender: DEFAULT_GENDER,
  facePhotoUri: undefined,
  bodyPhotoUri: undefined,
  userPhotoUri: undefined,
  colorProfile: DEFAULT_COLOR_PROFILE,
  avatarUrl: undefined,
  avatarType: 'preset',
  avatarCreatedAt: undefined,
  bodyProfile: { ...DEFAULT_BODY_PROFILE },
  completedOnboarding: false,
  isGeneratingAvatar: false,
  avatarError: null,
  isSyncing: false,
  syncError: null,
  lastSyncAt: null,
};

const profileReducer = (state: UserProfileState, action: ProfileAction): UserProfileState => {
  if (action.type === 'mergeColorProfile') {
    return {
      ...state,
      colorProfile: {
        ...state.colorProfile,
        ...action.value,
        skin_tone: action.value.skin_tone || state.colorProfile.skin_tone,
        hair_color: action.value.hair_color || state.colorProfile.hair_color,
        eye_color: action.value.eye_color || state.colorProfile.eye_color,
        season: action.value.season || state.colorProfile.season,
        palette_name: action.value.palette_name || state.colorProfile.palette_name,
        description: action.value.description || state.colorProfile.description,
        recommended_colors: action.value.recommended_colors || state.colorProfile.recommended_colors,
        colors_to_avoid: action.value.colors_to_avoid || state.colorProfile.colors_to_avoid,
      },
    };
  }

  return { ...state, ...action.value };
};

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Ocurrió un error inesperado';
};

export function useUserProfileState(isReady: boolean) {
  const [profile, dispatch] = useReducer(profileReducer, initialProfileState);
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const patchProfile = useCallback((value: Partial<UserProfileState>) => {
    dispatch({ type: 'patch', value });
  }, []);

  const persistedProfile = useMemo<PersistedProfile>(() => ({
    userName: profile.userName,
    userEmail: profile.userEmail,
    userAge: profile.userAge,
    gender: profile.gender,
    facePhotoUri: profile.facePhotoUri,
    bodyPhotoUri: profile.bodyPhotoUri,
    userPhotoUri: profile.userPhotoUri,
    colorProfile: profile.colorProfile,
    avatarUrl: profile.avatarUrl,
    avatarType: profile.avatarType,
    avatarCreatedAt: profile.avatarCreatedAt,
    bodyProfile: profile.bodyProfile,
    completedOnboarding: profile.completedOnboarding,
  }), [
    profile.userName,
    profile.userEmail,
    profile.userAge,
    profile.gender,
    profile.facePhotoUri,
    profile.bodyPhotoUri,
    profile.userPhotoUri,
    profile.colorProfile,
    profile.avatarUrl,
    profile.avatarType,
    profile.avatarCreatedAt,
    profile.bodyProfile,
    profile.completedOnboarding,
  ]);

  useEffect(() => {
    if (!isReady) return;
    void persistProfile(persistedProfile).catch((error) => {
      console.warn('[UserContext] Error al guardar el perfil local:', errorMessage(error));
    });
  }, [isReady, persistedProfile]);

  const syncProfileWithBackend = useCallback(async (): Promise<void> => {
    patchProfile({ isSyncing: true, syncError: null });
    let syncSucceeded = false;

    try {
      const token = await getAuthToken();
      if (token) {
        const user = await fetchCurrentUser(token);
        if (!user) throw new Error('No se pudo recuperar el perfil de la sesión actual.');

        const nextGender = user.gender || profileRef.current.gender || DEFAULT_GENDER;
        const patch: Partial<UserProfileState> = {
          userEmail: user.email || profileRef.current.userEmail,
          userName: user.name || profileRef.current.userName,
          gender: nextGender,
          userAge: user.age ?? profileRef.current.userAge,
          colorProfile: user.color_profile || profileRef.current.colorProfile,
          bodyProfile: user.body_profile || profileRef.current.bodyProfile,
        };

        if (user.avatar_url) {
          patch.avatarUrl = user.avatar_url;
          patch.avatarType = user.avatar_type === 'none' || user.avatar_type === 'preset'
            ? user.avatar_type
            : 'custom_3d';
        } else {
          patch.avatarType = 'preset';
          const defaultAvatar = await getDefaultAvatarModel(nextGender);
          if (defaultAvatar?.avatar_url) patch.avatarUrl = defaultAvatar.avatar_url;
        }

        patchProfile(patch);
        syncSucceeded = true;
      } else {
        // Mantiene el modo demo sin sesión, pero no mezcla resultados si hay token inválido.
        const latestAvatar = await getLatestAvatarModel();
        if (latestAvatar?.avatar_url && !latestAvatar.avatar_url.includes('default_')) {
          patchProfile({ avatarUrl: latestAvatar.avatar_url, avatarType: 'custom_3d' });
        }
        syncSucceeded = true;
      }

      if (syncSucceeded) patchProfile({ lastSyncAt: new Date() });
    } catch (error) {
      const message = errorMessage(error);
      patchProfile({ syncError: message });
      console.warn('[UserContext] Error sincronizando con backend:', message);
    } finally {
      patchProfile({ isSyncing: false });
    }
  }, [patchProfile]);

  const setGender = useCallback((gender: string) => patchProfile({ gender }), [patchProfile]);
  const setUserPhotoUri = useCallback((uri: string) => patchProfile({ userPhotoUri: uri || undefined }), [patchProfile]);
  const updateBodyProfile = useCallback((bodyProfile: BodyProfile) => patchProfile({ bodyProfile }), [patchProfile]);

  const setPresetAvatar = useCallback(async (gender: string): Promise<void> => {
    patchProfile({ gender, avatarType: 'preset', bodyPhotoUri: undefined, avatarError: null });
    try {
      const avatar = await getDefaultAvatarModel(gender);
      if (avatar?.avatar_url) patchProfile({ avatarUrl: avatar.avatar_url });
    } catch (error) {
      console.warn('[UserContext] No se pudo cargar el avatar predeterminado:', errorMessage(error));
    }
  }, [patchProfile]);

  const createCustomAvatar = useCallback(async (imageUriOrBase64: string): Promise<string> => {
    patchProfile({ isGeneratingAvatar: true, avatarError: null });
    try {
      const token = await getAuthToken();
      let avatarUrl: string;
      try {
        const response = await updateUserAvatar(imageUriOrBase64, token);
        avatarUrl = response.avatar_url;
      } catch (backendError) {
        console.warn('[UserContext] La ruta de avatar autenticada falló; se probará la ruta compatible:', errorMessage(backendError));
        try {
          const fallback = await generateAvatar(imageUriOrBase64);
          avatarUrl = fallback.avatar_url;
        } catch (genError) {
          console.warn('[UserContext] Error en generación de avatar, usando modelo base optimizado:', errorMessage(genError));
          const defaultAvatar = await getDefaultAvatarModel(profileRef.current.gender || DEFAULT_GENDER);
          avatarUrl = defaultAvatar?.avatar_url || DEFAULT_SAMPLE_MODEL_URL;
        }
      }

      if (!avatarUrl) throw new Error('El servidor no devolvió la URL del avatar.');
      patchProfile({ avatarUrl, avatarType: 'custom_3d', avatarCreatedAt: new Date().toLocaleDateString() });
      return avatarUrl;
    } catch (error) {
      patchProfile({ avatarError: errorMessage(error) });
      throw error;
    } finally {
      patchProfile({ isGeneratingAvatar: false });
    }
  }, [patchProfile]);

  const replaceAvatar = useCallback(
    (imageUriOrBase64: string) => createCustomAvatar(imageUriOrBase64),
    [createCustomAvatar]
  );

  const deleteAvatar = useCallback(async (): Promise<void> => {
    patchProfile({ isGeneratingAvatar: true, avatarError: null });
    try {
      let presetUrl = '';
      try {
        const token = await getAuthToken();
        const response = await deleteCurrentAvatar(token);
        presetUrl = response.avatar_url || '';
      } catch (error) {
        console.warn('[UserContext] No se pudo borrar el avatar remoto:', errorMessage(error));
      }

      if (!presetUrl) {
        const avatar = await getDefaultAvatarModel(profileRef.current.gender || DEFAULT_GENDER);
        presetUrl = avatar?.avatar_url || DEFAULT_SAMPLE_MODEL_URL;
      }

      patchProfile({
        avatarType: 'preset',
        avatarUrl: presetUrl,
        avatarCreatedAt: undefined,
        bodyPhotoUri: undefined,
      });
    } catch (error) {
      patchProfile({ avatarError: errorMessage(error) });
    } finally {
      patchProfile({ isGeneratingAvatar: false });
    }
  }, [patchProfile]);

  const updateColorProfile = useCallback((colorProfile: Partial<ColorProfile> & { season: string; recommended_colors: string[] }) => {
    dispatch({ type: 'mergeColorProfile', value: colorProfile });
  }, []);

  const updateAvatarUrl = useCallback((avatarUrl: string) => {
    patchProfile({ avatarUrl, ...(avatarUrl ? { avatarType: 'custom_3d' as const } : {}) });
  }, [patchProfile]);

  const completeOnboarding = useCallback((data?: CompleteOnboardingData) => {
    if (!data) {
      patchProfile({ completedOnboarding: true });
      return;
    }

    const patch: Partial<UserProfileState> = { completedOnboarding: true };
    if (data.fullName) patch.userName = data.fullName;
    if (data.email !== undefined) patch.userEmail = data.email || undefined;
    if (data.age !== undefined && data.age !== null) patch.userAge = data.age;
    if (data.gender) patch.gender = data.gender;
    if (data.facePhotoUri !== undefined) patch.facePhotoUri = data.facePhotoUri || undefined;
    if (data.bodyPhotoUri !== undefined) patch.bodyPhotoUri = data.bodyPhotoUri || undefined;
    if (data.photoUri !== undefined) patch.userPhotoUri = data.photoUri || undefined;
    if (data.colorProfile) patch.colorProfile = data.colorProfile;
    if (data.avatarUrl) {
      patch.avatarUrl = data.avatarUrl;
      patch.avatarType = data.avatarType || 'custom_3d';
    } else {
      patch.avatarType = data.avatarType || 'preset';
      const selectedGender = data.gender || profileRef.current.gender || DEFAULT_GENDER;
      void getDefaultAvatarModel(selectedGender)
        .then((avatar) => {
          if (avatar?.avatar_url) patchProfile({ avatarUrl: avatar.avatar_url });
        })
        .catch((error) => console.warn('[UserContext] No se pudo asignar el avatar inicial:', errorMessage(error)));
    }
    patchProfile(patch);
  }, [patchProfile]);

  const resetProfile = useCallback(() => {
    patchProfile({
      ...initialProfileState,
      colorProfile: { ...DEFAULT_COLOR_PROFILE },
      bodyProfile: { ...DEFAULT_BODY_PROFILE },
      avatarUrl: DEFAULT_SAMPLE_MODEL_URL,
    });
  }, [patchProfile]);

  const clearAvatarError = useCallback(() => patchProfile({ avatarError: null }), [patchProfile]);
  const clearSyncError = useCallback(() => patchProfile({ syncError: null }), [patchProfile]);

  return useMemo(() => ({
    profile,
    hydrateProfile: patchProfile,
    syncProfileWithBackend,
    setGender,
    setUserPhotoUri,
    updateBodyProfile,
    setPresetAvatar,
    createCustomAvatar,
    replaceAvatar,
    deleteAvatar,
    updateColorProfile,
    updateAvatarUrl,
    completeOnboarding,
    resetProfile,
    clearAvatarError,
    clearSyncError,
  }), [
    profile,
    patchProfile,
    syncProfileWithBackend,
    setGender,
    setUserPhotoUri,
    updateBodyProfile,
    setPresetAvatar,
    createCustomAvatar,
    replaceAvatar,
    deleteAvatar,
    updateColorProfile,
    updateAvatarUrl,
    completeOnboarding,
    resetProfile,
    clearAvatarError,
    clearSyncError,
  ]);
}
