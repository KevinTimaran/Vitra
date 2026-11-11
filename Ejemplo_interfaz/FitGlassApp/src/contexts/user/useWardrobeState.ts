import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Garment } from '../../types';
import { MOCK_GARMENTS } from '../../data/mockData';
import { COLLECTION_STORAGE, persistCollection } from './userStorage';

/**
 * Armario del usuario. `scope` identifica al usuario (ver scopeKeyFor): cada cuenta tiene su propio archivo y
 * `isReady` solo es true cuando el estado en memoria corresponde a ESE usuario (evita escribir datos ajenos).
 */
export function useWardrobeState(isReady: boolean, scope: string) {
  const [wardrobeItems, setWardrobeItems] = useState<Garment[]>(MOCK_GARMENTS);

  useEffect(() => {
    if (!isReady) return;
    void persistCollection(
      COLLECTION_STORAGE.wardrobe.fileName,
      COLLECTION_STORAGE.wardrobe.webKey,
      wardrobeItems,
      scope
    ).catch((error) => console.warn('[UserContext] Error al persistir el armario:', error));
  }, [isReady, scope, wardrobeItems]);

  const addGarmentToWardrobe = useCallback((garment: Garment) => {
    const stamped: Garment = { ...garment, updatedAt: Date.now() };
    setWardrobeItems((previous) => {
      const index = previous.findIndex((item) => item.id === stamped.id);
      if (index < 0) return [stamped, ...previous];
      return previous.map((item, itemIndex) => (itemIndex === index ? stamped : item));
    });
  }, []);

  const removeGarmentFromWardrobe = useCallback((id: string) => {
    setWardrobeItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toggleFavoriteGarment = useCallback((id: string) => {
    const now = Date.now();
    setWardrobeItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite, updatedAt: now } : item))
    );
  }, []);

  const clearWardrobe = useCallback(() => setWardrobeItems([]), []);
  const favoriteWardrobeCount = useMemo(
    () => wardrobeItems.filter((item) => item.isFavorite).length,
    [wardrobeItems]
  );

  return useMemo(() => ({
    wardrobeItems,
    setWardrobeItems,
    addGarmentToWardrobe,
    removeGarmentFromWardrobe,
    toggleFavoriteGarment,
    clearWardrobe,
    wardrobeCount: wardrobeItems.length,
    favoriteWardrobeCount,
  }), [
    wardrobeItems,
    setWardrobeItems,
    addGarmentToWardrobe,
    removeGarmentFromWardrobe,
    toggleFavoriteGarment,
    clearWardrobe,
    favoriteWardrobeCount,
  ]);
}
