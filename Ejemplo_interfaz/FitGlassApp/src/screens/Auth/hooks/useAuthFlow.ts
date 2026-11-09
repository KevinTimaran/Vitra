import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useUser } from '../../../contexts/UserContext';
import {
  loginUser,
  registerUser,
  setupUserProfile,
  resetPassword,
  getLatestAvatarModel,
} from '../services/authActions';
import { RegisterFormData, BiometricPhotos } from '../types/auth.types';

export const DEMO_CREDENTIALS = {
  email: 'demo@vitra.ai',
  password: 'password123',
  fullName: 'Usuario Vitra',
  age: '26',
};

export function useAuthFlow() {
  const { login } = useAuth();
  const { completeOnboarding } = useUser();

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return false;
    }
    if (!pass) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return false;
    }

    setLoading(true);

    try {
      const result = await loginUser(cleanEmail, pass);
      await login(result.access_token, cleanEmail);
      return true;
    } catch (err: any) {
      console.error('[useAuthFlow] Error de inicio de sesión:', err);
      setErrorMessage(err?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
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

    try {
      // 1. Registrar usuario en backend (si ya existe, intentamos autenticarlo directamente con sus credenciales)
      let isExistingAccount = false;
      try {
        await registerUser(cleanEmail, formData.password, cleanName);
        setSuccessMessage(
          skipPhotos
            ? '¡Cuenta creada! Asignando silueta atelier optimizada...'
            : '¡Cuenta creada exitosamente! Configurando gemelo digital...'
        );
      } catch (regErr: any) {
        if (regErr?.message?.includes('Ya existe una cuenta')) {
          console.log('[useAuthFlow] Cuenta existente detectada en backend para:', cleanEmail);
          isExistingAccount = true;
        } else {
          throw regErr;
        }
      }

      // 2. Iniciar sesión para obtener token JWT
      let token: string;
      try {
        const loginResult = await loginUser(cleanEmail, formData.password);
        token = loginResult.access_token;
        if (isExistingAccount) {
          setSuccessMessage('¡Bienvenida de vuelta! Sincronizando tu gemelo digital...');
        }
      } catch (loginErr: any) {
        if (isExistingAccount) {
          throw new Error(
            'Ya existe una cuenta registrada con este correo electrónico. Por favor verifica tu contraseña o pulsa abajo para Iniciar Sesión.'
          );
        }
        throw loginErr;
      }

      // 3. Enviar datos de perfil y biometría al backend
      const shouldIncludePhotos = !skipPhotos;
      const sendFace = shouldIncludePhotos ? (biometrics.faceImageBase64 || undefined) : undefined;
      const sendBody = shouldIncludePhotos ? (biometrics.bodyImageBase64 || undefined) : undefined;

      let setupRes: any = null;
      try {
        console.log('[useAuthFlow] Registrando y configurando perfil en backend...', {
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
            body_image: sendBody,
          },
          token
        );
        console.log('[useAuthFlow] Respuesta de setupUserProfile recibida:', setupRes);
      } catch (setupErr: any) {
        console.warn('[useAuthFlow] Advertencia en setup de perfil en backend:', setupErr);
        if (
          setupErr?.status === 400 ||
          (setupErr?.message &&
            (setupErr.message.toLowerCase().includes('persona') ||
              setupErr.message.toLowerCase().includes('rostro') ||
              setupErr.message.toLowerCase().includes('imagen')))
        ) {
          Alert.alert(
            'Imagen no válida',
            setupErr.message || 'Esta imagen no parece ser de una persona. Por favor sube una foto tuya.'
          );
          setLoading(false);
          return false;
        }

        // Recuperación inteligente: si el backend alcanzó a generar el avatar 3D pero la conexión móvil parpadeó
        if (sendBody) {
          try {
            const latest = await getLatestAvatarModel();
            if (latest?.avatar_url) {
              console.log('[useAuthFlow] Avatar 3D recuperado exitosamente tras advertencia de red:', latest.avatar_url);
              setupRes = {
                avatar_url: latest.avatar_url,
                avatar_type: 'custom_3d',
              };
            }
          } catch (recErr) {
            console.warn('[useAuthFlow] No se pudo recuperar avatar más reciente:', recErr);
          }
        }
      }

      // 4. Guardar datos en el estado global (Context) con avatarUrl obtenido del backend
      completeOnboarding({
        fullName: cleanName,
        age: parsedAge,
        gender: formData.gender,
        facePhotoUri: shouldIncludePhotos ? (biometrics.faceImageUri || undefined) : undefined,
        bodyPhotoUri: shouldIncludePhotos ? (biometrics.bodyImageUri || undefined) : undefined,
        photoUri: shouldIncludePhotos ? (biometrics.bodyImageUri || undefined) : undefined,
        avatarUrl: setupRes?.avatar_url || undefined,
        avatarType: setupRes?.avatar_type || (sendBody ? 'custom_3d' : 'preset'),
        colorProfile: setupRes?.color_profile || undefined,
      });

      // 5. Establecer sesión activa (navega inmediatamente a Home sin intermediarios)
      await login(token, cleanEmail);
      return true;
    } catch (err: any) {
      console.error('[useAuthFlow] Error en registro unificado:', err);
      setErrorMessage(err?.message || 'Error al completar el registro.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restablecer contraseña rápido para desarrollo y uso diario
   */
  const handleForgotPassword = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      Alert.alert('Recuperar Contraseña', 'Por favor escribe tu correo electrónico en el campo superior primero.');
      return;
    }

    Alert.alert(
      'Restablecer Contraseña',
      `¿Deseas restablecer la contraseña para "${cleanEmail}" a "123456" para ingresar de inmediato?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer e Ingresar',
          onPress: async () => {
            try {
              setLoading(true);
              setErrorMessage(null);
              await resetPassword(cleanEmail, '123456');
              const result = await loginUser(cleanEmail, '123456');
              await login(result.access_token, cleanEmail);
            } catch (err: any) {
              setErrorMessage(err?.message || 'No se pudo restablecer la contraseña.');
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
