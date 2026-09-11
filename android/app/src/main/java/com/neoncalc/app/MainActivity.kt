package com.neoncalc.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.neoncalc.app.ui.theme.NeonCalcTheme

/**
 * MainActivity — application entry point.
 * Hosts the Compose UI inside the NeonCalcTheme.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            NeonCalcTheme {
                CalculatorScreen()
            }
        }
    }
}
