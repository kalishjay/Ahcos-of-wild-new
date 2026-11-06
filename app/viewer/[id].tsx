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
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Compass,
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

  const [arSurfaceState, setArSurfaceState] = useState<'SCANNING' | 'LOCKED'>('SCANNING');
  const [surfaceProgress, setSurfaceProgress] = useState(0);

  // Viewer Controls
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);
  const [depthStep, setDepthStep] = useState<{ seq: number; deltaZ: number }>({ seq: 0, deltaZ: 0 });
  const [animalCallCounter, setAnimalCallCounter] = useState(0);
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

  const handleMoveForward = () => {
    Vibration.vibrate(18);
    setDepthStep(prev => ({ seq: prev.seq + 1, deltaZ: 0.38 }));
  };

  const handleMoveBackward = () => {
    Vibration.vibrate(18);
    setDepthStep(prev => ({ seq: prev.seq + 1, deltaZ: -0.38 }));
  };

  const handleTriggerCall = () => {
    if (!soundEnabled) setSoundEnabled(true);
    setAnimalCallCounter(c => c + 1);
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
            <Camera color="#D4AF37" size={38} />
            <Text style={styles.permissionTitle}>Expedition Camera Access</Text>
            <Text style={styles.permissionDesc}>
              Enable camera access to detect real-world surfaces and anchor {species.commonName} in AR.
            </Text>
            <TouchableOpacity style={styles.primaryActionButton} onPress={requestPermission}>
              <Text style={styles.primaryActionText}>Enable Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => setIsAR(false)}>
              <Text style={styles.secondaryActionText}>Enter 3D Museum Hall</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── 3D Surface AR & Adventure Museum Hall Canvas ── */}
      {modelRequire !== null ? (
        <Model3DViewer
          speciesId={species.id}
          modelRequire={modelRequire}
          isAR={isCameraActive}
          autoRotate={autoRotate}
          soundEnabled={soundEnabled}
          resetCounter={resetCounter}
          depthStep={depthStep}
          animalCallCounter={animalCallCounter}
          onARStatusChange={handleARStatusChange}
        />
      ) : (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={styles.errorText}>3D Exhibit Unavailable</Text>
        </View>
      )}

      {/* ── Adventure + Museum Top Header Bar (with Sound On/Off Button) ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 22) }]}>
        <TouchableOpacity
          style={styles.glassCircleBtn}
          onPress={() => router.back()}
          accessibilityLabel="Close Viewer"
        >
          <X color="#FDE68A" size={20} />
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
                ? 'Expedition Museum Hall'
                : arSurfaceState === 'LOCKED'
                ? 'AR Surface Locked'
                : `Scanning Surface ${surfaceProgress}%`}
            </Text>
          </View>
        </View>

        {/* Top Right Controls: Sound On/Off Toggle + AR/3D Mode Switch */}
        <View style={styles.topRightRow}>
          <TouchableOpacity
            style={[styles.soundToggleBtn, !soundEnabled && styles.soundToggleBtnMuted]}
            onPress={() => setSoundEnabled(s => !s)}
            activeOpacity={0.8}
            accessibilityLabel={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {soundEnabled ? (
              <Volume2 color="#FDE68A" size={18} />
            ) : (
              <VolumeX color="#94A3B8" size={18} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeSwitchPill, !isCameraActive && styles.modeSwitchPillMuseum]}
            onPress={toggleMode}
            activeOpacity={0.85}
          >
            {isCameraActive ? (
              <>
                <Box color="#FDE68A" size={15} />
                <Text style={styles.modeSwitchText}>3D Hall</Text>
              </>
            ) : (
              <>
                <Sparkles color="#34D399" size={15} />
                <Text style={styles.modeSwitchText}>AR View</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Surface Scanning Guidance Pill (Only while scanning surface in AR) ── */}
      {isCameraActive && arSurfaceState === 'SCANNING' && (
        <View pointerEvents="none" style={styles.scanGuidanceWrap}>
          <View style={styles.scanGuidanceCard}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${surfaceProgress}%` }]} />
            </View>
            <Text style={styles.scanGuidanceTitle}>Detecting Real Floor / Table Surface...</Text>
            <Text style={styles.scanGuidanceSub}>
              Aim camera slightly downward at a flat surface or tap the compass ring
            </Text>
          </View>
        </View>
      )}

      {/* ── AR Forward / Backward Surface Movement Buttons (Visible when AR Surface is Locked) ── */}
      {isCameraActive && arSurfaceState === 'LOCKED' && (
        <View style={styles.arDepthControlsWrap}>
          <View style={styles.arDepthHeader}>
            <Compass color="#D4AF37" size={12} />
            <Text style={styles.arDepthLabel}>POSITION</Text>
          </View>

          <TouchableOpacity
            style={styles.arDepthBtn}
            onPress={handleMoveBackward}
            activeOpacity={0.78}
          >
            <ChevronUp color="#FDE68A" size={18} />
            <Text style={styles.arDepthBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.arDepthDivider} />

          <TouchableOpacity
            style={styles.arDepthBtn}
            onPress={handleMoveForward}
            activeOpacity={0.78}
          >
            <ChevronDown color="#34D399" size={18} />
            <Text style={styles.arDepthBtnText}>Front</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Adventure + Museum Bottom Dock ── */}
      <View style={[styles.bottomDockWrap, { paddingBottom: Math.max(insets.bottom + 14, 24) }]}>
        <Text style={styles.gestureHintText}>
          {isCameraActive && arSurfaceState === 'SCANNING'
            ? 'Hold phone steady towards floor to anchor exhibit'
            : 'Drag to rotate • Pinch to resize • Sound active'}
        </Text>

        <View style={styles.glassCapsuleDock}>
          <TouchableOpacity
            style={styles.dockActionBtn}
            onPress={handleReset}
            activeOpacity={0.78}
          >
            <RefreshCw color="#FDE68A" size={16} />
            <Text style={styles.dockActionLabel}>
              {isCameraActive ? 'Re-Anchor' : 'Reset'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          <TouchableOpacity
            style={[styles.dockActionBtn, autoRotate && styles.dockActionBtnActive]}
            onPress={() => setAutoRotate(r => !r)}
            activeOpacity={0.78}
          >
            <RotateCw color={autoRotate ? '#34D399' : '#E2E8F0'} size={16} />
            <Text style={[styles.dockActionLabel, autoRotate && styles.dockActionLabelActive]}>
              Orbit
            </Text>
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          <TouchableOpacity
            style={styles.dockActionBtn}
            onPress={handleTriggerCall}
            activeOpacity={0.78}
          >
            <Volume2 color="#34D399" size={16} />
            <Text style={styles.dockActionLabel}>Roar / Call</Text>
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          <TouchableOpacity
            style={styles.dockActionBtn}
            onPress={() => setShowInfoModal(true)}
            activeOpacity={0.78}
          >
            <Info color="#FDE68A" size={16} />
            <Text style={styles.dockActionLabel}>Lore</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Expedition Archive Species Info Modal ── */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 20, 28) }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.modalMuseumTag}>CEYLON WILDLIFE EXPEDITION ARCHIVE</Text>
                <Text style={styles.modalTitle}>{species.commonName}</Text>
                <Text style={styles.modalSciName}>{species.scientificName}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowInfoModal(false)}
              >
                <X color="#FDE68A" size={18} />
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
    backgroundColor: '#131922',
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
    paddingHorizontal: 14,
    zIndex: 20,
  },
  glassCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStatusPill: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    alignItems: 'center',
  },
  speciesTitle: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotScanning: {
    backgroundColor: '#FBBF24',
  },
  statusDotLocked: {
    backgroundColor: '#10B981',
  },
  statusDotMuseum: {
    backgroundColor: '#D4AF37',
  },
  statusSubText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10,
    color: '#FDE68A',
    letterSpacing: 0.3,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  soundToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundToggleBtnMuted: {
    borderColor: 'rgba(148, 163, 184, 0.3)',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  modeSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  modeSwitchPillMuseum: {
    borderColor: 'rgba(52, 211, 153, 0.55)',
  },
  modeSwitchText: {
    fontFamily: FONTS.sansBold,
    fontSize: 11,
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
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
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
    color: '#FDE68A',
    marginBottom: 2,
  },
  scanGuidanceSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
  },
  arDepthControlsWrap: {
    position: 'absolute',
    right: 16,
    bottom: 136,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  arDepthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  arDepthLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 8,
    color: '#D4AF37',
    letterSpacing: 0.8,
  },
  arDepthBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  arDepthBtnText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: '#F8FAFC',
    marginTop: 1,
  },
  arDepthDivider: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.28)',
    marginVertical: 3,
  },
  bottomDockWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  gestureHintText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: '#FDE68A',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: ROUNDING.pill,
    marginBottom: 10,
    overflow: 'hidden',
  },
  glassCapsuleDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.48)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  dockActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  dockActionBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  dockActionLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: '#F8FAFC',
  },
  dockActionLabelActive: {
    color: '#34D399',
    fontFamily: FONTS.sansBold,
  },
  dockDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
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
    backgroundColor: '#172030',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    gap: 12,
  },
  permissionTitle: {
    fontFamily: FONTS.serif,
    fontSize: 19,
    color: '#FDE68A',
  },
  permissionDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
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
    color: '#FDE68A',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#131B28',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    padding: 22,
    maxHeight: '64%',
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
    color: '#D4AF37',
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
    color: '#6EE7B7',
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
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
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  metaPillText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: '#FDE68A',
  },
  modalScroll: {
    marginTop: 4,
  },
  modalDesc: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
});
