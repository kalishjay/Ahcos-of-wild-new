import { NativeModules, Linking, Platform, Alert } from 'react-native';

const { NativeAR } = NativeModules;

export const AR_MODEL_URLS: Record<string, { url: string; title: string }> = {
  leopard: {
    url: 'https://raw.githubusercontent.com/kalishjay/Ahcos-of-wild-new/main/assets/models/Leopard.glb',
    title: 'Sri Lankan Leopard',
  },
  langur: {
    url: 'https://raw.githubusercontent.com/kalishjay/Ahcos-of-wild-new/main/assets/models/Langur.glb',
    title: 'Purple-faced Langur',
  },
  pangolin: {
    url: 'https://raw.githubusercontent.com/kalishjay/Ahcos-of-wild-new/main/assets/models/Pangolin.glb',
    title: 'Sri Lankan Pangolin',
  },
};

export function getARModelInfo(speciesId?: string) {
  if (!speciesId) return null;
  const clean = speciesId.trim().toLowerCase();
  for (const [key, val] of Object.entries(AR_MODEL_URLS)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }
  return null;
}

/**
 * Launch true room surface-detecting AR via Google Scene Viewer (ARCore).
 * Automatically bypasses the "Open with" chooser by directly launching
 * Google Play Services for AR (com.google.ar.core).
 */
export async function launchTrueAR(speciesId: string, customTitle?: string): Promise<boolean> {
  const info = getARModelInfo(speciesId);
  if (!info) {
    Alert.alert('AR Model Not Available', 'True AR model is not yet configured for this animal.');
    return false;
  }

  const animalTitle = customTitle || info.title;

  // 1. Try Native AR Module (Directly opens com.google.ar.core with NO chooser!)
  if (Platform.OS === 'android' && NativeAR?.launchAR) {
    try {
      await NativeAR.launchAR(info.url, animalTitle);
      return true;
    } catch (e) {
      console.warn('NativeAR launch failed, falling back to Linking:', e);
    }
  }

  // 2. Fallback to Linking with Google Scene Viewer intent
  const title = encodeURIComponent(animalTitle);
  const fileUrl = encodeURIComponent(info.url);
  const sceneViewerUrl = `https://arvr.google.com/scene-viewer/1.0?file=${fileUrl}&mode=ar_only&title=${title}&resizable=true`;

  try {
    await Linking.openURL(sceneViewerUrl);
    return true;
  } catch (err) {
    Alert.alert(
      'Google ARCore Required',
      'True surface detection requires Google Play Services for AR. Please install it from the Play Store.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Get ARCore',
          onPress: () => {
            Linking.openURL('https://play.google.com/store/apps/details?id=com.google.ar.core').catch(() => {});
          },
        },
      ]
    );
    return false;
  }
}
