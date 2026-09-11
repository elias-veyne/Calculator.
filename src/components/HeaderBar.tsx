/**
 * HeaderBar.kt-compose  →  HeaderBar.tsx
 * ============================================================
 * Top chrome: glowing logo, sound mute toggle, DEG/RAD switch,
 * BASIC ⇄ SCIENTIFIC mode pill and the three-theme picker.
 * ============================================================
 */
import { memo } from "react";
import type { CalcMode } from "../viewmodel/useCalculator";

export type ThemeId = "void" | "sakura" | "verdigris";

export const THEMES: { id: ThemeId; name: string; colors: string[] }[] = [
  { id: "void", name: "Neon Void", colors: ["#00f0ff", "#b26bff", "#ff4fd8"] },
  { id: "sakura", name: "Sakura Night", colors: ["#8fd0ff", "#c78cff", "#ff5c9e"] },
  { id: "verdigris", name: "Verdigris", colors: ["#2fe6c3", "#8f9dff", "#ff7ab6"] },
];

interface HeaderBarProps {
  mode: CalcMode;
  radian: boolean;
  theme: ThemeId;
  muted: boolean;
  onToggleMode: () => void;
  onToggleRadian: () => void;
  onToggleTheme: (t: ThemeId) => void;
  onToggleMute: () => void;
}

export const HeaderBar = memo(function HeaderBar({
  mode,
  radian,
  theme,
  muted,
  onToggleMode,
  onToggleRadian,
  onToggleTheme,
  onToggleMute,
}: HeaderBarProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-purple-400/30 bg-gradient-to-b from-[#241543] to-[#110a24] text-lg shadow-[0_0_18px_-4px_rgba(178,107,255,0.65)]">
            🌙
          </div>
          <div className="min-w-0 leading-tight">
            <h1 className="font-display truncate bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-400 bg-clip-text text-sm font-extrabold tracking-[0.18em] text-transparent sm:text-base">
              NEON·CALC
            </h1>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
              animé · scientific
            </p>
          </div>
        </div>

        {/* Sound + angle unit */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleRadian}
            aria-pressed={radian}
            className={`font-display h-9 rounded-full border px-3 text-[0.65rem] font-bold tracking-widest transition-all active:scale-90 ${
              radian
                ? "border-pink-400/40 bg-pink-500/10 text-pink-300 shadow-[0_0_14px_-3px_rgba(255,79,216,0.6)]"
                : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20"
            }`}
          >
            {radian ? "RAD" : "DEG"}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            title={muted ? "Unmute sounds" : "Mute sounds"}
            className={`grid h-9 w-9 place-items-center rounded-full border text-base transition-all active:scale-90 ${
              muted
                ? "border-white/10 bg-white/[0.03] opacity-50 hover:opacity-80"
                : "border-cyan-300/30 bg-cyan-400/5 shadow-[0_0_14px_-4px_rgba(0,240,255,0.5)] hover:border-cyan-300/50"
            }`}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="w-14" aria-hidden="true" />

        {/* Mode pill */}
        <div className="flex rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => {
              if (mode !== "basic") onToggleMode();
            }}
            className={`rounded-full px-3 py-1.5 text-[0.65rem] font-bold tracking-wider transition-all duration-300 ${
              mode === "basic"
                ? "bg-gradient-to-b from-cyan-400/30 to-cyan-400/10 text-cyan-200 shadow-[0_0_14px_-2px_rgba(0,240,255,0.5)]"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            BASIC
          </button>
          <button
            type="button"
            onClick={() => {
              if (mode !== "scientific") onToggleMode();
            }}
            className={`rounded-full px-3 py-1.5 text-[0.65rem] font-bold tracking-wider transition-all duration-300 ${
              mode === "scientific"
                ? "bg-gradient-to-b from-purple-400/30 to-purple-400/10 text-purple-200 shadow-[0_0_14px_-2px_rgba(178,107,255,0.55)]"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            SCIENTIFIC
          </button>
        </div>

        {/* Theme picker */}
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Color theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.name}
              aria-label={t.name}
              onClick={() => onToggleTheme(t.id)}
              className={`h-4 w-4 rounded-full transition-all duration-300 hover:scale-125 ${
                theme === t.id
                  ? "scale-125 ring-2 ring-white/80 shadow-[0_0_10px_rgba(255,255,255,0.35)]"
                  : "opacity-60 ring-1 ring-white/20"
              }`}
              style={{
                background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]} 55%, ${t.colors[2]})`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
