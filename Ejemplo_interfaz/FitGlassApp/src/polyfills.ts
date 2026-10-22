// src/polyfills.ts
/**
 * Hermes / React Native polyfills
 */
if (typeof process !== 'undefined') {
  if (typeof (process as any).emitWarning !== 'function') {
    (process as any).emitWarning = function () {
      // No-op for Hermes / React Native
    };
  }
}
