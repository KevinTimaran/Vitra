import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Garment } from '../../types';
import { MOCK_GARMENTS } from '../../data/mockData';
import { COLLECTION_STORAGE, persistCollection } from './userStorage';

export function useWardrobeState(isReady: boolean) {
  const [wardrobeItems, setWardrobeItems] = useState<Garment[]>(MOCK_GARMENTS);

  useEffect(() => {
    if (!isReady) return;
    void persistCollection(
      COLLECTION_STORAGE.wardrobe.fileName,
      COLLECTION_STORAGE.wardrobe.webKey,
      wardrobeItems
    ).catch((error) => console.warn('[UserContext] Error al persistir el armario:', error));
  }, [isReady, wardrobeItems]);

  const addGarmentToWardrobe = useCallback((garment: Garment) => {
    setWardrobeItems((previous) => {
      const index = previous.findIndex((item) => item.id === garment.id);
      if (index < 0) return [garment, ...previous];
      return previous.map((item, itemIndex) => (itemIndex === index ? garment : item));
    });
  }, []);

  const removeGarmentFromWardrobe = useCallback((id: string) => {
    setWardrobeItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toggleFavoriteGarment = useCallback((id: string) => {
    setWardrobeItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, isFavorite: !item.isFavorite } : item))
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
