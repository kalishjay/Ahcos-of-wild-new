import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS, ROUNDING, SIZES } from '../../constants/theme';
import { ArrowLeft, Zap, ZapOff, Aperture, CheckCircle2, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import speciesData from '../../data/species.json';

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [detectedSpecies, setDetectedSpecies] = useState<typeof speciesData[0] | null>(null);
  const { incrementScan } = useApp();
  const hasRequestedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasRequestedRef.current) {
      hasRequestedRef.current = true;
      requestPermission();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setFlash(false);
      setCameraActive(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateToAR = (species: typeof speciesData[0]) => {
    incrementScan();
    setCameraActive(false);
    router.replace({
      pathname: '/viewer/[id]',
      params: { id: species.id, mode: 'ar' },
    });
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || detectedSpecies) return;

    const cleanData = (data || '').trim().toLowerCase();
    if (!cleanData) return;

    const segments = cleanData.split('/');
    const candidateId = segments[segments.length - 1].replace(/\.(glb|gltf)$/i, '');

    const foundSpecies = speciesData.find(
      s =>
        s.id.toLowerCase() === cleanData ||
        s.id.toLowerCase() === candidateId ||
        s.commonName.toLowerCase() === cleanData ||
        s.commonName.toLowerCase() === candidateId ||
        s.modelUrl.toLowerCase().replace(/\.(glb|gltf)$/i, '') === candidateId ||
        cleanData.includes(s.id.toLowerCase()) ||
        cleanData.includes(s.commonName.toLowerCase())
    );

    if (foundSpecies) {
      setScanned(true);
      setDetectedSpecies(foundSpecies);
      Vibration.vibrate(80);
    }
  };

  const handleManualCapture = () => {
    if (detectedSpecies) {
      if (timerRef.current) clearTimeout(timerRef.current);
      navigateToAR(detectedSpecies);
    } else {
      // Re-enable scanning if paused
      setScanned(false);
      setCameraActive(true);
      setDetectedSpecies(null);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain;
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.message}>Camera access is required to scan exhibits.</Text>
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

  return (
    <View style={styles.container}>
      {cameraActive && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flash}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      )}

      <View style={styles.contentOverlay} pointerEvents="box-none">
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft color={COLORS.white} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>AR Exhibit Scanner</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Scan frame overlay */}
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

            {detectedSpecies ? (
              <View style={styles.scanningPillSuccess}>
                <CheckCircle2 color="#10B981" size={18} />
                <Text style={styles.scanningTextSuccess}>
                  {detectedSpecies.commonName} Verified!
                </Text>
              </View>
            ) : (
              <View style={styles.scanningPill}>
                <Text style={styles.scanningText}>Point at Exhibit QR Code</Text>
              </View>
            )}
          </View>

          <Text style={styles.hintText}>
            {detectedSpecies
              ? 'Tap "Enter AR" or the Capture button to view'
              : 'Align exhibit or QR code inside the box to scan'}
          </Text>
        </View>

        {/* Detected Species Action Card */}
        {detectedSpecies && (
          <View style={styles.detectedCardContainer}>
            <TouchableOpacity
              style={styles.detectedCard}
              onPress={() => {
                if (timerRef.current) clearTimeout(timerRef.current);
                navigateToAR(detectedSpecies);
              }}
              activeOpacity={0.88}
            >
              <View style={styles.detectedCardLeft}>
                <Text style={styles.detectedCardTag}>QR CODE DETECTED</Text>
                <Text style={styles.detectedCardTitle}>{detectedSpecies.commonName}</Text>
                <Text style={styles.detectedCardDesc}>{detectedSpecies.scientificName}</Text>
              </View>
              <View style={styles.detectedCardButton}>
                <Sparkles color="#FFFFFF" size={16} />
                <Text style={styles.detectedCardButtonText}>Enter AR</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom controls */}
        <View style={[styles.bottomControls, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <View style={styles.tipBanner}>
            <Text style={styles.tipText}>💡 Hold steady for best results</Text>
          </View>

          <View style={styles.controlRow}>
            <View style={styles.controlPlaceholder} />

            <TouchableOpacity
              style={[
                styles.captureButton,
                detectedSpecies ? styles.captureButtonActive : null,
              ]}
              onPress={handleManualCapture}
              activeOpacity={0.8}
            >
              <View style={styles.captureButtonInner}>
                <Aperture color={COLORS.white} size={32} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setFlash(f => !f)}
              activeOpacity={0.8}
            >
              {flash ? (
                <Zap color={COLORS.status.vulnerable} size={24} />
              ) : (
                <ZapOff color={COLORS.white} size={24} />
              )}
              <Text style={styles.controlLabel}>Flash</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: SIZES.large,
    color: COLORS.white,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  scanFrame: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  scanFrameSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: COLORS.status.vulnerable,
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
    color: COLORS.white,
    fontSize: 13,
  },
  scanningPillSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: ROUNDING.pill,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  scanningTextSuccess: {
    fontFamily: FONTS.sansBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  hintText: {
    fontFamily: FONTS.sansMedium,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textAlign: 'center',
  },
  detectedCardContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  detectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 48, 28, 0.95)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  detectedCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  detectedCardTag: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: '#34D399',
    letterSpacing: 1,
    marginBottom: 2,
  },
  detectedCardTitle: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    color: '#FFFFFF',
  },
  detectedCardDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  detectedCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  detectedCardButtonText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  bottomControls: {
    paddingHorizontal: 20,
    gap: 16,
  },
  tipBanner: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: ROUNDING.pill,
    alignSelf: 'center',
  },
  tipText: {
    fontFamily: FONTS.sans,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlPlaceholder: {
    width: 60,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.status.vulnerable,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 60,
    alignItems: 'center',
    gap: 4,
  },
  controlLabel: {
    fontFamily: FONTS.sansMedium,
    color: COLORS.white,
    fontSize: 11,
  },
});
