import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { VIEWER_HTML } from '../assets/viewer/viewerHtml';

export interface Model3DViewerProps {
  modelRequire?: number;
  speciesId?: string;
  isAR?: boolean;
  scaleMultiplier?: number;
  rotationY?: number;
  autoRotate?: boolean;
}

export function Model3DViewer({
  speciesId,
  isAR = false,
  scaleMultiplier = 1,
  rotationY = 0,
  autoRotate = false,
}: Model3DViewerProps) {
  const webViewRef = useRef<WebView>(null);

  const handleLoadEnd = () => {
    if (!webViewRef.current) return;

    // Instantly renders the embedded model from HTML memory — 0ms, 100% offline
    webViewRef.current.injectJavaScript(`
      window.setBackgroundMode(${isAR ? 'true' : 'false'});
      window.showSpecies("${speciesId || 'leopard'}");
      window.setScaleMultiplier(${scaleMultiplier});
      window.setRotationY(${rotationY});
      window.setAutoRotate(${autoRotate ? 'true' : 'false'});
      true;
    `);
  };

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
      if (window.setBackgroundMode) window.setBackgroundMode(${isAR ? 'true' : 'false'});
      true;
    `);
  }, [isAR]);

  return (
    <View style={[styles.container, isAR && styles.transparentContainer]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: VIEWER_HTML }}
        onLoadEnd={handleLoadEnd}
        style={[styles.webView, isAR && styles.transparentWebView]}
        containerStyle={[styles.container, isAR && styles.transparentContainer]}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
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
    backgroundColor: '#1a1a1a',
  },
  transparentContainer: {
    backgroundColor: 'transparent',
  },
  webView: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  transparentWebView: {
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
});
