package com.echosofwild.app

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class NativeARModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "NativeAR"

    @ReactMethod
    fun launchAR(modelUrl: String, title: String, promise: Promise) {
        try {
            val sceneViewerUri = Uri.parse("https://arvr.google.com/scene-viewer/1.0").buildUpon()
                .appendQueryParameter("file", modelUrl)
                .appendQueryParameter("mode", "ar_only")
                .appendQueryParameter("title", title)
                .appendQueryParameter("resizable", "true")
                .build()

            // 1. Direct explicit package to Google Play Services for AR (ARCore)
            // Bypasses the "Open with" chooser popup completely
            try {
                val arCoreIntent = Intent(Intent.ACTION_VIEW, sceneViewerUri).apply {
                    setPackage("com.google.ar.core")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(arCoreIntent)
                promise.resolve(true)
                return
            } catch (e1: Exception) {
                // Continue to next package candidate
            }

            // 2. Direct package to Google Search app (Scene Viewer host)
            try {
                val googleIntent = Intent(Intent.ACTION_VIEW, sceneViewerUri).apply {
                    setPackage("com.google.android.googlequicksearchbox")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(googleIntent)
                promise.resolve(true)
                return
            } catch (e2: Exception) {
                // Continue to next candidate
            }

            // 3. Direct package to Chrome browser (Scene Viewer host)
            try {
                val chromeIntent = Intent(Intent.ACTION_VIEW, sceneViewerUri).apply {
                    setPackage("com.android.chrome")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(chromeIntent)
                promise.resolve(true)
                return
            } catch (e3: Exception) {
                // Continue to fallback
            }

            // 4. Fallback to general intent if no explicit handler accepted
            val fallbackIntent = Intent(Intent.ACTION_VIEW, sceneViewerUri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(fallbackIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AR_ERROR", e.message, e)
        }
    }

    /**
     * Fast native visual identification of the 3 target animal exhibits:
     * Leopard, Langur, and Pangolin based on color profile, shadow/contrast distribution,
     * and warm/cool saturation ratios.
     */
    @ReactMethod
    fun matchExhibit(base64Image: String, targetHint: String?, promise: Promise) {
        try {
            val cleanBase64 = if (base64Image.contains(",")) {
                base64Image.substringAfter(",")
            } else {
                base64Image
            }

            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val options = BitmapFactory.Options().apply {
                inSampleSize = 4 // Downsample for sub-10ms decoding
            }
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, options)
            if (bitmap == null) {
                promise.resolve(targetHint ?: "leopard")
                return
            }

            // Crop central 60% (inside scanner reticle)
            val startX = (bitmap.width * 0.2).toInt().coerceAtLeast(0)
            val startY = (bitmap.height * 0.2).toInt().coerceAtLeast(0)
            val cropW = (bitmap.width * 0.6).toInt().coerceAtMost(bitmap.width - startX)
            val cropH = (bitmap.height * 0.6).toInt().coerceAtMost(bitmap.height - startY)

            var sumR = 0L
            var sumG = 0L
            var sumB = 0L
            var darkCount = 0
            var brightWarmCount = 0
            var totalPixels = 0

            // Sample every 2nd pixel
            for (y in startY until (startY + cropH) step 2) {
                for (x in startX until (startX + cropW) step 2) {
                    val pixel = bitmap.getPixel(x, y)
                    val r = (pixel shr 16) and 0xff
                    val g = (pixel shr 8) and 0xff
                    val b = pixel and 0xff
                    sumR += r
                    sumG += g
                    sumB += b
                    val lum = 0.299 * r + 0.587 * g + 0.114 * b
                    if (lum < 40) darkCount++
                    if (r > 120 && r > b * 1.25) brightWarmCount++
                    totalPixels++
                }
            }

            if (totalPixels == 0) {
                promise.resolve(targetHint ?: "leopard")
                return
            }

            val meanR = sumR.toDouble() / totalPixels
            val meanB = sumB.toDouble() / totalPixels
            val rB = meanR / (meanB + 0.001)
            val darkFrac = darkCount.toDouble() / totalPixels
            val brightWarmFrac = brightWarmCount.toDouble() / totalPixels

            val matched = when {
                brightWarmFrac > 0.35 || (meanR > 130 && rB > 1.30) -> "pangolin"
                darkFrac > 0.20 || (meanR < 90 && brightWarmFrac < 0.06) -> "langur"
                else -> "leopard"
            }

            promise.resolve(matched)
        } catch (e: Exception) {
            promise.resolve(targetHint ?: "leopard")
        }
    }
}
