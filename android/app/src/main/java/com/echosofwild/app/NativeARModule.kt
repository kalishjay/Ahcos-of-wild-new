package com.echosofwild.app

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

class NativeARModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    override fun getName(): String = "NativeAR"

    private var sensorManager: SensorManager? = null
    private var rotationSensor: Sensor? = null
    private var accelSensor: Sensor? = null
    private var isTracking = false

    private val rotationMatrix = FloatArray(9)
    private val orientationAngles = FloatArray(3)
    private var initialYaw: Float? = null
    private var smoothPitch = 0f
    private var smoothRoll = 0f
    private var smoothYaw = 0f
    private var accelVariance = 0f
    private var lastAccelMag = 9.81f
    private var lastEmitTime = 0L

    // Precomputed reference feature vectors for the 3 target photos
    private data class RefTemplate(
        val species: String,
        val vec: FloatArray
    )

    private val referenceTemplates = mutableListOf<RefTemplate>()
    private var templatesLoaded = false

    @Synchronized
    private fun ensureTemplatesLoaded() {
        if (templatesLoaded) return
        templatesLoaded = true
        val targets = mapOf(
            "leopard" to "targets/leopard.jpg",
            "langur" to "targets/langur.jpg",
            "pangolin" to "targets/pangolin.jpg"
        )
        for ((species, assetPath) in targets) {
            try {
                reactContext.assets.open(assetPath).use { stream ->
                    val bmp = BitmapFactory.decodeStream(stream)
                    if (bmp != null) {
                        // Add 0, 90, 180, 270 degree rotations to be 100% immune to camera EXIF orientation
                        for (angle in listOf(0f, 90f, 180f, 270f)) {
                            val rotated = if (angle == 0f) bmp else rotateBitmap(bmp, angle)
                            val w = rotated.width
                            val h = rotated.height
                            // Full, 88% crop, 76% crop, and center square crop
                            val crops = mutableListOf<Bitmap>()
                            crops.add(rotated)
                            crops.add(
                                Bitmap.createBitmap(
                                    rotated,
                                    (w * 0.06f).toInt(),
                                    (h * 0.06f).toInt(),
                                    (w * 0.88f).toInt(),
                                    (h * 0.88f).toInt()
                                )
                            )
                            crops.add(
                                Bitmap.createBitmap(
                                    rotated,
                                    (w * 0.12f).toInt(),
                                    (h * 0.12f).toInt(),
                                    (w * 0.76f).toInt(),
                                    (h * 0.76f).toInt()
                                )
                            )
                            val s = min(w, h)
                            crops.add(
                                Bitmap.createBitmap(
                                    rotated,
                                    (w - s) / 2,
                                    (h - s) / 2,
                                    s,
                                    s
                                )
                            )
                            for (c in crops) {
                                val feat = extractSpatialFeatures(c, isReference = true)
                                if (feat != null) {
                                    referenceTemplates.add(RefTemplate(species, feat.vec))
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore individual asset error
            }
        }
    }

    private fun rotateBitmap(source: Bitmap, angle: Float): Bitmap {
        val matrix = Matrix()
        matrix.postRotate(angle)
        return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
    }

    private data class FeatureResult(
        val vec: FloatArray,
        val meanR: Float,
        val meanG: Float,
        val meanB: Float,
        val lumStd: Float,
        val darkFrac: Float,
        val warmFrac: Float,
        val edgeRatio: Float
    )

    private fun normZeroMean(arr: FloatArray): FloatArray {
        var sum = 0f
        for (v in arr) sum += v
        val mean = sum / arr.size
        var normSq = 0f
        val out = FloatArray(arr.size)
        for (i in arr.indices) {
            val d = arr[i] - mean
            out[i] = d
            normSq += d * d
        }
        val norm = sqrt(normSq)
        if (norm < 1e-4f) return FloatArray(arr.size)
        for (i in out.indices) {
            out[i] /= norm
        }
        return out
    }

    private fun extractSpatialFeatures(bmp: Bitmap, isReference: Boolean = false): FeatureResult? {
        val scaled = Bitmap.createScaledBitmap(bmp, 64, 64, true)
        val pixels = IntArray(64 * 64)
        scaled.getPixels(pixels, 0, 64, 0, 0, 64, 64)

        val rArr = FloatArray(64 * 64)
        val gArr = FloatArray(64 * 64)
        val bArr = FloatArray(64 * 64)
        val lumArr = FloatArray(64 * 64)

        var sumR = 0f
        var sumG = 0f
        var sumB = 0f
        var sumLum = 0f
        var darkCount = 0
        var warmCount = 0

        for (i in pixels.indices) {
            val p = pixels[i]
            val r = ((p shr 16) and 0xff).toFloat()
            val g = ((p shr 8) and 0xff).toFloat()
            val b = (p and 0xff).toFloat()
            val lum = 0.299f * r + 0.587f * g + 0.114f * b
            rArr[i] = r
            gArr[i] = g
            bArr[i] = b
            lumArr[i] = lum
            sumR += r
            sumG += g
            sumB += b
            sumLum += lum
            if (lum < 48f) darkCount++
            if (r > 110f && r > b * 1.22f && r > g * 1.05f) warmCount++
        }

        val n = 64f * 64f
        val meanR = sumR / n
        val meanG = sumG / n
        val meanB = sumB / n
        val meanLum = sumLum / n

        var varLum = 0f
        for (i in lumArr.indices) {
            val d = lumArr[i] - meanLum
            varLum += d * d
        }
        val lumStd = sqrt(varLum / n)

        // Reject flat walls, blank floors, dark rooms, solid surfaces
        if (!isReference && lumStd < 16.5f) {
            return null
        }

        // 8x8 spatial grids
        val gridLum = FloatArray(64)
        val gridRG = FloatArray(64)
        val gridRB = FloatArray(64)
        val gridGB = FloatArray(64)
        val gridEdge = FloatArray(64)

        var totalEdge = 0f

        for (gy in 0 until 8) {
            for (gx in 0 until 8) {
                var sLum = 0f
                var sRG = 0f
                var sRB = 0f
                var sGB = 0f
                var sEdge = 0f
                for (py in 0 until 8) {
                    val y = gy * 8 + py
                    for (px in 0 until 8) {
                        val x = gx * 8 + px
                        val idx = y * 64 + x
                        val r = rArr[idx]
                        val g = gArr[idx]
                        val b = bArr[idx]
                        val l = lumArr[idx] + 25f
                        sLum += lumArr[idx]
                        sRG += (r - g) / l
                        sRB += (r - b) / l
                        sGB += (g - b) / l

                        if (x < 63 && y < 63) {
                            val dx = abs(lumArr[idx + 1] - lumArr[idx])
                            val dy = abs(lumArr[idx + 64] - lumArr[idx])
                            sEdge += (dx + dy)
                        }
                    }
                }
                val gIdx = gy * 8 + gx
                gridLum[gIdx] = sLum / 64f
                gridRG[gIdx] = sRG / 64f
                gridRB[gIdx] = sRB / 64f
                gridGB[gIdx] = sGB / 64f
                gridEdge[gIdx] = sEdge / 64f
                totalEdge += gridEdge[gIdx]
            }
        }

        // Check chroma spatial variation so monochrome surfaces (wood table, grey wall) are rejected
        var rgMean = 0f
        var gbMean = 0f
        for (i in 0 until 64) {
            rgMean += gridRG[i]
            gbMean += gridGB[i]
        }
        rgMean /= 64f
        gbMean /= 64f
        var rgVar = 0f
        var gbVar = 0f
        for (i in 0 until 64) {
            rgVar += (gridRG[i] - rgMean) * (gridRG[i] - rgMean)
            gbVar += (gridGB[i] - gbMean) * (gridGB[i] - gbMean)
        }
        val rgStd = sqrt(rgVar / 64f)
        val gbStd = sqrt(gbVar / 64f)
        if (!isReference && rgStd < 0.022f && gbStd < 0.022f) {
            return null
        }

        val nLum = normZeroMean(gridLum)
        val nRG = normZeroMean(gridRG)
        val nRB = normZeroMean(gridRB)
        val nGB = normZeroMean(gridGB)
        val nEdge = normZeroMean(gridEdge)

        val combined = FloatArray(64 * 5)
        for (i in 0 until 64) {
            combined[i] = nLum[i] * 0.30f
            combined[64 + i] = nRG[i] * 0.22f
            combined[128 + i] = nRB[i] * 0.20f
            combined[192 + i] = nGB[i] * 0.13f
            combined[256 + i] = nEdge[i] * 0.15f
        }

        var cNormSq = 0f
        for (v in combined) cNormSq += v * v
        val cNorm = sqrt(cNormSq) + 1e-6f
        for (i in combined.indices) combined[i] /= cNorm

        val edgeRatio = (totalEdge / 64f) / (lumStd + 1e-5f)

        return FeatureResult(
            vec = combined,
            meanR = meanR,
            meanG = meanG,
            meanB = meanB,
            lumStd = lumStd,
            darkFrac = darkCount / n,
            warmFrac = warmCount / n,
            edgeRatio = edgeRatio
        )
    }

    private fun passesSpeciesSanityCheck(species: String, f: FeatureResult): Boolean {
        return when (species) {
            "pangolin" -> {
                // Pangolin photo has warm reddish-brown scales and soil (R > G > B) and high warm pixel fraction
                (f.meanR > f.meanB + 12f) && (f.warmFrac > 0.16f)
            }
            "langur" -> {
                // Langur photo has dark monkey silhouette in center + bright bokeh/white beard (high lumStd & darkFrac)
                (f.darkFrac > 0.10f) && (f.lumStd > 26f) && (f.warmFrac < 0.35f)
            }
            "leopard" -> {
                // Leopard photo has high-frequency black & gold spots + green foliage background
                (f.edgeRatio > 0.48f) && (f.meanG >= f.meanB - 4f) && (f.warmFrac < 0.45f)
            }
            else -> false
        }
    }

    @ReactMethod
    fun matchExhibit(base64Image: String, targetHint: String?, promise: Promise) {
        try {
            ensureTemplatesLoaded()

            val cleanBase64 = if (base64Image.contains(",")) {
                base64Image.substringAfter(",")
            } else {
                base64Image
            }

            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val options = BitmapFactory.Options().apply {
                inSampleSize = 2
            }
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size, options)
            if (bitmap == null) {
                promise.resolve("none")
                return
            }

            val W = bitmap.width
            val H = bitmap.height
            val S = min(W, H)

            var bestSpecies = "none"
            var bestScore = -1f

            // Multi-scale crops around the scanner reticle center
            val scales = floatArrayOf(0.42f, 0.54f, 0.66f, 0.78f, 0.90f)
            for (scale in scales) {
                val cw = (W * scale).toInt().coerceAtLeast(32)
                val ch = (H * scale).toInt().coerceAtLeast(32)
                val x0 = ((W - cw) / 2).coerceAtLeast(0)
                val y0 = ((H - ch) / 2).coerceAtLeast(0)

                val sw = (S * scale).toInt().coerceAtLeast(32)
                val sx0 = ((W - sw) / 2).coerceAtLeast(0)
                val sy0 = ((H - sw) / 2).coerceAtLeast(0)

                val candidateCrops = listOf(
                    Bitmap.createBitmap(bitmap, x0, y0, cw.coerceAtMost(W - x0), ch.coerceAtMost(H - y0)),
                    Bitmap.createBitmap(bitmap, sx0, sy0, sw.coerceAtMost(W - sx0), sw.coerceAtMost(H - sy0))
                )

                for (crop in candidateCrops) {
                    val feat = extractSpatialFeatures(crop, isReference = false) ?: continue
                    for (tmpl in referenceTemplates) {
                        if (!passesSpeciesSanityCheck(tmpl.species, feat)) continue
                        var dot = 0f
                        val v1 = feat.vec
                        val v2 = tmpl.vec
                        for (i in v1.indices) {
                            dot += v1[i] * v2[i]
                        }
                        if (dot > bestScore) {
                            bestScore = dot
                            bestSpecies = tmpl.species
                        }
                    }
                }
            }

            // Require strict spatial & color match threshold (>= 0.53)
            if (bestScore >= 0.53f && bestSpecies != "none") {
                promise.resolve(bestSpecies)
            } else {
                promise.resolve("none")
            }
        } catch (e: Exception) {
            promise.resolve("none")
        }
    }

    // ── Real-Time Hardware IMU Sensor Tracking for In-App Surface AR ──

    @ReactMethod
    fun startARTracking(promise: Promise) {
        try {
            if (sensorManager == null) {
                sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
            }
            val sm = sensorManager
            if (sm != null && !isTracking) {
                rotationSensor = sm.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR)
                    ?: sm.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
                accelSensor = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

                initialYaw = null
                rotationSensor?.let {
                    sm.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
                }
                accelSensor?.let {
                    sm.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
                }
                isTracking = true
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun stopARTracking(promise: Promise) {
        try {
            if (isTracking) {
                sensorManager?.unregisterListener(this)
                isTracking = false
                initialYaw = null
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || !isTracking) return

        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val ax = event.values[0]
            val ay = event.values[1]
            val az = event.values[2]
            val mag = sqrt(ax * ax + ay * ay + az * az)
            val delta = abs(mag - lastAccelMag)
            lastAccelMag = mag
            accelVariance = accelVariance * 0.85f + delta * 0.15f

            // If device has no gyroscope/rotation vector sensor, compute pitch & roll from accelerometer
            if (rotationSensor == null) {
                val pitchFromAccel = atan2(az.toDouble(), sqrt((ax * ax + ay * ay).toDouble())).toFloat()
                val rollFromAccel = atan2(-ax.toDouble(), ay.toDouble()).toFloat()
                smoothPitch = smoothPitch * 0.85f + pitchFromAccel * 0.15f
                smoothRoll = smoothRoll * 0.85f + rollFromAccel * 0.15f
                emitPoseIfNeeded()
            }
        } else if (
            event.sensor.type == Sensor.TYPE_GAME_ROTATION_VECTOR ||
            event.sensor.type == Sensor.TYPE_ROTATION_VECTOR
        ) {
            SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)
            // Remap coordinate system for portrait camera looking along -Z
            val remapped = FloatArray(9)
            SensorManager.remapCoordinateSystem(
                rotationMatrix,
                SensorManager.AXIS_X,
                SensorManager.AXIS_Z,
                remapped
            )
            SensorManager.getOrientation(remapped, orientationAngles)

            val rawYaw = orientationAngles[0]   // azimuth
            val rawPitch = orientationAngles[1] // pitch (positive when tilting down towards floor)
            val rawRoll = orientationAngles[2]  // roll

            if (initialYaw == null) {
                initialYaw = rawYaw
                smoothYaw = 0f
                smoothPitch = rawPitch
                smoothRoll = rawRoll
            } else {
                var dy = rawYaw - (initialYaw ?: 0f)
                while (dy > Math.PI) dy -= (2.0 * Math.PI).toFloat()
                while (dy < -Math.PI) dy += (2.0 * Math.PI).toFloat()
                smoothYaw = smoothYaw * 0.82f + dy * 0.18f
                smoothPitch = smoothPitch * 0.82f + rawPitch * 0.18f
                smoothRoll = smoothRoll * 0.82f + rawRoll * 0.18f
            }
            emitPoseIfNeeded()
        }
    }

    private fun emitPoseIfNeeded() {
        val now = System.currentTimeMillis()
        if (now - lastEmitTime < 28L) return // ~35fps smooth updates
        lastEmitTime = now

        val stability = (1f - (accelVariance / 2.5f)).coerceIn(0f, 1f)
        val map = Arguments.createMap().apply {
            putDouble("pitch", smoothPitch.toDouble())
            putDouble("roll", smoothRoll.toDouble())
            putDouble("yaw", smoothYaw.toDouble())
            putDouble("stability", stability.toDouble())
        }
        try {
            if (reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onARPoseUpdate", map)
            }
        } catch (ignored: Exception) {
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    @ReactMethod
    fun launchAR(modelUrl: String, title: String, promise: Promise) {
        try {
            val sceneViewerUri = Uri.parse("https://arvr.google.com/scene-viewer/1.0").buildUpon()
                .appendQueryParameter("file", modelUrl)
                .appendQueryParameter("mode", "ar_only")
                .appendQueryParameter("title", title)
                .appendQueryParameter("resizable", "true")
                .build()

            try {
                val arCoreIntent = Intent(Intent.ACTION_VIEW, sceneViewerUri).apply {
                    setPackage("com.google.ar.core")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(arCoreIntent)
                promise.resolve(true)
                return
            } catch (e1: Exception) {
            }

            try {
                val googleIntent = Intent(Intent.ACTION_VIEW, sceneViewerUri).apply {
                    setPackage("com.google.android.googlequicksearchbox")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(googleIntent)
                promise.resolve(true)
                return
            } catch (e2: Exception) {
            }

            val fallbackIntent = Intent(Intent.ACTION_VIEW, sceneViewerUri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(fallbackIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AR_ERROR", e.message, e)
        }
    }
}
