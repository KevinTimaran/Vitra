import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useUser } from '../../../contexts/UserContext';
import { useJobs } from '../../../contexts/JobsContext';
import { useTranslation } from '../../../contexts/LanguageContext';
import { authErrorMessage } from '../../../services/auth/authErrors';
import { analyzeColorimetry, generateAvatar } from '../../../services/ai/garmentAnalyzer';
import {
  loginUser,
  registerUser,
  setupUserProfile,
  resetPassword,
  getLatestAvatarModel,
} from '../services/authActions';
import { RegisterFormData, BiometricPhotos } from '../types/auth.types';
import { logHandledError } from '../../../utils/logging';

export const DEMO_CREDENTIALS = {
  email: 'demo@vitra.ai',
  password: 'password123',
  fullName: 'Usuario Vitra',
  age: '26',
};

export const ACCOUNT_EXISTS_MESSAGE =
  'Esta cuenta ya está creada. Usa Iniciar Sesión para acceder.';

/**
 * Identifica respuestas de registro que significan que el correo ya está
 * registrado. El backend puede cambiar ligeramente el texto o devolverlo en
 * inglés, por eso la validación no depende de una coincidencia exacta.
 */
export function isAccountAlreadyRegisteredError(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : '';
  const normalized = message.toLowerCase();

  return (
    normalized.includes('ya existe una cuenta') ||
    normalized.includes('cuenta ya está creada') ||
    normalized.includes('correo electrónico ya está registrado') ||
    normalized.includes('email already registered') ||
    normalized.includes('account already exists') ||
    normalized.includes('this account already exists') ||
    normalized.includes('an account with this email already exists')
  );
}

export type RegisterStage = 'idle' | 'account' | 'profile' | 'finishing';

export function useAuthFlow() {
  const { login } = useAuth();
  const { completeOnboarding, updateAvatarUrl } = useUser();
  const { startJob } = useJobs();
  const { t } = useTranslation();

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Fase del registro para la pantalla de progreso (RegisterProgress). 'idle' = no se está registrando.
  const [registerStage, setRegisterStage] = useState<RegisterStage>('idle');

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  /**
   * Enviar formulario de Login
   */
  const handleLoginSubmit = async (email: string, pass: string): Promise<boolean> => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(t('auth.err.emailRequired'));
      return false;
    }
    if (!pass) {
      setErrorMessage(t('auth.err.passwordRequired'));
      return false;
    }

    setLoading(true);

    try {
      const result = await loginUser(cleanEmail, pass);
      await login(result.access_token, cleanEmail);
      return true;
    } catch (err: any) {
      // Contraseña/usuario incorrectos es un caso esperado: se muestra en la tarjeta de error del formulario.
      // console.error abriría el overlay rojo de LogBox, así que solo se registra de forma informativa.
      console.log('[useAuthFlow] Inicio de sesión rechazado:', err?.message);
      setErrorMessage(authErrorMessage(err, t, 'auth.err.loginFailed'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Finalizar Registro Unificado (Crea cuenta + Biometría + Login sin pantallas intermedias)
   */
  const handleFinishRegister = async (
    formData: RegisterFormData,
    biometrics: BiometricPhotos,
    skipPhotos: boolean = false
  ): Promise<boolean> => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const cleanEmail = formData.email.trim();
    const cleanName = formData.fullName.trim();
    const parsedAge = parseInt(formData.age.trim(), 10) || 24;
    setRegisterStage('account');

    try {
      // 1. Registrar usuario en backend.
      try {
        await registerUser(cleanEmail, formData.password, cleanName);
        setSuccessMessage(
          skipPhotos
            ? t('auth.created.skip')
            : t('auth.created.photos')
        );
      } catch (regErr: any) {
        if (isAccountAlreadyRegisteredError(regErr)) {
          // Es un estado esperado de validación, no un error técnico. No
          // continuamos con setupUserProfile ni con un login automático.
          setErrorMessage(t('auth.accountExists'));
          return false;
        }
        throw regErr;
      }

      // 2. Iniciar sesión para obtener token JWT
      let token: string;
      try {
        const loginResult = await loginUser(cleanEmail, formData.password);
        token = loginResult.access_token;
      } catch (loginErr: any) {
        throw loginErr;
      }

      // 3. Perfil + colorimetría con la foto de ROSTRO (rápido). El avatar 3D (1-2 min) ya NO bloquea el registro:
      //    se genera en segundo plano y el usuario puede jugar o explorar la app mientras tanto.
      setRegisterStage('profile');
      const shouldIncludePhotos = !skipPhotos;
      const sendFace = shouldIncludePhotos ? (biometrics.faceImageBase64 || undefined) : undefined;
      const sendBody = shouldIncludePhotos ? (biometrics.bodyImageBase64 || undefined) : undefined;

      let setupRes: any = null;
      try {
        console.log('[useAuthFlow] Configurando perfil en backend...', {
          email: cleanEmail,
          skipPhotos,
          hasFace: Boolean(sendFace),
          hasBody: Boolean(sendBody),
        });
        setupRes = await setupUserProfile(
          {
            full_name: cleanName,
            age: parsedAge,
            gender: formData.gender,
            face_image: sendFace,
          },
          token
        );
      } catch (setupErr: any) {
        console.warn('[useAuthFlow] Advertencia en setup de perfil en backend:', setupErr);
        if (
          setupErr?.status === 400 ||
          (setupErr?.message &&
            (setupErr.message.toLowerCase().includes('persona') ||
              setupErr.message.toLowerCase().includes('rostro') ||
              setupErr.message.toLowerCase().includes('imagen')))
        ) {
          Alert.alert(t('auth.invalidImage.title'), authErrorMessage(setupErr, t, 'auth.invalidImage.default'));
          setLoading(false);
          return false;
        }
        // Otros fallos (p. ej. red): se continúa con la silueta preset; el perfil se puede completar luego.
      }

      // 4. Guardar datos en el estado global con la silueta preset (el avatar personalizado llegará después)
      setRegisterStage('finishing');
      completeOnboarding({
        fullName: cleanName,
        age: parsedAge,
        gender: formData.gender,
        facePhotoUri: shouldIncludePhotos ? (biometrics.faceImageUri || undefined) : undefined,
        bodyPhotoUri: shouldIncludePhotos ? (biometrics.bodyImageUri || undefined) : undefined,
        photoUri: shouldIncludePhotos ? (biometrics.bodyImageUri || undefined) : undefined,
        avatarUrl: setupRes?.avatar_url || undefined,
        avatarType: 'preset',
        colorProfile: setupRes?.color_profile || undefined,
      });

      // 5. Antes de gastar créditos 3D, comprobar que la foto de cuerpo es de una persona (igual que hacía el servidor)
      let startAvatarJob = Boolean(sendBody);
      if (sendBody) {
        try {
          const check = await analyzeColorimetry(sendBody);
          const valid = check?.data?.is_valid_image;
          if (valid === false || String(valid).toLowerCase() === 'false') {
            Alert.alert(t('auth.invalidBody.title'), t('auth.invalidBody.default'));
            startAvatarJob = false;
          }
        } catch {
          // Si la comprobación falla por red, se intenta igualmente la generación.
        }
      }

      // 6. Establecer sesión activa (entra a la app sin esperar al avatar)
      await login(token, cleanEmail);

      // 7. Avatar 3D en segundo plano, con tarjeta de bienvenida que explica que se puede jugar mientras se espera
      if (startAvatarJob && sendBody) {
        startJob({
          kind: 'avatar',
          title: t('auth.avatarJob.running'),
          thumbnailUri: biometrics.bodyImageUri || undefined,
          announce: {
            title: t('auth.avatarJob.title'),
            message: t('auth.avatarJob.message'),
          },
          run: async ({ signal, report }) => {
            report({ progress: 0.1, phase: 'connecting', detail: t('bp.sendingPhoto') });
            return generateAvatar(sendBody, {
              signal,
              token,
              onProgress: (info) => report({ progress: 0.1 + Math.min(info.progress, 1) * 0.88, phase: info.step, detail: info.detail }),
            });
          },
          onSuccess: (res) => {
            updateAvatarUrl(res.avatar_url);
          },
        });
      }
      return true;
    } catch (err: any) {
      logHandledError('[useAuthFlow] Error en registro unificado:', err);
      setErrorMessage(authErrorMessage(err, t, 'auth.err.registerFailed'));
      return false;
    } finally {
      setLoading(false);
      setRegisterStage('idle');
    }
  };

  /**
   * Restablecer contraseña rápido para desarrollo y uso diario
   */
  const handleForgotPassword = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      Alert.alert(t('auth.forgot.title'), t('auth.forgot.needEmail'));
      return;
    }

    Alert.alert(
      t('auth.forgot.confirmTitle'),
      t('auth.forgot.confirmMessage', { email: cleanEmail }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.forgot.confirmAction'),
          onPress: async () => {
            try {
              setLoading(true);
              setErrorMessage(null);
              await resetPassword(cleanEmail, '123456');
              const result = await loginUser(cleanEmail, '123456');
              await login(result.access_token, cleanEmail);
            } catch (err: any) {
              setErrorMessage(authErrorMessage(err, t, 'auth.err.resetFailed'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return {
    loading,
    registerStage,
    errorMessage,
    successMessage,
    setErrorMessage,
    setSuccessMessage,
    clearMessages,
    handleLoginSubmit,
    handleFinishRegister,
    handleForgotPassword,
    demoCredentials: DEMO_CREDENTIALS,
  };
}
