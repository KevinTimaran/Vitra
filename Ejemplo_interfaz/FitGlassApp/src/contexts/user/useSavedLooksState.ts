import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SavedLookItem } from '../../types';
import { DEFAULT_LOOK_CATEGORIES } from './userDefaults';
import { COLLECTION_STORAGE, persistCollection } from './userStorage';

export function useSavedLooksState(isReady: boolean) {
  const [savedLooks, setSavedLooks] = useState<SavedLookItem[]>([]);
  const [lookCategories, setLookCategories] = useState<string[]>(DEFAULT_LOOK_CATEGORIES);

  useEffect(() => {
    if (!isReady) return;
    void persistCollection(
      COLLECTION_STORAGE.savedLooks.fileName,
      COLLECTION_STORAGE.savedLooks.webKey,
      savedLooks
    ).catch((error) => console.warn('[UserContext] Error al persistir looks guardados:', error));
  }, [isReady, savedLooks]);

  useEffect(() => {
    if (!isReady) return;
    void persistCollection(
      COLLECTION_STORAGE.lookCategories.fileName,
      COLLECTION_STORAGE.lookCategories.webKey,
      lookCategories
    ).catch((error) => console.warn('[UserContext] Error al persistir categorías:', error));
  }, [isReady, lookCategories]);

  const addLookCategory = useCallback((categoryName: string) => {
    const normalizedName = categoryName.trim();
    if (!normalizedName) return;
    setLookCategories((previous) => {
      if (previous.some((item) => item.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
        return previous;
      }
      return [...previous, normalizedName];
    });
  }, []);

  const removeLookCategory = useCallback((categoryName: string) => {
    setLookCategories((previous) => previous.filter((item) => item !== categoryName));
  }, []);

  const saveLook = useCallback((look: SavedLookItem) => {
    setSavedLooks((previous) => {
      const index = previous.findIndex((item) => item.id === look.id);
      if (index < 0) return [look, ...previous];
      return previous.map((item, itemIndex) => (itemIndex === index ? look : item));
    });
  }, []);

  const removeLook = useCallback((id: string) => {
    setSavedLooks((previous) => previous.filter((look) => look.id !== id));
  }, []);

  const updateLook = useCallback((look: SavedLookItem) => saveLook(look), [saveLook]);
  const clearSavedLooks = useCallback(() => setSavedLooks([]), []);

  const updateLookCategory = useCallback((lookId: string, category: string) => {
    setSavedLooks((previous) => previous.map((look) => (look.id === lookId ? { ...look, category } : look)));
  }, []);

  const toggleFavoriteLook = useCallback((id: string) => {
    setSavedLooks((previous) =>
      previous.map((look) => (look.id === id ? { ...look, isFavorite: !look.isFavorite } : look))
    );
  }, []);

  const favoriteLooksCount = useMemo(
    () => savedLooks.filter((look) => look.isFavorite).length,
    [savedLooks]
  );

  return useMemo(() => ({
    savedLooks,
    setSavedLooks,
    lookCategories,
    setLookCategories,
    addLookCategory,
    removeLookCategory,
    saveLook,
    removeLook,
    updateLook,
    clearSavedLooks,
    updateLookCategory,
    toggleFavoriteLook,
    savedLooksCount: savedLooks.length,
    favoriteLooksCount,
  }), [
    savedLooks,
    setSavedLooks,
    lookCategories,
    setLookCategories,
    addLookCategory,
    removeLookCategory,
    saveLook,
    removeLook,
    updateLook,
    clearSavedLooks,
    updateLookCategory,
    toggleFavoriteLook,
    favoriteLooksCount,
  ]);
}
