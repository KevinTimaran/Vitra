// src/polyfills.ts
/**
 * Hermes / React Native polyfills
 */
if (typeof process !== 'undefined') {
  if (typeof (process as any).emitWarning !== 'function') {
    (process as any).emitWarning = function (warning: any) {
      if (__DEV__ && typeof console !== 'undefined' && console.warn) {
        // Suppress or log deprecation warnings safely
      }
    };
  }
}
