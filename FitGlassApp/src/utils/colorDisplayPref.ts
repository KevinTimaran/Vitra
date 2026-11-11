import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { ColorDisplayMode } from './colorNames.ts';

const KEY = 'vitra_color_display_mode';
const DEFAULT_MODE: ColorDisplayMode = 'name'; // por defecto, nombres: son más fáciles de entender que los códigos

const read = async (): Promise<ColorDisplayMode | null> => {
  try {
    const value =
      Platform.OS === 'web'
        ? typeof localStorage !== 'undefined'
          ? localStorage.getItem(KEY)
          : null
        : (await SecureStore.isAvailableAsync())
        ? await SecureStore.getItemAsync(KEY)
        : null;
    return value === 'name' || value === 'code' ? value : null;
  } catch {
    return null;
  }
};

const write = async (mode: ColorDisplayMode): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, mode);
    } else if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(KEY, mode);
    }
  } catch (error) {
    console.warn('[ColorDisplayPref] No se pudo guardar la preferencia:', error);
  }
};

/** Preferencia "ver colores como Nombre o Código" (se recuerda entre sesiones). */
export function useColorDisplayMode(): [ColorDisplayMode, (mode: ColorDisplayMode) => void] {
  const [mode, setModeState] = useState<ColorDisplayMode>(DEFAULT_MODE);

  useEffect(() => {
    let cancelled = false;
    void read().then((stored) => {
      if (!cancelled && stored) setModeState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ColorDisplayMode) => {
    setModeState(next);
    void write(next);
  }, []);

  return [mode, setMode];
}
