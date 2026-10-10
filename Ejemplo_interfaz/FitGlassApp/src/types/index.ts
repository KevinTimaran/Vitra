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
  size: 'XS' | 'S' | 'M' | 'L' | 'XL';
  fit: 'Slim' | 'Regular' | 'Relaxed' | 'Oversized';
  brand: string;
  material: string;
  addedDate: string;
  notes?: string;
  imageUrl?: string;
  silhouetteType: 'tshirt' | 'jacket' | 'trousers' | 'shoes' | 'coat';
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
}

export interface SavedLookItem {
  id: string;
  title: string;
  date: string;
  garments: Garment[];
  fitScore: string;
  paletteTheme: string;
}
