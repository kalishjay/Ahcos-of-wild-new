import { Linking, Platform, Alert } from 'react-native';

export const AR_MODEL_URLS: Record<string, { url: string; title: string }> = {
  leopard: {
    url: 'https://files.catbox.moe/cm3829.glb',
    title: 'Sri Lankan Leopard',
  },
  langur: {
    url: 'https://files.catbox.moe/9nt1n2.glb',
    title: 'Purple-faced Langur',
  },
  pangolin: {
    url: 'https://files.catbox.moe/5wc32y.glb',
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
 * Scans real floors/tables, shows tracking dots, and anchors the
 * 3D animal directly onto the detected surface at realistic scale.
 */
export async function launchTrueAR(speciesId: string, customTitle?: string): Promise<boolean> {
  const info = getARModelInfo(speciesId);
  if (!info) {
    Alert.alert('AR Model Not Available', 'True AR model is not yet configured for this animal.');
    return false;
  }

  const animalTitle = customTitle || info.title;
  const title = encodeURIComponent(animalTitle);
  const fileUrl = encodeURIComponent(info.url);

  // Universal Scene Viewer URL — handles surface detection via Google Play Services for AR
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
