import { Garment } from '../types';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Convierte un código de color HEX (#RGB o #RRGGBB) a valores RGB.
 */
export const hexToRgb = (hex: string): RgbColor | null => {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.trim().replace(/^#/, '');

  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (clean.length !== 6) return null;

  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

/**
 * Calcula la distancia perceptual ponderada entre dos colores en espacio RGB.
 * Utiliza los coeficientes estándar de la percepción visual humana:
 * ΔC = sqrt(2*ΔR² + 4*ΔG² + 3*ΔB²)
 * Rango máximo teórico (negro a blanco) = ~765.
 */
export const calculateColorDistance = (hex1: string, hex2: string): number => {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return 999;

  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;

  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
};

/**
 * Determina si una prenda tiene armonía con la colorimetría estacional del usuario.
 * @param garmentHex Código HEX de la prenda.
 * @param recommendedHexes Lista de colores recomendados de la paleta activa.
 * @param threshold Umbral de distancia perceptual (defecto 72, ~9.4% de tolerancia).
 */
export const isColorHarmonious = (
  garmentHex?: string | null,
  recommendedHexes?: string[] | null,
  threshold = 72
): boolean => {
  if (!garmentHex || typeof garmentHex !== 'string') return false;
  if (!recommendedHexes || !Array.isArray(recommendedHexes) || recommendedHexes.length === 0) {
    return true; // Si no hay paleta definida, no penalizamos
  }

  const cleanGarment = garmentHex.trim().toLowerCase();

  return recommendedHexes.some((rec) => {
    if (!rec || typeof rec !== 'string') return false;
    const cleanRec = rec.trim().toLowerCase();
    if (cleanGarment === cleanRec) return true;

    // Comparación perceptual
    const dist = calculateColorDistance(cleanGarment, cleanRec);
    return dist <= threshold;
  });
};

/**
 * Filtra prendas del armario que armonicen con los colores recomendados de la estación.
 */
export const filterHarmoniousGarments = (
  garments: Garment[],
  recommendedHexes?: string[] | null,
  threshold = 72
): Garment[] => {
  if (!Array.isArray(garments)) return [];
  if (!recommendedHexes || recommendedHexes.length === 0) return garments;

  return garments.filter((g) => isColorHarmonious(g.colorHex, recommendedHexes, threshold));
};

export interface SeasonEducationalInfo {
  family: 'winter' | 'summer' | 'autumn' | 'spring';
  familyTitle: string;
  tagline: string;
  undertoneDescription: string;
  stylingTips: string[];
  recommendedMetals: string;
  bestCombinations: string[];
}

/**
 * Provee dictámenes estilísticos y guías de uso educativo según la estación del usuario.
 */
export const getSeasonEducationalInfo = (seasonName?: string | null): SeasonEducationalInfo => {
  const s = (seasonName || '').toLowerCase();

  if (s.includes('verano') || s.includes('summer')) {
    return {
      family: 'summer',
      familyTitle: 'Estación Verano',
      tagline: 'Elegancia Etérea & Serenidad Fría',
      undertoneDescription:
        'Tu piel posee un subtono frío y delicado con contraste moderado o bajo. Los tonos empolvados, pasteles fríos, lavandas, azul cerúleo y gris perla aportan luminosidad sin sobrecargar tus rasgos naturales.',
      stylingTips: [
        'Favorece las transiciones tonales monocromáticas o análogas en lugar de contrastes cortantes.',
        'Opta por tejidos ligeros con caída fluida: lino lavado, seda suave, gasa y popelín fino.',
        'Evita los tonos cálidos terrosos muy dorados o anaranjados que apagan la frescura de tu tez.',
      ],
      recommendedMetals: 'Plata satinada, Oro blanco, Platino y Perlas naturales.',
      bestCombinations: [
        'Azul Cerúleo + Gris Perla Suave',
        'Lavanda Empolvado + Blanco Óptico Suave',
        'Rosa Cuarzo Frío + Azul Marino Mineral',
      ],
    };
  }

  if (s.includes('otoño') || s.includes('autumn')) {
    return {
      family: 'autumn',
      familyTitle: 'Estación Otoño',
      tagline: 'Calidez Orgánica & Riqueza Terrosa',
      undertoneDescription:
        'Tu armonía biológica destaca por un subtono cálido, dorado o bronceado con profundidad envolvente. Los colores tierra, ámbar, verde oliva militar, mostaza tostado y terracota enmarcan tu rostro con magnetismo.',
      stylingTips: [
        'Combina tonalidades análogas de la misma temperatura para un look orgánico y sofisticado.',
        'Explora texturas ricas y táctiles: gamuza, pana, cuero curtido, cachemira y lana bouclé.',
        'Evita los tonos neón o el negro puro absoluto directamente junto al rostro; prefiere carbón cálido o chocolate oscuro.',
      ],
      recommendedMetals: 'Oro amarillo envejecido, Bronce, Latón y Cobre.',
      bestCombinations: [
        'Verde Oliva + Terracota Tostado',
        'Ámbar Dorado + Café Moca Profundo',
        'Canela Especiada + Crema Marfil Cálido',
      ],
    };
  }

  if (s.includes('primavera') || s.includes('spring')) {
    return {
      family: 'spring',
      familyTitle: 'Estación Primavera',
      tagline: 'Vitalidad Luminosa & Claridad Solar',
      undertoneDescription:
        'Tu complexión irradia un brillo dorado o melocotón con ojos y cabello que reflejan luz solar. Los tonos vivos, cálidos y claros como el coral, turquesa brillante, amarillo mimosa y verde manzana potencian tu vitalidad.',
      stylingTips: [
        'Utiliza acentos de color vibrantes cerca del cuello para iluminar instantáneamente la mirada.',
        'Prendas con acabados luminosos y telas nítidas: algodón peinado, satén ligero y popelín estructurado.',
        'Evita los tonos apagados, mohosos o grisáceos que restan viveza a tu energía cromática natural.',
      ],
      recommendedMetals: 'Oro amarillo brillante, Oro rosa cálido y Cobre pulido.',
      bestCombinations: [
        'Coral Vivo + Marfil Cálido',
        'Turquesa Cristalino + Blanco Lino',
        'Verde Manzana Suave + Miel Dorada',
      ],
    };
  }

  // Por defecto / Invierno (Winter)
  return {
    family: 'winter',
    familyTitle: 'Estación Invierno',
    tagline: 'Contraste Escultural & Nitidez Glacial',
    undertoneDescription:
      'Posees un contraste elevado entre el subtono frío de la piel y la intensidad del cabello o los ojos. Los colores puros, saturados y de base azulada (carbón mineral, zafiro, rubí y blanco polar) esculpen tus facciones con máxima presencia.',
    stylingTips: [
      'Domina el contraste de alto impacto: combina tonos oscuros profundos con luces nítidas o acentos joya.',
      'Elige siluetas limpias, arquitectónicas y tejidos de alta densidad: sarga de lana, algodón peinado de alto gramaje y cuero negro.',
      'Evita los tonos tierra cálidos apagados (como mostaza o beige cálido) que restan definición a tu contraste.',
    ],
    recommendedMetals: 'Plata esterlina, Platino, Oro blanco pulido y Titanio.',
    bestCombinations: [
      'Negro Obsidiana + Zafiro Profundo',
      'Blanco Óptico Polar + Carbón Mineral',
      'Verde Esmeralda Joya + Carbón Grafito',
    ],
  };
};
