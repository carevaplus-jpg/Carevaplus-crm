package com.carevaplus.jarvis.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object J {
    val bg = Color(0xFF050B12); val surface = Color(0xFF0B1722); val raised = Color(0xFF10212F); val line = Color(0xFF1B3646)
    val cyan = Color(0xFF4DE8FF); val amber = Color(0xFFFFB547); val text = Color(0xFFE6F6FF); val muted = Color(0xFF7FA3B5); val ok = Color(0xFF5CE6A1); val bad = Color(0xFFFF8A80)
}

@Composable
fun JarvisTheme(content: @Composable () -> Unit) = MaterialTheme(
    colorScheme = darkColorScheme(primary = J.cyan, onPrimary = Color(0xFF00222B), background = J.bg, surface = J.surface, onSurface = J.text, onBackground = J.text, secondary = J.amber, outline = J.line, surfaceVariant = J.raised, onSurfaceVariant = J.muted),
    content = content,
)

fun Modifier.panel(): Modifier = this.background(J.surface, RoundedCornerShape(18.dp)).border(BorderStroke(1.dp, J.line), RoundedCornerShape(18.dp))
