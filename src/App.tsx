/**
 * MainActivity.kt + CalculatorScreen.kt-compose  →  App.tsx
 * ============================================================
 * Screen composition root. Wires the MVVM ViewModel (useCalculator)
 * to the UI and the FX systems:
 *  · theme switching (CSS variable re-skin, persisted)
 *  · sound engine + haptics (keys, keyboard, toggles, errors)
 *  · 3D pointer-tracking tilt panel
 *  · intro boot splash, toasts, clipboard
 * ============================================================
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useCalculator } from "./viewmodel/useCalculator";
import type { HistoryEntry } from "./viewmodel/useCalculator";
import { sound, haptic } from "./audio/SoundEngine";
import { NeonBackground } from "./components/NeonBackground";
import { HeaderBar, type ThemeId } from "./components/HeaderBar";
import { CalculatorDisplay } from "./components/CalculatorDisplay";
import { MemoryBar } from "./components/MemoryBar";
import { BasicKeypad } from "./components/BasicKeypad";
import { ScientificKeypad } from "./components/ScientificKeypad";
import { HistoryPanel } from "./components/HistoryPanel";
import { TiltPanel } from "./components/TiltPanel";
import { IntroSplash } from "./components/IntroSplash";
// Side-effect import: runs the JUnit-style engine test suite at startup
// and reports pass/fail to the console.
import "./engine/CalculatorEngine.test";

export default function App() {
  const { state, actions } = useCalculator();

  /* ---------------- theme + sound state (persisted) ---------------- */
  const [theme, setTheme] = useState<ThemeId>(() => {
    try {
      return (localStorage.getItem("neoncalc-theme") as ThemeId) || "void";
    } catch {
      return "void";
    }
  });
  const [muted, setMuted] = useState<boolean>(() => sound.isMuted);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const prevPhase = useRef(state.phase);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("neoncalc-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  /* ---------------- error buzz when the engine rejects input ---------------- */
  useEffect(() => {
    if (state.phase === "error" && prevPhase.current !== "error") {
      sound.play("error");
      haptic([40, 60, 90]);
    }
    prevPhase.current = state.phase;
  }, [state.phase]);

  /* ---------------- toast helper ---------------- */
  const showToast = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), msg });
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);

  /* ---------------- key routing ---------------- */
  const handleKey = useCallback(
    (label: string) => {
      switch (label) {
        case "C":
          actions.clear();
          break;
        case "⌫":
          actions.backspace();
          break;
        case "=":
          actions.equals();
          break;
        case "Ans":
          actions.pressAns();
          break;
        default:
          actions.press(label);
      }
    },
    [actions]
  );

  /* physical keyboard input with matching sounds */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (actions.onKeyDown(event)) sound.playKeyboard(event.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions]);

  /* ---------------- header actions (with FX) ---------------- */
  const handleToggleMode = useCallback(() => {
    actions.toggleMode();
    sound.play("toggle");
    haptic(10);
  }, [actions]);

  const handleToggleRadian = useCallback(() => {
    actions.toggleRadian();
    sound.play("function");
    haptic(10);
  }, [actions]);

  const handleTheme = useCallback((t: ThemeId) => {
    setTheme(t);
    sound.play("toggle");
    haptic(10);
  }, []);

  const handleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      sound.setMuted(next);
      if (!next) sound.play("toggle");
      return next;
    });
  }, []);

  /* ---------------- history helpers ---------------- */
  const handleCopy = useCallback(
    async (entry: HistoryEntry) => {
      try {
        await navigator.clipboard.writeText(entry.result);
        showToast("Result copied to clipboard ✨");
        sound.play("memory");
      } catch {
        showToast("Clipboard unavailable");
      }
    },
    [showToast]
  );

  return (
    <div className="relative min-h-dvh">
      <IntroSplash />
      <NeonBackground />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:flex-row lg:items-start lg:justify-center">
        {/* ================= calculator column ================= */}
        <section className="flex w-full min-w-0 flex-col gap-3 lg:max-w-[560px]">
          <HeaderBar
            mode={state.mode}
            radian={state.radian}
            theme={theme}
            muted={muted}
            onToggleMode={handleToggleMode}
            onToggleRadian={handleToggleRadian}
            onToggleTheme={handleTheme}
            onToggleMute={handleMute}
          />

          <TiltPanel>
            <CalculatorDisplay state={state} />
            <MemoryBar
              memory={state.memory}
              onMC={actions.clearMemory}
              onMR={actions.memoryRecall}
              onMPlus={actions.memoryPlus}
              onMMinus={actions.memoryMinus}
            />
            {state.mode === "basic" ? (
              <BasicKeypad onKey={handleKey} />
            ) : (
              <ScientificKeypad onKey={handleKey} radian={state.radian} />
            )}
          </TiltPanel>

          <p className="text-center text-[0.65rem] tracking-wide text-slate-600">
            ⌨️ Keyboard supported — digits, + − × ÷ ( ) % ^ ! · Enter = · Backspace ⌫ · Esc C
          </p>
        </section>

        {/* ================= history column ================= */}
        <aside className="w-full shrink-0 self-start lg:sticky lg:top-6 lg:w-80">
          <HistoryPanel
            history={state.history}
            onClear={actions.clearHistory}
            onTap={(entry) => actions.insertValue(entry.result)}
            onCopy={handleCopy}
            onDelete={actions.deleteHistoryEntry}
          />
        </aside>
      </main>

      {/* toast */}
      {toast && (
        <div
          key={toast.id}
          className="toast-in fixed bottom-6 left-1/2 z-50 rounded-full border border-cyan-300/30 bg-[#0c1420]/90 px-4 py-2 text-xs font-semibold text-cyan-100 shadow-[0_0_24px_-6px_rgba(0,240,255,0.5)] backdrop-blur-md"
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
