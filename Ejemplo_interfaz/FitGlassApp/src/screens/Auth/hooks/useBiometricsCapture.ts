import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { optimizeImageAsync } from '../utils/imageUtils';
import { BiometricsCaptureHook } from '../types/auth.types';

export const SAMPLE_FACE_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80';
export const SAMPLE_BODY_URL =
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';

export function useBiometricsCapture(): BiometricsCaptureHook {
  const [faceImageUri, setFaceImageUri] = useState<string | null>(null);
  const [faceImageBase64, setFaceImageBase64] = useState<string | null>(null);
  const [bodyImageUri, setBodyImageUri] = useState<string | null>(null);
  const [bodyImageBase64, setBodyImageBase64] = useState<string | null>(null);

  const [showBodyCamera, setShowBodyCamera] = useState<boolean>(false);
  const [showBodyCropper, setShowBodyCropper] = useState<boolean>(false);
  const [galleryTempUri, setGalleryTempUri] = useState<string | null>(null);
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
            Alert.alert('Permiso Requerido', 'Se requiere acceso a la galería para seleccionar la fotografía.');
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
          Alert.alert(
            'Permiso Requerido',
            'Se requiere acceso a la cámara para capturar la fotografía.'
          );
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permiso Requerido',
            'Se requiere acceso a la galería para seleccionar la fotografía.'
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: target === 'face' ? [1, 1] : [3, 4],
        quality: 0.8,
        base64: true,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Comprimir y redimensionar la fotografía para mantener el payload bajo (<250KB)
        const { uri: optimizedUri, base64Formatted } = await optimizeImageAsync(asset.uri, {
          maxWidth: 1024,
          compress: 0.75,
        });

        if (target === 'face') {
          setFaceImageUri(optimizedUri);
          setFaceImageBase64(base64Formatted);
        } else {
          setBodyImageUri(optimizedUri);
          setBodyImageBase64(base64Formatted);
        }
      }
    } catch (err: any) {
      console.error('[useBiometricsCapture] Error al seleccionar imagen:', err);
      setErrorMessage(err?.message || 'Error al capturar la imagen.');
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
    errorMessage,
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
