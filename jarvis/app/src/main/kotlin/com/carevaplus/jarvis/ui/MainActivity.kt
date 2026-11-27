package com.carevaplus.jarvis.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    private var tick by mutableIntStateOf(0)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            JarvisTheme {
                var tab by rememberSaveable { mutableStateOf(0) }
                val tabs = listOf("Home" to "◉", "Chat" to "✦", "Models" to "⬡", "Settings" to "⚙")
                Scaffold(
                    containerColor = J.bg,
                    bottomBar = {
                        NavigationBar(containerColor = J.surface) {
                            tabs.forEachIndexed { i, (name, glyph) ->
                                NavigationBarItem(selected = tab == i, onClick = { tab = i }, icon = { Text(glyph, fontSize = 20.sp) }, label = { Text(name, fontSize = 11.sp) },
                                    colors = NavigationBarItemDefaults.colors(selectedIconColor = J.cyan, selectedTextColor = J.cyan, indicatorColor = J.raised, unselectedIconColor = J.muted, unselectedTextColor = J.muted))
                            }
                        }
                    },
                ) { pad ->
                    Box(Modifier.fillMaxSize().background(J.bg).padding(pad)) {
                        when (tab) {
                            0 -> HomeScreen(tick) { tab = it }
                            1 -> ChatScreen()
                            2 -> ModelsScreen()
                            else -> SettingsScreen()
                        }
                    }
                }
            }
        }
    }

    // permissions are granted in system screens: re-check when the user comes back
    override fun onResume() { super.onResume(); tick++ }
}
