export type ScreenName =
  | 'WELCOME'
  | 'BODY_PROFILE'
  | 'HOME'
  | 'WARDROBE'
  | 'ADD_GARMENT'
  | 'GARMENT_PROCESSING'
  | 'GARMENT_DETAILS'
  | 'GARMENT_VIEW'
  | 'FITTING_ROOM'
  | 'FIT_RESULT'
  | 'COLOR_STUDIO'
  | 'COLOR_RECOMMENDATIONS'
  | 'OUTFIT_BUILDER'
  | 'SAVED_LOOK'
  | 'PROFILE'
  | 'GARMENT_3D_PREVIEW';

export type TabName = 'HOME' | 'WARDROBE' | 'COLOR_STUDIO' | 'PROFILE';

export interface Garment {
  id: string;
  name: string;
  category: 'Tops' | 'Outerwear' | 'Pants' | 'Shoes' | 'Accessories';
  colorName: string;
  colorHex: string;
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'U';
  fit: 'Slim' | 'Regular' | 'Relaxed' | 'Oversized';
  brand: string;
  material: string;
  addedDate: string;
  notes?: string;
  imageUrl?: string;
  model3dUrl?: string;
  image2dUrl?: string;
  isFavorite?: boolean;
  details?: string;
  style?: string;
  occasion?: string;
  rawAnalysis?: any;
  silhouetteType: 'tshirt' | 'jacket' | 'trousers' | 'shoes' | 'coat' | 'accessory';
  paletteHarmony: boolean;
}

export interface BodyProfile {
  height: number;
  heightUnit: 'cm' | 'in';
  chest: number;
  waist: number;
  hips: number;
  shoulderWidth: number;
  armLength: number;
  inseam: number;
  unit: 'cm' | 'in';
}

export interface ColorProfile {
  skin_tone: string;
  hair_color: string;
  eye_color?: string;
  season: string;
  palette_name?: string;
  description: string;
  recommended_colors: string[];
  colors_to_avoid?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  age?: number;
  email?: string;
  gender?: 'female' | 'male' | 'non-binary' | string;
  facePhotoUri?: string;
  bodyPhotoUri?: string;
  avatar_url?: string;
  avatar_type?: 'preset' | 'custom_3d' | 'none';
  avatar_created_at?: string;
  color_profile?: ColorProfile;
  body_profile?: BodyProfile;
  completedOnboarding: boolean;
}

export interface RegistrationWizardData {
  // Paso 1: Credenciales
  email: string;
  password: string;
  // Paso 2: Datos Personales
  fullName: string;
  age: string;
  gender?: string;
  // Paso 3: Biometría
  faceImageUri?: string | null;
  faceImageBase64?: string | null;
  bodyImageUri?: string | null;
  bodyImageBase64?: string | null;
}

export interface FitSettings {
  size: 'S' | 'M' | 'L' | 'XL';
  tightness: number; // -50 to 50
  chest: number;
  waist: number;
  hips: number;
  shoulders: number;
}

export interface OutfitLayer {
  top?: Garment;
  outerwear?: Garment;
  bottom?: Garment;
  shoes?: Garment;
  accessory?: Garment;
}

export interface SavedLookItem {
  id: string;
  title: string;
  date: string;
  garments: Garment[];
  fitScore: string;
  paletteTheme: string;
  model3dUrl?: string;
  image2dUrl?: string;
}
