export interface GarmentMetadata {
  tipo_prenda?: string;
  color_dominante?: string;
  colores_secundarios?: string[];
  estilo_recomendado?: string;
  corte?: string;
  ocasion_recomendada?: string;
  detalles?: string;
}

export interface GarmentAnalysisResponse {
  success: boolean;
  data?: GarmentMetadata | any;
  error?: string | null;
}

export interface TryOnResponse {
  image_2d_url: string;
  model_3d_url: string;
  status: string;
}

export interface ColorimetryData {
  skin_tone: string;
  hair_color: string;
  eye_color?: string;
  season: string;
  palette_name?: string;
  description: string;
  recommended_colors: string[];
  colors_to_avoid?: string[];
}

export interface ColorimetryResponse {
  success: boolean;
  data?: ColorimetryData;
  error?: string | null;
}

export interface AvatarGenerateResponse {
  avatar_url: string;
  status: string;
}

// Tipo previo para compatibilidad
export interface GarmentAnalysis {
  category: 'Tops' | 'Outerwear' | 'Pants' | string;
  sleeve?: string;
  neck?: string;
  fit?: string;
  dominantColor?: string;
  secondaryColors?: string[];
  pattern?: string;
  hasPocket?: boolean;
  hasButtons?: boolean;
  hasZipper?: boolean;
  confidence: number;
}

