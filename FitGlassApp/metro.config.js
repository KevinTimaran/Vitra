const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Permitir empaquetar modelos 3D como assets locales (require('./modelo.glb') / require('./modelo.gltf')).
['glb', 'gltf', 'bin'].forEach((ext) => {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
});

module.exports = config;
