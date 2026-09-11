package com.neoncalc.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** NeonCalc — dark animé palette (deep blacks + cyan/purple/pink neons). */
object NeonColors {
    val Void = Color(0xFF07070B)
    val Panel = Color(0xFF0E0E16)
    val Elevated = Color(0xFF14141F)
    val Cyan = Color(0xFF00F0FF)
    val Purple = Color(0xFFB26BFF)
    val Pink = Color(0xFFFF4FD8)
    val Amber = Color(0xFFFFB347)
    val TextDim = Color(0xFF6B6B85)
    val TextSoft = Color(0xFF9B9BB3)
    val ErrorPink = Color(0xFFFF5C8A)
}

private val NeonDarkColors = darkColorScheme(
    primary = NeonColors.Cyan,
    onPrimary = Color(0xFF00181C),
    secondary = NeonColors.Purple,
    onSecondary = Color(0xFF1A0A33),
    tertiary = NeonColors.Pink,
    background = NeonColors.Void,
    onBackground = Color(0xFFE8E8F2),
    surface = NeonColors.Panel,
    onSurface = Color(0xFFE8E8F2),
    surfaceVariant = NeonColors.Elevated,
    onSurfaceVariant = NeonColors.TextSoft,
    error = NeonColors.ErrorPink,
)

@Composable
fun NeonCalcTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = NeonDarkColors,
        content = content,
    )
}
