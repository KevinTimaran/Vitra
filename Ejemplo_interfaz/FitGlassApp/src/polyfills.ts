// src/polyfills.ts
/**
 * Hermes / React Native polyfills for Three.js & GLTF Loading
 */

const g = typeof globalThis !== 'undefined' ? (globalThis as any) : {};

// 1. Process emitWarning (Hermes missing Node method)
if (typeof process !== 'undefined') {
  if (typeof (process as any).emitWarning !== 'function') {
    (process as any).emitWarning = function () {
      // No-op for Hermes / React Native
    };
  }
}

// 2. Global window & self references
if (typeof g.window === 'undefined') {
  g.window = g;
}
if (typeof g.self === 'undefined') {
  g.self = g;
}

// 3. HTML Image polyfill for Three.js GLTFLoader format support detection (WebP, AVIF)
if (typeof g.Image === 'undefined') {
  class PolyfillImage {
    private _src: string = '';
    width: number = 1;
    height: number = 1;
    complete: boolean = false;
    onload: (() => void) | null = null;
    onerror: ((err: any) => void) | null = null;

    get src(): string {
      return this._src;
    }

    set src(value: string) {
      this._src = value;
      // Auto-trigger onload asynchronously to satisfy Three.js format detection
      setTimeout(() => {
        this.width = 1;
        this.height = 1;
        this.complete = true;
        if (typeof this.onload === 'function') {
          this.onload();
        }
      }, 0);
    }

    addEventListener(type: string, listener: any) {
      if (type === 'load') this.onload = listener;
      if (type === 'error') this.onerror = listener;
    }

    removeEventListener(type: string, listener: any) {
      if (type === 'load' && this.onload === listener) this.onload = null;
      if (type === 'error' && this.onerror === listener) this.onerror = null;
    }
  }

  g.Image = PolyfillImage;
  if (g.window) {
    g.window.Image = PolyfillImage;
  }
}

// 4. Web Worker stub for React Native (Hermes has no DOM Workers)
if (typeof g.Worker === 'undefined') {
  class PolyfillWorker {
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;

    constructor(_url?: string) {
      // Worker stub
    }

    postMessage(_data: any) {
      // Stub worker - react native does not support DOM Web Workers
    }

    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  }

  g.Worker = PolyfillWorker;
  if (g.window) {
    g.window.Worker = PolyfillWorker;
  }
}

// 5. Minimal DOM document mock for Three.js loaders checking createElementNS / createElement
if (typeof g.document === 'undefined') {
  const mockDocument = {
    createElement(name: string) {
      if (name && name.toLowerCase() === 'img') return new g.Image();
      return {
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
      };
    },
    createElementNS(_ns: string, name: string) {
      if (name && name.toLowerCase() === 'img') return new g.Image();
      return {
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        removeChild: () => {},
      };
    },
  };
  g.document = mockDocument;
  if (g.window) {
    g.window.document = mockDocument;
  }
}
