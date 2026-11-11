import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { optimizeImageAsync } from '../utils/imageUtils';
import { BiometricsCaptureHook } from '../types/auth.types';
import { useTranslation } from '../../../contexts/LanguageContext';

export const SAMPLE_FACE_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';
export const SAMPLE_BODY_URL =
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';

export function useBiometricsCapture(): BiometricsCaptureHook {
  const { t } = useTranslation();
  const [faceImageUri, setFaceImageUri] = useState<string | null>(null);
  const [faceImageBase64, setFaceImageBase64] = useState<string | null>(null);
  const [bodyImageUri, setBodyImageUri] = useState<string | null>(null);
  const [bodyImageBase64, setBodyImageBase64] = useState<string | null>(null);

  const [showBodyCamera, setShowBodyCamera] = useState<boolean>(false);
  const [showBodyCropper, setShowBodyCropper] = useState<boolean>(false);
  const [galleryTempUri, setGalleryTempUri] = useState<string | null>(null);
  const [showFaceCropper, setShowFaceCropper] = useState<boolean>(false);
  const [faceTempUri, setFaceTempUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setFaceImages = (uri: string | null, base64: string | null) => {
    setFaceImageUri(uri);
    setFaceImageBase64(base64);
  };

  const setBodyImages = (uri: string | null, base64: string | null) => {
    setBodyImageUri(uri);
    setBodyImageBase64(base64);
  };

  const handlePickImage = async (target: 'face' | 'body', source: 'camera' | 'gallery') => {
    try {
      setErrorMessage(null);

      // Para fotografía corporal (Avatar 3D): Lanzar el visor con silueta translúcida A-pose o recortador
      if (target === 'body') {
        if (source === 'camera') {
          setShowBodyCamera(true);
          return;
        }
        if (source === 'gallery') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(t('perm.title'), t('perm.gallery'));
            return;
          }
          const galRes = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.9,
          });
          if (!galRes.canceled && galRes.assets && galRes.assets.length > 0) {
            setGalleryTempUri(galRes.assets[0].uri);
            setShowBodyCropper(true);
          }
          return;
        }
      }

      // Permisos para facial
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('perm.title'), t('perm.camera'));
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('perm.title'), t('perm.gallery'));
          return;
        }
      }

      // Rostro: se elige/captura la foto y se encuadra con el MISMO recortador de la app (modo cuadrado/circular),
      // en lugar del editor nativo del sistema.
      const faceOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      };
      const faceResult =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(faceOptions)
          : await ImagePicker.launchImageLibraryAsync(faceOptions);

      if (!faceResult.canceled && faceResult.assets && faceResult.assets.length > 0) {
        setFaceTempUri(faceResult.assets[0].uri);
        setShowFaceCropper(true);
      }
    } catch (err: any) {
      console.error('[useBiometricsCapture] Error al seleccionar imagen:', err);
      setErrorMessage(err?.message || t('auth.err.captureFailed'));
    }
  };

  const handleUseSampleBiometrics = () => {
    setFaceImageUri(SAMPLE_FACE_URL);
    setFaceImageBase64(SAMPLE_FACE_URL);
    setBodyImageUri(SAMPLE_BODY_URL);
    setBodyImageBase64(SAMPLE_BODY_URL);
  };

  const clearBiometrics = () => {
    setFaceImageUri(null);
    setFaceImageBase64(null);
    setBodyImageUri(null);
    setBodyImageBase64(null);
    setShowBodyCamera(false);
    setShowBodyCropper(false);
    setGalleryTempUri(null);
    setShowFaceCropper(false);
    setFaceTempUri(null);
    setErrorMessage(null);
  };

  return {
    faceImageUri,
    faceImageBase64,
    bodyImageUri,
    bodyImageBase64,
    showBodyCamera,
    showBodyCropper,
    galleryTempUri,
    showFaceCropper,
    faceTempUri,
    errorMessage,
    setShowFaceCropper,
    setFaceTempUri,
    setShowBodyCamera,
    setShowBodyCropper,
    setGalleryTempUri,
    setFaceImages,
    setBodyImages,
    handlePickImage,
    handleUseSampleBiometrics,
    clearBiometrics,
  };
}
