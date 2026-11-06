import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { VIEWER_HTML } from '../assets/viewer/viewerHtml';
import { Model3DViewerProps } from './Model3DViewer';

const { NativeAR } = NativeModules;

export function Model3DViewer({
  speciesId,
  isAR = false,
  scaleMultiplier = 1,
  rotationY = 0,
  autoRotate = false,
  soundEnabled = true,
  resetCounter = 0,
  depthStep,
  animalCallCounter = 0,
  onARStatusChange,
}: Model3DViewerProps) {
  const webViewRef = useRef<WebView>(null);

  const handleLoadEnd = () => {
    if (!webViewRef.current) return;

    webViewRef.current.injectJavaScript(`
      window.setSoundEnabled(${soundEnabled ? 'true' : 'false'});
      window.showSpecies("${speciesId || 'leopard'}");
      window.setBackgroundMode(${isAR ? 'true' : 'false'});
      window.setScaleMultiplier(${scaleMultiplier});
      window.setRotationY(${rotationY});
      window.setAutoRotate(${autoRotate ? 'true' : 'false'});
      true;
    `);
  };

  useEffect(() => {
    if (!isAR) {
      NativeAR?.stopARTracking?.().catch(() => {});
      return;
    }

    NativeAR?.startARTracking?.().catch(() => {});
    const sub = DeviceEventEmitter.addListener('onARPoseUpdate', (data) => {
      if (!webViewRef.current || !data) return;
      const p = Number(data.pitch || 0).toFixed(4);
      const r = Number(data.roll || 0).toFixed(4);
      const y = Number(data.yaw || 0).toFixed(4);
      const s = Number(data.stability ?? 0.85).toFixed(3);
      webViewRef.current.injectJavaScript(`
        if (window.onNativeSensor) window.onNativeSensor(${p}, ${r}, ${y}, ${s});
        true;
      `);
    });

    return () => {
      sub.remove();
      NativeAR?.stopARTracking?.().catch(() => {});
    };
  }, [isAR]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`
      if (window.setScaleMultiplier) window.setScaleMultiplier(${scaleMultiplier});
      true;
    `);
  }, [scaleMultiplier]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`
      if (window.setRotationY) window.setRotationY(${rotationY});
      true;
    `);
  }, [rotationY]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`
      if (window.setAutoRotate) window.setAutoRotate(${autoRotate ? 'true' : 'false'});
      true;
    `);
  }, [autoRotate]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`
      if (window.setSoundEnabled) window.setSoundEnabled(${soundEnabled ? 'true' : 'false'});
      true;
    `);
  }, [soundEnabled]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`
      if (window.setBackgroundMode) window.setBackgroundMode(${isAR ? 'true' : 'false'});
      true;
    `);
  }, [isAR]);

  useEffect(() => {
    if (resetCounter > 0) {
      webViewRef.current?.injectJavaScript(`
        if (window.resetARSurface) window.resetARSurface();
        true;
      `);
    }
  }, [resetCounter]);

  useEffect(() => {
    if (depthStep && depthStep.seq > 0) {
      webViewRef.current?.injectJavaScript(`
        if (window.moveAnimalDepth) window.moveAnimalDepth(${depthStep.deltaZ});
        true;
      `);
    }
  }, [depthStep]);

  useEffect(() => {
    if (animalCallCounter > 0) {
      webViewRef.current?.injectJavaScript(`
        if (window.triggerAnimalCall) window.triggerAnimalCall();
        true;
      `);
    }
  }, [animalCallCounter]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === 'AR_STATUS' && onARStatusChange) {
        onARStatusChange(payload.state, Number(payload.progress || 0));
      }
    } catch {
      // Ignore non-JSON messages
    }
  };

  return (
    <View style={[styles.container, isAR && styles.transparentContainer]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: VIEWER_HTML }}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        style={[styles.webView, isAR && styles.transparentWebView]}
        containerStyle={[styles.container, isAR && styles.transparentContainer]}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        androidLayerType={Platform.OS === 'android' && isAR ? 'none' : 'hardware'}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131922',
  },
  transparentContainer: {
    backgroundColor: 'transparent',
  },
  webView: {
    flex: 1,
    backgroundColor: '#131922',
  },
  transparentWebView: {
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
});
