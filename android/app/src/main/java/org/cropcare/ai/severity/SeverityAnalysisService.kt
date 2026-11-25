package org.cropcare.ai.severity

import android.graphics.Bitmap
import android.graphics.Color
import kotlin.math.roundToInt

data class SeverityOutput(
    val affectedPercent: Int,
    val stage: String,
    val headline: String,
    val urgency: String,
    val rationale: String
)

class SeverityAnalysisService {

    fun calculateSeverity(crop: String, problemSlug: String, bitmap: Bitmap): SeverityOutput {
        // Downscale bitmap for fast responsive on-device segmentation
        val scaled = Bitmap.createScaledBitmap(bitmap, 120, 120, false)
        val width = scaled.width
        val height = scaled.height

        var leafPixels = 0
        var lesionPixels = 0

        val hsv = FloatArray(3)

        for (y in 0 until height) {
            for (x in 0 until width) {
                val pixel = scaled.getPixel(x, y)
                val r = Color.red(pixel)
                val g = Color.green(pixel)
                val b = Color.blue(pixel)

                Color.RGBToHSV(r, g, b, hsv)
                val hue = hsv[0]        // 0..360
                val sat = hsv[1]        // 0..1
                val value = hsv[2]      // 0..1

                // Plant tissue mask (green foliage or yellowed/chlorotic tissue)
                val isPlant = (hue in 28.0..170.0 && sat > 0.12 && value > 0.15)
                if (isPlant) {
                    leafPixels++

                    // Lesion / necrosis mask: brown, necrotic grey/tan, or deep yellow halos
                    val isLesion = (hue in 10.0..45.0 && sat > 0.20 && value in 0.10..0.75) ||
                                   (hue in 45.0..68.0 && sat > 0.40 && value > 0.50)
                    if (isLesion) {
                        lesionPixels++
                    }
                }
            }
        }

        val affectedPercent = if (leafPixels > 100) {
            ((lesionPixels.toDouble() / leafPixels.toDouble()) * 100.0).roundToInt().coerceIn(1, 95)
        } else {
            12 // Default baseline when leaf surface is occluded
        }

        return if (crop == "rice") {
            mapRiceSES(problemSlug, affectedPercent)
        } else {
            mapChilliSeverity(problemSlug, affectedPercent)
        }
    }

    private fun mapRiceSES(slug: String, percent: Int): SeverityOutput {
        val (score, stage, urgency) = when {
            percent < 1 -> Triple(1, "Early vegetative (SES Score 1)", "Routine")
            percent in 1..5 -> Triple(3, "Mild localized lesions (SES Score 3)", "Moderate")
            percent in 6..25 -> Triple(5, "Moderate coalescing lesions (SES Score 5)", "High")
            percent in 26..50 -> Triple(7, "Severe tissue blighting (SES Score 7)", "Urgent")
            else -> Triple(9, "Critical canopy collapse (SES Score 9)", "Emergency")
        }

        return SeverityOutput(
            affectedPercent = percent,
            stage = stage,
            headline = "Estimated $percent% leaf area affected ($stage)",
            urgency = urgency,
            rationale = "Evaluated according to the IRRI Standard Evaluation System (SES) for Rice ($slug). Action threshold exceeded if >5% during panicle initiation."
        )
    }

    private fun mapChilliSeverity(slug: String, percent: Int): SeverityOutput {
        val (grade, stage, urgency) = when {
            percent < 5 -> Triple(0, "Stage 0 (No apparent curling/lesions)", "Routine")
            percent in 5..15 -> Triple(1, "Stage 1 (Mild upward leaf cupping)", "Moderate")
            percent in 16..35 -> Triple(2, "Stage 2 (Moderate puckering & vein clearing)", "High")
            percent in 36..60 -> Triple(3, "Stage 3 (Severe curling & stunted internodes)", "Urgent")
            else -> Triple(4, "Stage 4 (Extreme rosetting & complete fruit loss)", "Emergency")
        }

        return SeverityOutput(
            affectedPercent = percent,
            stage = stage,
            headline = "Estimated $percent% canopy distortion ($stage)",
            urgency = urgency,
            rationale = "Severity scored according to the Horticultural Leaf Curl / Spot Index for Chilli ($slug). Vector suppression must begin before Grade 2."
        )
    }
}

