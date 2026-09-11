/**
 * IntroSplash.kt-compose  →  IntroSplash.tsx
 * ============================================================
 * Animé-style boot splash: logo pops in with a spring curve, a
 * neon ring expands, then the whole overlay fades away.
 * ============================================================
 */
import { useEffect, useState } from "react";

export function IntroSplash() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setHidden(true), 1600);
    return () => window.clearTimeout(t);
  }, []);

  if (hidden) return null;

  return (
    <div className="intro-splash fixed inset-0 z-50 grid place-items-center bg-[#07070b]">
      <div className="intro-logo relative flex flex-col items-center gap-5">
        <span className="intro-ring" />
        <span className="text-7xl drop-shadow-[0_0_28px_rgba(178,107,255,0.8)]">🌙</span>
        <h1 className="font-display bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-400 bg-clip-text text-2xl font-black tracking-[0.3em] text-transparent">
          NEON·CALC
        </h1>
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.5em] text-slate-500">
          booting the animé calculator…
        </p>
      </div>
    </div>
  );
}
