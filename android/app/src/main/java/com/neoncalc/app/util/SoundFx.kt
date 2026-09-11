package com.neoncalc.app.util

import android.media.AudioManager
import android.media.ToneGenerator

/**
 * SoundFx — Android-native key sounds via [ToneGenerator] (DTMF/prop tones).
 * No audio assets, no permissions, instant playback. Mirrors the synthesized
 * sound engine of the web version.
 */
object SoundFx {

    private var toneGen: ToneGenerator? = null

    private fun generator(): ToneGenerator? {
        if (toneGen == null) {
            toneGen = try {
                ToneGenerator(AudioManager.STREAM_MUSIC, 60)
            } catch (e: Exception) {
                null
            }
        }
        return toneGen
    }

    fun digit(d: Int) {
        generator()?.startTone(ToneGenerator.TONE_DTMF_0 + d.coerceIn(0, 9), 70)
    }

    fun operator() {
        generator()?.startTone(ToneGenerator.TONE_DTMF_S, 70)
    }

    fun function() {
        generator()?.startTone(ToneGenerator.TONE_DTMF_D, 70)
    }

    fun equals() {
        generator()?.startTone(ToneGenerator.TONE_PROP_ACK, 130)
    }

    fun error() {
        generator()?.startTone(ToneGenerator.TONE_PROP_NACK, 190)
    }

    fun clear() {
        generator()?.startTone(ToneGenerator.TONE_PROP_NACK, 90)
    }

    fun backspace() {
        generator()?.startTone(ToneGenerator.TONE_DTMF_A, 60)
    }

    fun memory() {
        generator()?.startTone(ToneGenerator.TONE_DTMF_B, 70)
    }

    fun toggle() {
        generator()?.startTone(ToneGenerator.TONE_DTMF_C, 80)
    }

    fun release() {
        try {
            toneGen?.release()
        } catch (_: Exception) {
            // already released
        }
        toneGen = null
    }
}
