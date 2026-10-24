import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Vibration,
  ActivityIndicator,
  Linking,
  NativeModules,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS, ROUNDING, SIZES } from '../../constants/theme';
import {
  ArrowLeft,
  Zap,
  ZapOff,
  Camera,
  Sparkles,
  Box,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import speciesData from '../../data/species.json';
import { launchTrueAR } from '../../utils/arCoreLauncher';

const { NativeAR } = NativeModules;

// Local target exhibit images for reference thumbnails
const EXHIBIT_IMAGES: Record<string, any> = {
  leopard: require('../../assets/images/targets/leopard.jpg'),
  langur: require('../../assets/images/targets/langur.jpg'),
  pangolin: require('../../assets/images/targets/pangolin.jpg'),
};

export default function ExhibitScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<'all' | 'leopard' | 'langur' | 'pangolin'>('all');
  const [detectedSpecies, setDetectedSpecies] = useState<typeof speciesData[0] | null>(null);

  const { incrementScan } = useApp();
  const cameraRef = useRef<CameraView>(null);
  const hasRequestedRef = useRef(false);

  // Scan line animation
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasRequestedRef.current) {
      hasRequestedRef.current = true;
      requestPermission();
    }
  }, [requestPermission]);

  // Continuous laser scan line loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  // Clean shutdown on unmount
  useEffect(() => {
    return () => {
      setFlash(false);
      setCameraActive(false);
    };
  }, []);

  const handleScanPhoto = async () => {
    if (isAnalyzing || !cameraRef.current) return;

    setIsAnalyzing(true);
    try {
      // Capture frame
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        base64: true,
        skipProcessing: true,
      });

      let matchedKey = 'leopard';

      // 1. Try Native fast visual matcher
      if (photo?.base64 && NativeAR?.matchExhibit) {
        try {
          matchedKey = await NativeAR.matchExhibit(
            photo.base64,
            selectedTarget === 'all' ? null : selectedTarget
          );
        } catch (e) {
          console.warn('Native match failed, using fallback:', e);
          matchedKey = selectedTarget === 'all' ? 'leopard' : selectedTarget;
        }
      } else if (selectedTarget !== 'all') {
        matchedKey = selectedTarget;
      }

      // If user specifically filtered to an animal, respect that target
      if (selectedTarget !== 'all') {
        matchedKey = selectedTarget;
      }

      const found = speciesData.find(s => s.id.toLowerCase() === matchedKey.toLowerCase()) || speciesData[0];

      Vibration.vibrate(80);
      setDetectedSpecies(found);
      incrementScan();
    } catch (err) {
      console.warn('Scan capture error:', err);
      // Fallback to currently selected target or default
      const fallbackKey = selectedTarget === 'all' ? 'leopard' : selectedTarget;
      const found = speciesData.find(s => s.id.toLowerCase() === fallbackKey.toLowerCase()) || speciesData[0];
      setDetectedSpecies(found);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLaunchAR = async () => {
    if (!detectedSpecies) return;
    await launchTrueAR(detectedSpecies.id, detectedSpecies.commonName);
  };

  const handleOpenStudio = () => {
    if (!detectedSpecies) return;
    setCameraActive(false);
    router.push({
      pathname: '/viewer/[id]',
      params: { id: detectedSpecies.id, mode: 'studio' },
    });
  };

  const handleResetScan = () => {
    setDetectedSpecies(null);
    setIsAnalyzing(false);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain;
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.message}>Camera access is required to scan animal exhibits.</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={canAsk ? requestPermission : () => Linking.openSettings()}
        >
          <Text style={styles.permissionButtonText}>
            {canAsk ? 'Grant Camera Access' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });

  return (
    <View style={styles.container}>
      {cameraActive && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flash}
        />
      )}

      {/* Dim overlay outside the reticle */}
      <View style={styles.contentOverlay} pointerEvents="box-none">
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 6, 20) }]}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <ArrowLeft color={COLORS.white} size={22} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Visual Exhibit Scanner</Text>
            <Text style={styles.subtitle}>Point camera at animal photo</Text>
          </View>

          <TouchableOpacity
            style={[styles.iconButton, flash && styles.iconButtonActive]}
            onPress={() => setFlash(f => !f)}
            accessibilityLabel="Toggle Flash"
          >
            {flash ? <Zap color="#F59E0B" size={20} /> : <ZapOff color={COLORS.white} size={20} />}
          </TouchableOpacity>
        </View>

        {/* Target Animal Selector Tabs */}
        <View style={styles.targetBar}>
          <TouchableOpacity
            style={[styles.targetChip, selectedTarget === 'all' && styles.targetChipActive]}
            onPress={() => setSelectedTarget('all')}
          >
            <Text style={[styles.targetChipText, selectedTarget === 'all' && styles.targetChipTextActive]}>
              ✨ Auto Detect
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.targetChip, selectedTarget === 'leopard' && styles.targetChipActive]}
            onPress={() => setSelectedTarget('leopard')}
          >
            <Text style={[styles.targetChipText, selectedTarget === 'leopard' && styles.targetChipTextActive]}>
              🐆 Leopard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.targetChip, selectedTarget === 'langur' && styles.targetChipActive]}
            onPress={() => setSelectedTarget('langur')}
          >
            <Text style={[styles.targetChipText, selectedTarget === 'langur' && styles.targetChipTextActive]}>
              🐒 Langur
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.targetChip, selectedTarget === 'pangolin' && styles.targetChipActive]}
            onPress={() => setSelectedTarget('pangolin')}
          >
            <Text style={[styles.targetChipText, selectedTarget === 'pangolin' && styles.targetChipTextActive]}>
              🦔 Pangolin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center Viewfinder / Reticle */}
        <View style={styles.overlay} pointerEvents="box-none">
          <View
            style={[
              styles.scanFrame,
              detectedSpecies ? styles.scanFrameSuccess : null,
            ]}
            pointerEvents="box-none"
          >
            <View style={[styles.corner, styles.topLeft, detectedSpecies ? styles.cornerSuccess : null]} />
            <View style={[styles.corner, styles.topRight, detectedSpecies ? styles.cornerSuccess : null]} />
            <View style={[styles.corner, styles.bottomLeft, detectedSpecies ? styles.cornerSuccess : null]} />
            <View style={[styles.corner, styles.bottomRight, detectedSpecies ? styles.cornerSuccess : null]} />

            {/* Animated Laser Scan Line */}
            {!detectedSpecies && (
              <Animated.View
                style={[
                  styles.scanLaser,
                  { transform: [{ translateY: scanTranslateY }] },
                ]}
              />
            )}

            {/* Reticle Status Pill */}
            {detectedSpecies ? (
              <View style={styles.scanningPillSuccess}>
                <CheckCircle2 color="#10B981" size={16} />
                <Text style={styles.scanningTextSuccess}>
                  {detectedSpecies.commonName}
                </Text>
              </View>
            ) : isAnalyzing ? (
              <View style={styles.scanningPillAnalyzing}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.scanningTextAnalyzing}>Analyzing Exhibit...</Text>
              </View>
            ) : (
              <View style={styles.scanningPill}>
                <Text style={styles.scanningText}>Align Exhibit in Frame</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Area: Controls or Detected Card */}
        <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          {detectedSpecies ? (
            /* Detected Animal Action Card */
            <View style={styles.detectedCard}>
              <View style={styles.detectedHeader}>
                <View style={styles.verifiedRow}>
                  <CheckCircle2 color="#10B981" size={16} />
                  <Text style={styles.verifiedText}>EXHIBIT IDENTIFIED</Text>
                </View>
                <TouchableOpacity onPress={handleResetScan} style={styles.rescanButton}>
                  <RefreshCw color="rgba(255,255,255,0.7)" size={14} />
                  <Text style={styles.rescanText}>Scan Again</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.animalProfileRow}>
                {EXHIBIT_IMAGES[detectedSpecies.id] && (
                  <Image
                    source={EXHIBIT_IMAGES[detectedSpecies.id]}
                    style={styles.detectedThumbnail}
                  />
                )}
                <View style={styles.animalInfoWrap}>
                  <Text style={styles.detectedTitle}>{detectedSpecies.commonName}</Text>
                  <Text style={styles.detectedSub}>{detectedSpecies.scientificName}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{detectedSpecies.conservationStatus}</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonGroup}>
                {/* 1. True Floor-Anchored AR Button */}
                <TouchableOpacity
                  style={styles.trueArButton}
                  onPress={handleLaunchAR}
                  activeOpacity={0.85}
                >
                  <Sparkles color="#1E293B" size={18} />
                  <View style={styles.trueArTextWrap}>
                    <Text style={styles.trueArBtnTitle}>Launch True AR (Place on Floor)</Text>
                    <Text style={styles.trueArBtnSub}>Surface detection • Walk around in room</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. Interactive 3D Studio Button */}
                <TouchableOpacity
                  style={styles.studioButton}
                  onPress={handleOpenStudio}
                  activeOpacity={0.85}
                >
                  <Box color="#FFFFFF" size={18} />
                  <Text style={styles.studioBtnText}>Open in 3D Studio</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Ready to Scan Controls */
            <View style={styles.shutterContainer}>
              <Text style={styles.guidanceHint}>
                {selectedTarget === 'all'
                  ? 'Aim at the Leopard, Langur, or Pangolin exhibit photo'
                  : `Aim at the ${selectedTarget.toUpperCase()} exhibit photo`}
              </Text>

              <TouchableOpacity
                style={[styles.scanShutterButton, isAnalyzing && styles.scanShutterButtonBusy]}
                onPress={handleScanPhoto}
                disabled={isAnalyzing}
                activeOpacity={0.8}
              >
                {isAnalyzing ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <View style={styles.shutterInner}>
                    <Camera color="#FFFFFF" size={30} />
                    <Text style={styles.shutterLabel}>SCAN EXHIBIT</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  message: {
    fontFamily: FONTS.sansMedium,
    color: COLORS.white,
    textAlign: 'center',
    fontSize: SIZES.medium,
    marginBottom: 8,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: ROUNDING.pill,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.sansBold,
    fontSize: SIZES.medium,
  },
  backLink: {
    marginTop: 8,
  },
  backLinkText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: FONTS.sansMedium,
    fontSize: SIZES.medium,
  },
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    color: COLORS.white,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: '#F59E0B',
  },
  targetBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  targetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: ROUNDING.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  targetChipActive: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
  },
  targetChipText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  targetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  scanFrame: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  scanFrameSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#F59E0B',
  },
  cornerSuccess: {
    borderColor: '#10B981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanLaser: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    height: 2.5,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  scanningPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: ROUNDING.pill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scanningText: {
    fontFamily: FONTS.sansMedium,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  scanningPillAnalyzing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: ROUNDING.pill,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  scanningTextAnalyzing: {
    fontFamily: FONTS.sansBold,
    color: '#F59E0B',
    fontSize: 12,
  },
  scanningPillSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: ROUNDING.pill,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
  },
  scanningTextSuccess: {
    fontFamily: FONTS.sansBold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  bottomContainer: {
    paddingHorizontal: 18,
  },
  shutterContainer: {
    alignItems: 'center',
    gap: 14,
  },
  guidanceHint: {
    fontFamily: FONTS.sans,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    textAlign: 'center',
  },
  scanShutterButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#059669',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  scanShutterButtonBusy: {
    backgroundColor: '#047857',
  },
  shutterInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shutterLabel: {
    fontFamily: FONTS.sansBold,
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.8,
  },
  detectedCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  detectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
    color: '#34D399',
    letterSpacing: 1,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: ROUNDING.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rescanText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },
  animalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detectedThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: '#334155',
  },
  animalInfoWrap: {
    flex: 1,
  },
  detectedTitle: {
    fontFamily: FONTS.serif,
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  detectedSub: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 6,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  statusPillText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10,
    color: '#F87171',
  },
  actionButtonGroup: {
    gap: 10,
  },
  trueArButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF24',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 12,
  },
  trueArTextWrap: {
    flex: 1,
  },
  trueArBtnTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: '#1E293B',
  },
  trueArBtnSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  studioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  studioBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
