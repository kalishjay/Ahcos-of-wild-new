import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONTS, SIZES, ROUNDING } from '../../constants/theme';
import speciesData from '../../data/species.json';
import { Model3DViewer } from '../../components/Model3DViewer';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  X,
  Camera,
  Box,
  RotateCw,
  RefreshCw,
  Info,
  Sparkles,
  MapPin,
  ShieldAlert,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getModelRequire } from '../../utils/modelPreloader';

export default function ViewerScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const initialMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isAR, setIsAR] = useState(initialMode !== 'studio');
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);

  // AR Surface Tracking state reported by WebView + NativeAR sensor engine
  const [arSurfaceState, setArSurfaceState] = useState<'SCANNING' | 'LOCKED'>('SCANNING');
  const [surfaceProgress, setSurfaceProgress] = useState(0);

  // Minimal viewer controls
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCameraReady(true);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const cleanId = (id || '').trim().toLowerCase();
  const species = speciesData.find(
    s =>
      s.id.toLowerCase() === cleanId ||
      s.commonName.toLowerCase() === cleanId ||
      s.modelUrl.toLowerCase().includes(cleanId) ||
      cleanId.includes(s.id.toLowerCase())
  );

  useEffect(() => {
    if (isAR && permission && !permission.granted) {
      requestPermission();
    }
  }, [isAR, permission, requestPermission]);

  const handleARStatusChange = useCallback((state: 'SCANNING' | 'LOCKED', progress: number) => {
    setArSurfaceState(prev => {
      if (prev !== 'LOCKED' && state === 'LOCKED') {
        Vibration.vibrate(45);
      }
      return state;
    });
    setSurfaceProgress(progress);
  }, []);

  if (!species) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Species not found</Text>
        <TouchableOpacity style={styles.glassCircleBtn} onPress={() => router.back()}>
          <X color={COLORS.white} size={22} />
        </TouchableOpacity>
      </View>
    );
  }

  const modelRequire = getModelRequire(species.modelUrl || species.id);
  const isCameraActive = isAR && Boolean(permission?.granted) && cameraReady;

  const toggleMode = () => {
    const nextAR = !isAR;
    setIsAR(nextAR);
    if (nextAR) {
      setArSurfaceState('SCANNING');
      setSurfaceProgress(0);
      if (permission && !permission.granted) {
        requestPermission();
      }
    }
  };

  const handleReset = () => {
    setAutoRotate(false);
    if (isCameraActive) {
      setArSurfaceState('SCANNING');
      setSurfaceProgress(0);
    }
    setResetCounter(c => c + 1);
  };

  return (
    <View style={[styles.container, isCameraActive && styles.arBackground]}>
      {/* ── Live Camera Feed (Underneath 3D Surface Canvas in AR Mode) ── */}
      {isCameraActive && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
        />
      )}

      {/* ── Camera Permission Prompt for AR ── */}
      {isAR && permission && !permission.granted && (
        <View style={[styles.permissionOverlay, { paddingTop: insets.top + 70 }]}>
          <View style={styles.permissionCard}>
            <Camera color="#34D399" size={36} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionDesc}>
              Enable camera access to detect surfaces and place {species.commonName} in AR.
            </Text>
            <TouchableOpacity style={styles.primaryActionButton} onPress={requestPermission}>
              <Text style={styles.primaryActionText}>Enable Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => setIsAR(false)}>
              <Text style={styles.secondaryActionText}>Switch to 3D Museum Hall</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── 3D Surface AR & Museum Hall Canvas ── */}
      {modelRequire !== null ? (
        <Model3DViewer
          speciesId={species.id}
          modelRequire={modelRequire}
          isAR={isCameraActive}
          autoRotate={autoRotate}
          resetCounter={resetCounter}
          onARStatusChange={handleARStatusChange}
        />
      ) : (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={styles.errorText}>3D Exhibit Unavailable</Text>
        </View>
      )}

      {/* ── Sleek Minimalist Top Bar ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 22) }]}>
        <TouchableOpacity
          style={styles.glassCircleBtn}
          onPress={() => router.back()}
          accessibilityLabel="Close Viewer"
        >
          <X color={COLORS.white} size={20} />
        </TouchableOpacity>

        {/* Center Exhibit Pill with Live Status Dot */}
        <View style={styles.centerStatusPill}>
          <Text style={styles.speciesTitle} numberOfLines={1}>
            {species.commonName}
          </Text>
          <View style={styles.statusSubRow}>
            <View
              style={[
                styles.statusDot,
                !isCameraActive
                  ? styles.statusDotMuseum
                  : arSurfaceState === 'LOCKED'
                  ? styles.statusDotLocked
                  : styles.statusDotScanning,
              ]}
            />
            <Text style={styles.statusSubText}>
              {!isCameraActive
                ? 'Museum 3D Hall'
                : arSurfaceState === 'LOCKED'
                ? 'Surface Anchored'
                : `Detecting Surface ${surfaceProgress}%`}
            </Text>
          </View>
        </View>

        {/* Mode Switch Pill (AR <-> Museum 3D) */}
        <TouchableOpacity
          style={[styles.modeSwitchPill, !isCameraActive && styles.modeSwitchPillMuseum]}
          onPress={toggleMode}
          activeOpacity={0.85}
        >
          {isCameraActive ? (
            <>
              <Box color="#FDE68A" size={16} />
              <Text style={styles.modeSwitchText}>3D Hall</Text>
            </>
          ) : (
            <>
              <Sparkles color="#34D399" size={16} />
              <Text style={styles.modeSwitchText}>AR View</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Surface Scanning Guidance Pill (Only while scanning surface in AR) ── */}
      {isCameraActive && arSurfaceState === 'SCANNING' && (
        <View pointerEvents="none" style={styles.scanGuidanceWrap}>
          <View style={styles.scanGuidanceCard}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${surfaceProgress}%` }]} />
            </View>
            <Text style={styles.scanGuidanceTitle}>Scanning Floor / Table Surface...</Text>
            <Text style={styles.scanGuidanceSub}>
              Point camera slightly downward at a flat surface or tap the green ring
            </Text>
          </View>
        </View>
      )}

      {/* ── Sleek Minimalist Bottom Dock (Only 3 Clean Actions) ── */}
      <View style={[styles.bottomDockWrap, { paddingBottom: Math.max(insets.bottom + 14, 24) }]}>
        <Text style={styles.gestureHintText}>
          {isCameraActive && arSurfaceState === 'SCANNING'
            ? 'Hold steady to anchor 3D animation on surface'
            : 'Drag to rotate • Pinch with 2 fingers to resize'}
        </Text>

        <View style={styles.glassCapsuleDock}>
          <TouchableOpacity
            style={styles.dockActionBtn}
            onPress={handleReset}
            activeOpacity={0.78}
          >
            <RefreshCw color="#E2E8F0" size={17} />
            <Text style={styles.dockActionLabel}>
              {isCameraActive ? 'Re-Anchor' : 'Reset View'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          <TouchableOpacity
            style={[styles.dockActionBtn, autoRotate && styles.dockActionBtnActive]}
            onPress={() => setAutoRotate(r => !r)}
            activeOpacity={0.78}
          >
            <RotateCw color={autoRotate ? '#34D399' : '#E2E8F0'} size={17} />
            <Text style={[styles.dockActionLabel, autoRotate && styles.dockActionLabelActive]}>
              Auto Orbit
            </Text>
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          <TouchableOpacity
            style={styles.dockActionBtn}
            onPress={() => setShowInfoModal(true)}
            activeOpacity={0.78}
          >
            <Info color="#FDE68A" size={17} />
            <Text style={styles.dockActionLabel}>Exhibit Info</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Museum Plaque Species Info Modal ── */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 20, 28) }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalMuseumTag}>NATIONAL MUSEUM ARCHIVE</Text>
                <Text style={styles.modalTitle}>{species.commonName}</Text>
                <Text style={styles.modalSciName}>{species.scientificName}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowInfoModal(false)}
              >
                <X color="#E2E8F0" size={18} />
              </TouchableOpacity>
            </View>

            <View style={styles.metaBadgesRow}>
              <View style={styles.metaPill}>
                <ShieldAlert color="#F87171" size={14} />
                <Text style={styles.metaPillText}>{species.conservationStatus}</Text>
              </View>
              <View style={styles.metaPill}>
                <MapPin color="#34D399" size={14} />
                <Text style={styles.metaPillText}>{species.mainHabitat}</Text>
              </View>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDesc}>{species.description}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181c24',
  },
  arBackground: {
    backgroundColor: '#000000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontFamily: FONTS.serif,
    fontSize: SIZES.large,
    color: COLORS.white,
    marginBottom: 16,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  glassCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStatusPill: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
  },
  speciesTitle: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotScanning: {
    backgroundColor: '#FBBF24',
  },
  statusDotLocked: {
    backgroundColor: '#10B981',
  },
  statusDotMuseum: {
    backgroundColor: '#E5C168',
  },
  statusSubText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.78)',
    letterSpacing: 0.3,
  },
  modeSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.4)',
  },
  modeSwitchPillMuseum: {
    borderColor: 'rgba(52, 211, 153, 0.45)',
  },
  modeSwitchText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  scanGuidanceWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 132,
    alignItems: 'center',
    zIndex: 15,
  },
  scanGuidanceCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 2,
  },
  scanGuidanceTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: '#A7F3D0',
    marginBottom: 2,
  },
  scanGuidanceSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
  },
  bottomDockWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  gestureHintText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.72)',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: ROUNDING.pill,
    marginBottom: 10,
    overflow: 'hidden',
  },
  glassCapsuleDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  dockActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  dockActionBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  dockActionLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: '#E2E8F0',
  },
  dockActionLabelActive: {
    color: '#34D399',
    fontFamily: FONTS.sansBold,
  },
  dockDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  permissionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 15, 26, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    zIndex: 30,
  },
  permissionCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },
  permissionTitle: {
    fontFamily: FONTS.serif,
    fontSize: 19,
    color: '#FFFFFF',
  },
  permissionDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  primaryActionButton: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    fontFamily: FONTS.sansBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  secondaryActionButton: {
    width: '100%',
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontFamily: FONTS.sansMedium,
    color: '#94A3B8',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#151C28',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(229, 193, 104, 0.35)',
    padding: 22,
    maxHeight: '62%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalMuseumTag: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: '#E5C168',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalSciName: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  metaPillText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: '#E2E8F0',
  },
  modalScroll: {
    marginTop: 4,
  },
  modalDesc: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
  },
});
