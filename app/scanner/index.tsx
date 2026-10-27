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
  ScanLine,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import speciesData from '../../data/species.json';

const { NativeAR } = NativeModules;

const EXHIBIT_THUMBNAILS = [
  { id: 'leopard', name: 'Leopard', img: require('../../assets/images/targets/leopard.jpg') },
  { id: 'langur', name: 'Langur', img: require('../../assets/images/targets/langur.jpg') },
  { id: 'pangolin', name: 'Pangolin', img: require('../../assets/images/targets/pangolin.jpg') },
];

export default function ExhibitScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [matchedAnimalName, setMatchedAnimalName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { incrementScan } = useApp();
  const cameraRef = useRef<CameraView>(null);
  const hasRequestedRef = useRef(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasRequestedRef.current) {
      hasRequestedRef.current = true;
      requestPermission();
    }
  }, [requestPermission]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  useEffect(() => {
    return () => {
      setFlash(false);
      setCameraActive(false);
    };
  }, []);

  const handleScanPhoto = async () => {
    if (isAnalyzing || !cameraRef.current || matchedAnimalName) return;

    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        skipProcessing: false,
      });

      if (!photo?.base64 || !NativeAR?.matchExhibit) {
        setErrorMessage('Could not capture frame. Please hold steady and try again.');
        setIsAnalyzing(false);
        return;
      }

      const matchedKey: string = await NativeAR.matchExhibit(photo.base64, null);

      if (!matchedKey || matchedKey === 'none') {
        Vibration.vibrate(40);
        setErrorMessage('Animal photo not recognized. Point clearly at one of the 3 animal photos.');
        setIsAnalyzing(false);
        return;
      }

      const found = speciesData.find(s => s.id.toLowerCase() === matchedKey.toLowerCase());
      if (!found) {
        setErrorMessage('Animal photo not recognized. Point clearly at one of the 3 animal photos.');
        setIsAnalyzing(false);
        return;
      }

      // Valid match among the 3 target photos! Directly open AR View
      Vibration.vibrate(70);
      setMatchedAnimalName(found.commonName);
      incrementScan();

      setTimeout(() => {
        setCameraActive(false);
        router.replace({
          pathname: '/viewer/[id]',
          params: { id: found.id, mode: 'ar' },
        });
      }, 360);
    } catch {
      setErrorMessage('Please hold steady and scan one of the 3 animal photos.');
      setIsAnalyzing(false);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain;
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.message}>Camera access is required to scan animal photos for AR.</Text>
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
    outputRange: [8, 246],
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

      <View style={styles.contentOverlay} pointerEvents="box-none">
        {/* Clean Minimalist Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 22) }]}>
          <TouchableOpacity
            style={styles.glassIconBtn}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <ArrowLeft color={COLORS.white} size={20} />
          </TouchableOpacity>

          <View style={styles.headerCenterPill}>
            <Text style={styles.headerTitle}>Wild AR Scanner</Text>
          </View>

          <TouchableOpacity
            style={[styles.glassIconBtn, flash && styles.glassIconBtnActive]}
            onPress={() => setFlash(f => !f)}
            accessibilityLabel="Toggle Flash"
          >
            {flash ? <Zap color="#FBBF24" size={19} /> : <ZapOff color={COLORS.white} size={19} />}
          </TouchableOpacity>
        </View>

        {/* Reference Strip of the 3 Scannable Animal Photos */}
        <View style={styles.referenceStrip}>
          <Text style={styles.referenceLabel}>Scannable Exhibits:</Text>
          <View style={styles.thumbRow}>
            {EXHIBIT_THUMBNAILS.map(item => (
              <View key={item.id} style={styles.thumbItem}>
                <Image source={item.img} style={styles.thumbImage} />
                <Text style={styles.thumbText}>{item.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Center Reticle */}
        <View style={styles.overlay} pointerEvents="box-none">
          <View
            style={[
              styles.scanFrame,
              matchedAnimalName ? styles.scanFrameSuccess : null,
              errorMessage ? styles.scanFrameError : null,
            ]}
            pointerEvents="box-none"
          >
            <View style={[styles.corner, styles.topLeft, matchedAnimalName ? styles.cornerSuccess : null]} />
            <View style={[styles.corner, styles.topRight, matchedAnimalName ? styles.cornerSuccess : null]} />
            <View style={[styles.corner, styles.bottomLeft, matchedAnimalName ? styles.cornerSuccess : null]} />
            <View style={[styles.corner, styles.bottomRight, matchedAnimalName ? styles.cornerSuccess : null]} />

            {!matchedAnimalName && (
              <Animated.View
                style={[
                  styles.scanLaser,
                  { transform: [{ translateY: scanTranslateY }] },
                ]}
              />
            )}

            {matchedAnimalName ? (
              <View style={styles.statusPillSuccess}>
                <CheckCircle2 color="#FFFFFF" size={16} />
                <Text style={styles.statusTextSuccess}>{matchedAnimalName}</Text>
              </View>
            ) : isAnalyzing ? (
              <View style={styles.statusPillAnalyzing}>
                <ActivityIndicator size="small" color="#34D399" />
                <Text style={styles.statusTextAnalyzing}>Verifying Photo...</Text>
              </View>
            ) : null}
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle color="#FCA5A5" size={16} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}
        </View>

        {/* Single Sleek Scan Action Dock */}
        <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom + 18, 30) }]}>
          <Text style={styles.hintText}>
            Frame the Leopard, Langur, or Pangolin photo inside the box
          </Text>

          <TouchableOpacity
            style={[styles.scanButton, (isAnalyzing || !!matchedAnimalName) && styles.scanButtonBusy]}
            onPress={handleScanPhoto}
            disabled={isAnalyzing || !!matchedAnimalName}
            activeOpacity={0.85}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <ScanLine color="#0F172A" size={22} />
                <Text style={styles.scanButtonText}>Scan Animal Photo</Text>
              </>
            )}
          </TouchableOpacity>
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
    paddingHorizontal: 18,
  },
  glassIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassIconBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.22)',
    borderColor: '#FBBF24',
  },
  headerCenterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: ROUNDING.pill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  headerTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  referenceStrip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 10,
    marginTop: 8,
  },
  referenceLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  thumbImage: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  thumbText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: '#E2E8F0',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scanFrame: {
    width: 264,
    height: 264,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
  },
  scanFrameSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  scanFrameError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#34D399',
  },
  cornerSuccess: {
    borderColor: '#10B981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 20,
  },
  scanLaser: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 2.5,
    backgroundColor: '#34D399',
    borderRadius: 2,
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  statusPillAnalyzing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: ROUNDING.pill,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.45)',
  },
  statusTextAnalyzing: {
    fontFamily: FONTS.sansBold,
    color: '#A7F3D0',
    fontSize: 12,
  },
  statusPillSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: ROUNDING.pill,
    backgroundColor: '#10B981',
  },
  statusTextSuccess: {
    fontFamily: FONTS.sansBold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(127, 29, 29, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
  },
  errorBannerText: {
    fontFamily: FONTS.sansMedium,
    color: '#FEE2E2',
    fontSize: 12,
    flexShrink: 1,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  hintText: {
    fontFamily: FONTS.sans,
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    textAlign: 'center',
  },
  scanButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#34D399',
    borderRadius: 27,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  scanButtonBusy: {
    opacity: 0.75,
  },
  scanButtonText: {
    fontFamily: FONTS.sansBold,
    color: '#0F172A',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
