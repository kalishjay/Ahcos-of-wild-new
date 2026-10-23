import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

export const MODEL_REQUIRES: Record<string, number> = {
  leopard: require('../assets/models/Leopard.glb'),
  langur: require('../assets/models/Langur.glb'),
  pangolin: require('../assets/models/Pangolin.glb'),
};

const uriCache = new Map<number, string>();

/**
 * Returns the require module ID for a species model based on id, filename, or common name.
 */
export function getModelRequire(input?: string | null): number | null {
  if (!input) return null;
  const clean = input.toLowerCase().trim();

  if (clean.includes('leopard')) return MODEL_REQUIRES.leopard;
  if (clean.includes('langur')) return MODEL_REQUIRES.langur;
  if (clean.includes('pangolin')) return MODEL_REQUIRES.pangolin;

  return null;
}

/**
 * Get synchronously cached local URI if already loaded
 */
export function getCachedModelUri(modelRequire: number): string | null {
  return uriCache.get(modelRequire) || null;
}

/**
 * Preloads all 3D animal models into memory and local filesystem cache
 * so they open instantly upon scanning without delay.
 */
export async function preloadAllModels(): Promise<void> {
  const requires = Object.values(MODEL_REQUIRES);

  try {
    const assets = await Asset.loadAsync(requires);
    assets.forEach(asset => {
      const uri = asset.localUri || asset.uri;
      if (asset.downloaded && uri) {
        uriCache.set(Number(asset.hash ? asset.hash : asset.name), uri);
      }
    });

    // Also populate direct module id cache
    for (const req of requires) {
      try {
        const asset = Asset.fromModule(req);
        if (asset.localUri || asset.uri) {
          uriCache.set(req, (asset.localUri || asset.uri)!);
        }
      } catch {
        // continue
      }
    }

    // On native, preload GLTF structure in drei cache
    if (Platform.OS !== 'web') {
      try {
        const { useGLTF } = require('@react-three/drei/native');
        for (const uri of uriCache.values()) {
          if (uri && useGLTF?.preload) {
            useGLTF.preload(uri);
          }
        }
      } catch {
        // drei native might not be initialized yet
      }
    }
  } catch (e) {
    console.warn('[ModelPreloader] Background preload error:', e);
  }
}

/**
 * Preload and return single model URI immediately if cached, or as a Promise.
 */
export async function loadModelUri(modelRequire: number): Promise<string> {
  const cached = uriCache.get(modelRequire);
  if (cached) return cached;

  const [asset] = await Asset.loadAsync(modelRequire);
  const uri = asset.localUri || asset.uri;
  if (!uri) throw new Error('Asset has no valid URI');

  uriCache.set(modelRequire, uri);
  return uri;
}
