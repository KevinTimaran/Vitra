// Nombres de color en español a partir de un código HEX (sin dependencias). Lógica pura, probada con node.
// Se busca el color nombrado MÁS CERCANO en el espacio CIE Lab (distancia perceptual), usando una lista
// pensada para moda y, para piel/cabello/ojos, listas propias (así "#EDC4B3" es "Beige claro" y no "Salmón").

export type ColorKind = 'general' | 'skin' | 'hair' | 'eye';

type Named = readonly [name: string, hex: string];

const GENERAL: Named[] = [
  // Neutros
  ['Blanco', '#FFFFFF'], ['Blanco roto', '#F5F3EE'], ['Marfil', '#F4EBD8'], ['Crema', '#EFE3C2'],
  ['Beige', '#D8C3A5'], ['Arena', '#C9B38A'], ['Camel', '#C19A6B'], ['Taupe', '#8B7B6B'],
  ['Gris perla', '#E3E3E3'], ['Gris claro', '#BDBDBD'], ['Gris', '#8A8A8A'], ['Gris antracita', '#4A4A4A'],
  ['Carbón', '#2B2B2B'], ['Negro', '#0A0A0A'],
  // Marrones y tierras
  ['Chocolate', '#4B2E1E'], ['Café', '#6F4E37'], ['Marrón', '#8B5A2B'], ['Castaño', '#5C3A21'],
  ['Canela', '#B5651D'], ['Caramelo', '#C68E4F'], ['Cobre', '#B87333'], ['Terracota', '#C8553D'], ['Óxido', '#A44A1F'],
  // Rojos
  ['Rojo', '#D32F2F'], ['Rojo intenso', '#B71C1C'], ['Carmesí', '#DC143C'], ['Granate', '#7B1E2B'],
  ['Burdeos', '#5B1A2A'], ['Vino', '#722F37'], ['Coral', '#FF6F61'], ['Salmón', '#FA8072'], ['Rosa palo', '#E8B4B8'],
  // Rosas y morados
  ['Rosa', '#F48FB1'], ['Rosa chicle', '#FF8FB8'], ['Fucsia', '#C2185B'], ['Magenta', '#D81B8C'],
  ['Lila', '#C8A2C8'], ['Lavanda', '#B39DDB'], ['Malva', '#A88AA8'], ['Violeta', '#7B1FA2'],
  ['Morado', '#5E35B1'], ['Ciruela', '#5D3A5A'], ['Berenjena', '#3B1F3F'],
  // Naranjas y amarillos
  ['Naranja', '#F57C00'], ['Naranja quemado', '#CC5500'], ['Mandarina', '#FF9A3C'], ['Melocotón', '#FFCBA4'],
  ['Mostaza', '#D4A017'], ['Amarillo', '#FDD835'], ['Amarillo pastel', '#FFF3B0'], ['Dorado', '#D4AF37'], ['Ocre', '#CC7722'],
  // Verdes
  ['Verde', '#388E3C'], ['Verde oliva', '#6B7B3A'], ['Verde bosque', '#1B5E20'], ['Verde esmeralda', '#00A878'],
  ['Verde menta', '#98E3C6'], ['Verde salvia', '#9CAF88'], ['Verde lima', '#AEEA00'], ['Verde botella', '#0B3D2E'],
  ['Verde pino', '#2D4238'], ['Verde azulado', '#00796B'], ['Turquesa', '#2BB5B0'],
  // Azules
  ['Azul', '#1976D2'], ['Azul marino', '#0D1B3E'], ['Azul medianoche', '#191970'], ['Azul rey', '#2447C8'],
  ['Azul cielo', '#87CEEB'], ['Azul bebé', '#BBDEFB'], ['Celeste', '#A7D3F0'], ['Azul petróleo', '#1F5F6B'],
  ['Azul acero', '#5B7C99'], ['Azul denim', '#3B5B8C'], ['Cian', '#00BCD4'], ['Índigo', '#3F3D8F'], ['Azul grisáceo', '#6E8CA0'],
];

const SKIN: Named[] = [
  ['Porcelana', '#F6E4D8'], ['Marfil claro', '#F0D5BE'], ['Beige claro', '#EDC4B3'], ['Beige', '#DFAC89'],
  ['Beige dorado', '#D9A877'], ['Trigueño claro', '#C68642'], ['Trigueño', '#B07A4A'], ['Canela', '#A0673B'],
  ['Moreno', '#8B5A3C'], ['Moreno oscuro', '#6F4733'], ['Chocolate', '#52352A'], ['Ébano', '#3A1F13'],
];

const HAIR: Named[] = [
  ['Rubio platino', '#E8DCC0'], ['Rubio claro', '#D8C48A'], ['Rubio', '#C9A15A'], ['Rubio oscuro', '#A67C3D'],
  ['Castaño claro', '#8B6A45'], ['Castaño', '#6B4A32'], ['Castaño oscuro', '#4B3425'], ['Marrón oscuro', '#33241C'],
  ['Negro', '#1A1412'], ['Pelirrojo', '#A5432B'], ['Cobrizo', '#B4602F'], ['Canoso', '#BDBDBD'], ['Gris plata', '#9A9A9A'],
];

const EYE: Named[] = [
  ['Marrón oscuro', '#3B261C'], ['Marrón', '#6B4423'], ['Miel', '#B07A2E'], ['Avellana', '#8E6B3A'],
  ['Verde', '#4E7A4A'], ['Verde oliva', '#6B7B3A'], ['Gris verdoso', '#7A8F86'], ['Gris', '#8A98A3'],
  ['Gris azulado', '#6E8CA0'], ['Azul', '#3A6EA5'], ['Azul claro', '#8EB6D8'], ['Negro', '#16110E'],
];

/** Nombres en inglés (la lista de arriba es la fuente; aquí solo su traducción). */
const NAMES_EN: Record<string, string> = {
  "Amarillo": "Yellow",
  "Amarillo pastel": "Pastel yellow",
  "Arena": "Sand",
  "Avellana": "Hazel",
  "Azul": "Blue",
  "Azul acero": "Steel blue",
  "Azul bebé": "Baby blue",
  "Azul cielo": "Sky blue",
  "Azul claro": "Light blue",
  "Azul denim": "Denim blue",
  "Azul grisáceo": "Grayish blue",
  "Azul marino": "Navy blue",
  "Azul medianoche": "Midnight blue",
  "Azul petróleo": "Petrol blue",
  "Azul rey": "Royal blue",
  "Beige": "Beige",
  "Beige claro": "Light beige",
  "Beige dorado": "Golden beige",
  "Berenjena": "Eggplant",
  "Blanco": "White",
  "Blanco roto": "Off-white",
  "Burdeos": "Bordeaux",
  "Café": "Coffee",
  "Camel": "Camel",
  "Canela": "Cinnamon",
  "Canoso": "Gray-haired",
  "Caramelo": "Caramel",
  "Carbón": "Charcoal",
  "Carmesí": "Crimson",
  "Castaño": "Chestnut",
  "Castaño claro": "Light brown",
  "Castaño oscuro": "Dark brown",
  "Celeste": "Light sky blue",
  "Chocolate": "Chocolate",
  "Cian": "Cyan",
  "Ciruela": "Plum",
  "Cobre": "Copper",
  "Cobrizo": "Auburn",
  "Coral": "Coral",
  "Crema": "Cream",
  "Dorado": "Gold",
  "Fucsia": "Fuchsia",
  "Granate": "Maroon",
  "Gris": "Gray",
  "Gris antracita": "Anthracite gray",
  "Gris azulado": "Bluish gray",
  "Gris claro": "Light gray",
  "Gris perla": "Pearl gray",
  "Gris plata": "Silver gray",
  "Gris verdoso": "Greenish gray",
  "Lavanda": "Lavender",
  "Lila": "Lilac",
  "Magenta": "Magenta",
  "Malva": "Mauve",
  "Mandarina": "Tangerine",
  "Marfil": "Ivory",
  "Marfil claro": "Light ivory",
  "Marrón": "Brown",
  "Marrón oscuro": "Dark brown",
  "Melocotón": "Peach",
  "Miel": "Honey",
  "Morado": "Purple",
  "Moreno": "Tan",
  "Moreno oscuro": "Deep tan",
  "Mostaza": "Mustard",
  "Naranja": "Orange",
  "Naranja quemado": "Burnt orange",
  "Negro": "Black",
  "Ocre": "Ochre",
  "Pelirrojo": "Red",
  "Porcelana": "Porcelain",
  "Rojo": "Red",
  "Rojo intenso": "Deep red",
  "Rosa": "Pink",
  "Rosa chicle": "Bubblegum pink",
  "Rosa palo": "Dusty pink",
  "Rubio": "Blonde",
  "Rubio claro": "Light blonde",
  "Rubio oscuro": "Dark blonde",
  "Rubio platino": "Platinum blonde",
  "Salmón": "Salmon",
  "Taupe": "Taupe",
  "Terracota": "Terracotta",
  "Trigueño": "Olive",
  "Trigueño claro": "Light olive",
  "Turquesa": "Turquoise",
  "Verde": "Green",
  "Verde azulado": "Teal",
  "Verde bosque": "Forest green",
  "Verde botella": "Bottle green",
  "Verde esmeralda": "Emerald green",
  "Verde lima": "Lime green",
  "Verde menta": "Mint green",
  "Verde oliva": "Olive green",
  "Verde pino": "Pine green",
  "Verde salvia": "Sage green",
  "Vino": "Wine",
  "Violeta": "Violet",
  "Ébano": "Ebony",
  "Índigo": "Indigo",
  "Óxido": "Rust",
};

export type ColorLanguage = 'es' | 'en';

/** Traduce un nombre de la lista al idioma pedido (si no hay traducción, lo deja igual). */
export const localizeColorName = (name: string, language: ColorLanguage = 'es'): string =>
  language === 'en' ? NAMES_EN[name] ?? name : name;

const LISTS: Record<ColorKind, Named[]> = { general: GENERAL, skin: SKIN, hair: HAIR, eye: EYE };

/** Acepta #RGB, #RRGGBB (con o sin #) y también texto que contenga un código ("#EDC4B3 (Beige claro)"). */
export const parseHex = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = value.match(/#?([0-9a-fA-F]{6})\b|#([0-9a-fA-F]{3})\b/);
  if (!match) return null;
  if (match[1]) return '#' + match[1].toUpperCase();
  const [r, g, b] = match[2].split('');
  return ('#' + r + r + g + g + b + b).toUpperCase();
};

const toRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const srgbToLinear = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const toLab = (hex: string): [number, number, number] => {
  const [r, g, b] = toRgb(hex).map(srgbToLinear) as [number, number, number];
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const labCache = new Map<string, [number, number, number]>();
const labOf = (hex: string) => {
  let lab = labCache.get(hex);
  if (!lab) {
    lab = toLab(hex);
    labCache.set(hex, lab);
  }
  return lab;
};

/** Nombre en español del color más parecido. Si el valor no es un color válido devuelve "Color". */
export const colorNameFor = (value: unknown, kind: ColorKind = 'general', language: ColorLanguage = 'es'): string => {
  const hex = parseHex(value);
  if (!hex) return 'Color';
  const [l, a, b] = labOf(hex);
  let best: Named = LISTS[kind][0];
  let bestDistance = Infinity;
  for (const entry of LISTS[kind]) {
    const [l2, a2, b2] = labOf(entry[1]);
    const distance = (l - l2) ** 2 + (a - a2) ** 2 + (b - b2) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }
  return localizeColorName(best[0], language);
};

/** Texto entre paréntesis que da la IA junto al código ("#EDC4B3 (Beige claro)" -> "Beige claro"). */
export const descriptionFromProfile = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = value.match(/\(([^)]+)\)/);
  const text = match?.[1]?.trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
};

export type ColorDisplayMode = 'name' | 'code';

/** Etiqueta según el modo elegido: nombre (por defecto) o código HEX sin '#'. */
export const colorLabel = (
  value: unknown,
  mode: ColorDisplayMode,
  kind: ColorKind = 'general',
  language: ColorLanguage = 'es'
): string => {
  const hex = parseHex(value);
  if (mode === 'code') return hex ? hex : language === 'en' ? 'N/A' : 'N/D';
  // Para piel/cabello/ojos se prefiere el nombre que ya dio la IA (más fiel a la foto) si existe.
  // La IA lo describe en español, así que en inglés se usa el nombre de la lista traducido.
  if (kind !== 'general' && language === 'es') {
    const described = descriptionFromProfile(value);
    if (described) return described;
  }
  return colorNameFor(hex ?? value, kind, language);
};
