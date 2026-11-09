export type AuthViewState = 'welcome' | 'login' | 'register';

export type RegisterStep = 1 | 2 | 3;

export type GenderType = 'female' | 'male' | 'non-binary';

export interface RegisterFormData {
  email: string;
  password: string;
  fullName: string;
  age: string;
  gender: GenderType;
}

export interface BiometricPhotos {
  faceImageUri: string | null;
  faceImageBase64: string | null;
  bodyImageUri: string | null;
  bodyImageBase64: string | null;
}

export interface CapturedImageResult {
  uri: string;
  base64Formatted: string;
}

export interface BiometricsCaptureHook {
  faceImageUri: string | null;
  faceImageBase64: string | null;
  bodyImageUri: string | null;
  bodyImageBase64: string | null;
  showBodyCamera: boolean;
  showBodyCropper: boolean;
  galleryTempUri: string | null;
  errorMessage: string | null;
  setShowBodyCamera: (show: boolean) => void;
  setShowBodyCropper: (show: boolean) => void;
  setGalleryTempUri: (uri: string | null) => void;
  setFaceImages: (uri: string | null, base64: string | null) => void;
  setBodyImages: (uri: string | null, base64: string | null) => void;
  handlePickImage: (target: 'face' | 'body', source: 'camera' | 'gallery') => Promise<void>;
  handleUseSampleBiometrics: () => void;
  clearBiometrics: () => void;
}
