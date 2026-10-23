import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONTS, SIZES, ROUNDING } from '../../constants/theme';
import speciesData from '../../data/species.json';
import { Model3DViewer } from '../../components/Model3DViewer';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  X,
  Camera,
  Box,
  Plus,
  Minus,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Info,
  Sliders,
  Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getModelRequire } from '../../utils/modelPreloader';
import { launchTrueAR } from '../../utils/arCoreLauncher';

export default function ViewerScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  // useLocalSearchParams can return string | string[] — normalise to string
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const initialMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;

  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Mode: AR (camera background) or Studio (3D dark background)
  const [isAR, setIsAR] = useState(initialMode !== 'studio');
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);

  // Surface detection pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Short delay before mounting CameraView to give Android Camera HAL
  // time to release any previous camera session cleanly.
  useEffect(() => {
    const timer = setTimeout(() => {
      setCameraReady(true);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.14,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Transformations
  const [scaleMultiplier, setScaleMultiplier] = useState(1.0);
  const [rotationY, setRotationY] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const cleanId = (id || '').trim().toLowerCase();
  const species = speciesData.find(
    s =>
      s.id.toLowerCase() === cleanId ||
      s.commonName.toLowerCase() === cleanId ||
      s.modelUrl.toLowerCase().includes(cleanId) ||
      cleanId.includes(s.id.toLowerCase())
  );

  // Request camera permission if AR is requested and permission isn't granted yet
  useEffect(() => {
    if (isAR && permission && !permission.granted) {
      requestPermission();
    }
  }, [isAR, permission, requestPermission]);

  if (!species) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Species not found</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X color={COLORS.white} size={24} />
        </TouchableOpacity>
      </View>
    );
  }

  const modelRequire = getModelRequire(species.modelUrl || species.id);

  const handleZoomIn = () => {
    setScaleMultiplier(prev => Math.min(Number((prev + 0.2).toFixed(1)), 3.0));
  };

  const handleZoomOut = () => {
    setScaleMultiplier(prev => Math.max(Number((prev - 0.2).toFixed(1)), 0.4));
  };

  const handleRotateCcw = () => {
    setRotationY(prev => prev - Math.PI / 6);
  };

  const handleRotateCw = () => {
    setRotationY(prev => prev + Math.PI / 6);
  };

  const handleReset = () => {
    setScaleMultiplier(1.0);
    setRotationY(0);
    setAutoRotate(false);
  };

  const toggleMode = () => {
    const nextAR = !isAR;
    setIsAR(nextAR);
    if (nextAR && permission && !permission.granted) {
      requestPermission();
    }
  };

  const handleLaunchARCore = () => {
    Alert.alert(
      '🌟 Place on Floor / Table',
      `To view ${species.commonName} anchored in real life:\n\n1. Select "Google Play Services for AR"\n2. Check "Remember my choice"\n3. Point your camera at the floor or table to place the animal!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => launchTrueAR(species.id, species.commonName),
        },
      ]
    );
  };

  const isCameraActive = isAR && Boolean(permission?.granted) && cameraReady;

  return (
    <View style={[styles.container, isCameraActive && styles.arBackground]}>
      {/* ── AR Camera Background (underneath 3D canvas) ── */}
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
            <Camera color={COLORS.status.vulnerable} size={40} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionDesc}>
              Echoes needs your camera to render {species.commonName} in Augmented Reality.
            </Text>
            <TouchableOpacity style={styles.primaryActionButton} onPress={requestPermission}>
              <Text style={styles.primaryActionText}>Enable Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => setIsAR(false)}>
              <Text style={styles.secondaryActionText}>Switch to 3D Studio Mode</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Surface Detection Indicator in AR mode ── */}
      {isCameraActive && (
        <View pointerEvents="none" style={styles.surfaceIndicatorContainer}>
          <Animated.View style={[styles.surfaceReticle, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.surfaceReticleInner} />
          </Animated.View>
          <View style={styles.surfaceShadowBlob} />
        </View>
      )}

      {/* ── 3D Model Canvas ── */}
      {modelRequire !== null ? (
        <Model3DViewer
          speciesId={species.id}
          modelRequire={modelRequire}
          isAR={isCameraActive}
          scaleMultiplier={scaleMultiplier}
          rotationY={rotationY}
          autoRotate={autoRotate}
        />
      ) : (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={styles.errorText}>🦅</Text>
          <Text style={styles.errorSubtext}>3D model coming soon</Text>
        </View>
      )}

      {/* ── Overlaid Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <X color={COLORS.white} size={22} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{species.commonName}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.modeBadge, isCameraActive ? styles.modeBadgeAR : styles.modeBadgeStudio]}>
              <Text style={styles.modeBadgeText}>
                {isCameraActive ? '📷 AR CAMERA MODE' : '🪐 3D STUDIO'}
              </Text>
            </View>
          </View>
        </View>

        {/* Toggle Mode Button: AR <-> 3D Studio */}
        <TouchableOpacity
          style={[styles.circleButton, isCameraActive && styles.activeModeButton]}
          onPress={toggleMode}
          accessibilityLabel="Toggle AR / Studio mode"
        >
          {isCameraActive ? (
            <Box color={COLORS.white} size={20} />
          ) : (
            <Camera color={COLORS.white} size={20} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Floating AR Surface Detection Launch Banner ── */}
      {isCameraActive && (
        <View style={[styles.floatingArBanner, { top: Math.max(insets.top + 76, 92) }]}>
          <TouchableOpacity
            style={styles.floatingArButton}
            onPress={handleLaunchARCore}
            activeOpacity={0.85}
          >
            <Sparkles color="#FCD34D" size={18} />
            <View style={styles.floatingArTextWrap}>
              <Text style={styles.floatingArTitle}>Detect Floor / Table (True AR)</Text>
              <Text style={styles.floatingArSubtitle}>Tap to scan & anchor on your real surface</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom HUD: Controls & Gestures ── */}
      <View style={[styles.hudContainer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
        {showControls ? (
          <View style={styles.hudCard}>
            {/* Direct ARCore Surface Launch Button */}
            <TouchableOpacity
              style={styles.arCoreLaunchButton}
              onPress={handleLaunchARCore}
              activeOpacity={0.85}
            >
              <Sparkles color={COLORS.white} size={16} />
              <Text style={styles.arCoreLaunchText}>Place on Floor / Table (ARCore)</Text>
            </TouchableOpacity>

            {/* Scale Bar */}
            <View style={styles.controlRow}>
              <Text style={styles.controlSectionLabel}>SCALE</Text>
              <View style={styles.scaleControls}>
                <TouchableOpacity
                  style={styles.hudButton}
                  onPress={handleZoomOut}
                  disabled={scaleMultiplier <= 0.4}
                >
                  <Minus color={scaleMultiplier <= 0.4 ? 'rgba(255,255,255,0.3)' : COLORS.white} size={18} />
                </TouchableOpacity>

                <View style={styles.scaleDisplay}>
                  <Text style={styles.scaleText}>{Math.round(scaleMultiplier * 100)}%</Text>
                </View>

                <TouchableOpacity
                  style={styles.hudButton}
                  onPress={handleZoomIn}
                  disabled={scaleMultiplier >= 3.0}
                >
                  <Plus color={scaleMultiplier >= 3.0 ? 'rgba(255,255,255,0.3)' : COLORS.white} size={18} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Rotation & Reset Row */}
            <View style={[styles.controlRow, { marginTop: 10 }]}>
              <Text style={styles.controlSectionLabel}>ROTATE</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.hudButton}
                  onPress={handleRotateCcw}
                  accessibilityLabel="Rotate counter-clockwise"
                >
                  <RotateCcw color={COLORS.white} size={18} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.hudButton, autoRotate && styles.activeHudButton]}
                  onPress={() => setAutoRotate(prev => !prev)}
                  accessibilityLabel="Toggle auto rotate"
                >
                  <RefreshCw color={autoRotate ? COLORS.white : 'rgba(255,255,255,0.8)'} size={18} />
                  <Text style={[styles.hudButtonSubtext, autoRotate && styles.activeHudButtonText]}>Auto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.hudButton}
                  onPress={handleRotateCw}
                  accessibilityLabel="Rotate clockwise"
                >
                  <RotateCw color={COLORS.white} size={18} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.hudButton, styles.resetButton]}
                  onPress={handleReset}
                  accessibilityLabel="Reset scale and rotation"
                >
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Link to Species Fact Sheet */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.factButton}
                onPress={() => router.push(`/species/${species.id}`)}
              >
                <Info color={COLORS.status.vulnerable} size={16} />
                <Text style={styles.factButtonText}>View Species Fact Sheet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleHudButton}
                onPress={() => setShowControls(false)}
              >
                <Text style={styles.toggleHudText}>Hide</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.showHudPill}
            onPress={() => setShowControls(true)}
          >
            <Sliders color={COLORS.white} size={16} />
            <Text style={styles.showHudText}>Show Controls</Text>
          </TouchableOpacity>
        )}

        {/* Gesture Hint Pill */}
        <View pointerEvents="none" style={styles.hintContainer}>
          <Text style={styles.hintText}>Pinch to zoom · 1-finger drag to rotate 360°</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  arBackground: {
    backgroundColor: 'transparent',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: SIZES.large,
    color: COLORS.white,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ROUNDING.pill,
  },
  modeBadgeAR: {
    backgroundColor: 'rgba(46, 125, 50, 0.7)',
  },
  modeBadgeStudio: {
    backgroundColor: 'rgba(150, 110, 40, 0.7)',
  },
  modeBadgeText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: COLORS.white,
    letterSpacing: 1,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeModeButton: {
    backgroundColor: COLORS.status.vulnerable,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  surfaceIndicatorContainer: {
    position: 'absolute',
    top: '52%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  surfaceReticle: {
    width: 130,
    height: 60,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'rgba(252, 211, 77, 0.65)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  surfaceReticleInner: {
    width: 14,
    height: 7,
    borderRadius: 7,
    backgroundColor: 'rgba(252, 211, 77, 0.85)',
  },
  surfaceShadowBlob: {
    width: 180,
    height: 36,
    borderRadius: 90,
    backgroundColor: 'rgba(0,0,0,0.45)',
    marginTop: -20,
  },
  floatingArBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  floatingArButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 48, 28, 0.92)',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    gap: 12,
  },
  floatingArTextWrap: {
    flex: 1,
  },
  floatingArTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  floatingArSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  hudContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 16,
  },
  hudCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  arCoreLaunchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E6F38',
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  arCoreLaunchText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlSectionLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    width: 60,
  },
  scaleControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  scaleDisplay: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ROUNDING.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  scaleText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    color: COLORS.white,
  },
  buttonGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  hudButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeHudButton: {
    backgroundColor: COLORS.status.vulnerable,
  },
  hudButtonSubtext: {
    fontFamily: FONTS.sansBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    marginTop: -2,
  },
  activeHudButtonText: {
    color: COLORS.white,
  },
  resetButton: {
    width: 'auto',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  resetButtonText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  factButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  factButtonText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    color: COLORS.status.vulnerable,
  },
  toggleHudButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleHudText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  showHudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: ROUNDING.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  showHudText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: COLORS.white,
  },
  hintContainer: {
    marginTop: 8,
  },
  hintText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  permissionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 5,
    backgroundColor: '#121212',
  },
  permissionCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  permissionTitle: {
    fontFamily: FONTS.serif,
    fontSize: SIZES.large,
    color: COLORS.white,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontFamily: FONTS.sans,
    fontSize: SIZES.small,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryActionButton: {
    width: '100%',
    backgroundColor: COLORS.status.vulnerable,
    paddingVertical: 14,
    borderRadius: ROUNDING.pill,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryActionText: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: COLORS.white,
  },
  secondaryActionButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: ROUNDING.pill,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  secondaryActionText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  errorText: {
    color: COLORS.white,
    fontFamily: FONTS.serif,
    fontSize: SIZES.large,
    marginBottom: 8,
  },
  errorSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: FONTS.sansMedium,
    fontSize: SIZES.medium,
  },
});
