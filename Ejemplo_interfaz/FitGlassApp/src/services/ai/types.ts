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
