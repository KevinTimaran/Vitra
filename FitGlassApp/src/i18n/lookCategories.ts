// Las categorías de looks se guardan con su nombre original en español (son datos persistidos).
// Para mostrarlas se traducen las predeterminadas; las creadas por el usuario se muestran tal cual.
const BUILT_IN: Record<string, string> = {
  Todos: 'lookCat.all',
  Favoritos: 'lookCat.favorites',
  'Sin categoría': 'lookCat.none',
  Elegante: 'lookCat.elegant',
  Fiesta: 'lookCat.party',
  Casual: 'lookCat.casual',
  Formal: 'lookCat.formal',
  Deportivo: 'lookCat.sport',
};

export const lookCategoryLabel = (category: string, t: (key: string) => string): string =>
  BUILT_IN[category] ? t(BUILT_IN[category]) : category;

/** Traduce `key` si existe; si no, devuelve `fallback` (útil para valores dinámicos como el corte de una prenda). */
export const translateOr = (t: (key: string) => string, key: string, fallback: string): string => {
  const text = t(key);
  return text === key ? fallback : text;
};
