/**
 * SoundEngine.kt-audio  →  SoundEngine.ts
 * ============================================================
 * Fully synthesized sound effects via the Web Audio API — zero
 * audio assets, instant startup, <1 KB of code. Mirrors the
 * Android app's SoundPool + haptic-feedback design.
 *
 * Every key type has its own timbre:
 *   digits  → soft triangle blips (pitch rises with the digit)
 *   operators → two-tone chime
 *   functions → gliding chirp
 *   equals  → rising arpeggio
 *   error   → dissonant sawtooth buzz
 *   clear   → filtered noise whoosh
 *   memory  → square-wave knock
 *   toggle  → sine sweep (mode/theme switches)
 *   power   → startup chord on first interaction
 * ============================================================
 */

export type SoundName =
  | "digit"
  | "operator"
  | "function"
  | "equals"
  | "error"
  | "backspace"
  | "clear"
  | "memory"
  | "toggle"
  | "power";

interface ToneOptions {
  type?: OscillatorType;
  dur?: number;
  gain?: number;
  glideTo?: number;
  delay?: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem("neoncalc-muted") === "1";
    } catch {
      /* storage unavailable — ignore */
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem("neoncalc-muted", m ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  /** Lazily create the AudioContext on the first user gesture
   *  (browser autoplay policies forbid audio before interaction). */
  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      // Soft compressor keeps stacked tones from clipping
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.ratio.value = 5;
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(comp);
      this.play("power"); // boot chime on the very first interaction
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Single oscillator note with an exponential decay envelope. */
  private tone(freq: number, opts: ToneOptions = {}): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const { type = "sine", dur = 0.08, gain = 0.5, glideTo, delay = 0 } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.06);
  }

  /** Filtered white-noise burst (whoosh / click transients). */
  private noise(dur = 0.15, gain = 0.25, freq = 1600, delay = 0): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + delay;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  play(name: SoundName, pitch = 0): void {
    if (this.muted) return;
    switch (name) {
      case "digit":
        this.tone(430 + pitch * 34, { type: "triangle", dur: 0.055, gain: 0.16 });
        this.tone(860 + pitch * 68, { type: "sine", dur: 0.035, gain: 0.05 });
        break;
      case "operator":
        this.tone(600, { type: "triangle", dur: 0.07, gain: 0.2 });
        this.tone(910, { type: "sine", dur: 0.06, gain: 0.12, delay: 0.022 });
        break;
      case "function":
        this.tone(470, { type: "sine", dur: 0.1, gain: 0.18, glideTo: 740 });
        break;
      case "equals": {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((n, i) => this.tone(n, { type: "triangle", dur: 0.14, gain: 0.16, delay: i * 0.055 }));
        this.tone(2093, { type: "sine", dur: 0.2, gain: 0.05, delay: 0.22 });
        break;
      }
      case "error":
        this.tone(150, { type: "sawtooth", dur: 0.24, gain: 0.22, glideTo: 85 });
        this.tone(232, { type: "square", dur: 0.18, gain: 0.08, delay: 0.02 });
        break;
      case "backspace":
        this.tone(330, { type: "triangle", dur: 0.06, gain: 0.18, glideTo: 190 });
        break;
      case "clear":
        this.noise(0.2, 0.22, 2200);
        this.tone(220, { type: "sine", dur: 0.12, gain: 0.1, glideTo: 330 });
        break;
      case "memory":
        this.tone(988, { type: "square", dur: 0.05, gain: 0.07 });
        this.tone(1318, { type: "square", dur: 0.06, gain: 0.07, delay: 0.045 });
        break;
      case "toggle":
        this.tone(340, { type: "sine", dur: 0.14, gain: 0.15, glideTo: 780 });
        break;
      case "power": {
        const chord = [392, 493.88, 587.33, 783.99];
        chord.forEach((n, i) => this.tone(n, { type: "sine", dur: 0.5, gain: 0.1, delay: i * 0.07 }));
        this.tone(1567.98, { type: "sine", dur: 0.35, gain: 0.04, delay: 0.3 });
        break;
      }
    }
  }

  /** Map an on-screen key label to its sound. */
  keySound(label: string): SoundName | null {
    if (label === "=") return "equals";
    if (label === "C") return "clear";
    if (label === "⌫") return "backspace";
    if (["+", "−", "×", "÷", "%", "^"].includes(label)) return "operator";
    if (/^[0-9.]$/.test(label)) return "digit";
    return "function";
  }

  /** Play the right sound for a physical keyboard key. */
  playKeyboard(key: string): void {
    if (/^[0-9]$/.test(key)) this.play("digit", Number(key));
    else if (key === "Enter" || key === "=") this.play("equals");
    else if (key === "Backspace") this.play("backspace");
    else if (key === "Escape" || key === "Delete") this.play("clear");
    else if (["+", "-", "*", "/", "%", "^"].includes(key)) this.play("operator");
    else this.play("function");
  }
}

/** Singleton — import `sound` anywhere (mirrors SoundPool). */
export const sound = new SoundEngine();

/** Haptic feedback via the Vibration API (no-op where unsupported). */
export function haptic(pattern: number | number[]): void {
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
