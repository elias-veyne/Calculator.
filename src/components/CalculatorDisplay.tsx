/**
 * CalculatorDisplay.kt-compose  →  CalculatorDisplay.tsx
 * ============================================================
 * The glowing readout panel, now with:
 *  · pretty-printed expressions (√, superscript powers, colored
 *    functions and constants)
 *  · rolling-digit answer transitions (AnimatedNumber)
 *  · neon bloom pulse on fresh results
 *  · periodic moving glare + CRT scanline flicker
 *  · animé red "ERROR" shake on failures
 * ============================================================
 */
import { memo, type ReactNode } from "react";
import type { CalcState } from "../viewmodel/useCalculator";
import { calculateExpression } from "../engine/CalculatorEngine";
import { displayValue } from "../viewmodel/useCalculator";
import { AnimatedNumber } from "./AnimatedNumber";

interface CalculatorDisplayProps {
  state: CalcState;
}

const FUNC_NAMES = ["asin", "acos", "atan", "cbrt", "sqrt", "sin", "cos", "tan", "log", "ln"];

/** Renders the expression with coloring + superscript powers. */
function prettyExpression(input: string): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < input.length) {
    const ch = input[i];

    // superscript powers: 2^10 → 2¹⁰
    if (ch === "^") {
      let j = i + 1;
      while (j < input.length && /[0-9.\-−]/.test(input[j])) j++;
      if (j > i + 1) {
        out.push(
          <sup key={k++} className="text-[0.66em] font-bold text-cyan-300/90">
            {input.slice(i + 1, j)}
          </sup>
        );
        i = j;
        continue;
      }
      out.push(
        <span key={k++} className="text-cyan-300/80">
          ^
        </span>
      );
      i++;
      continue;
    }

    const fn = FUNC_NAMES.find((f) => input.startsWith(f, i));
    if (fn) {
      out.push(
        <span key={k++} className="text-purple-300/90">
          {fn}
        </span>
      );
      i += fn.length;
      continue;
    }

    if (ch === "π" || ch === "e") {
      out.push(
        <span key={k++} className="text-cyan-300">
          {ch}
        </span>
      );
      i++;
      continue;
    }

    if (/[+\-−×÷%]/.test(ch)) {
      out.push(
        <span key={k++} className="mx-[1px] text-slate-400/80">
          {ch}
        </span>
      );
      i++;
      continue;
    }

    out.push(ch);
    i++;
  }
  return out;
}

export const CalculatorDisplay = memo(function CalculatorDisplay({ state }: CalculatorDisplayProps) {
  const error = state.phase === "error";
  const answerStr = error ? "" : displayValue(state.answer);

  // Derive the exact engine error message (pure, instant) instead of
  // storing it in state — keeps the ViewModel surface minimal.
  const errorMessage = error
    ? (() => {
        const res = calculateExpression(state.input);
        return res.ok ? "Invalid input" : res.error;
      })()
    : "";

  // Keep the RIGHT end of long expressions visible
  const raw = state.input === "" ? "0" : state.input;
  const sliced = raw.length > 34 ? raw.slice(-34) : raw;
  const hasPrefix = raw.length > 34;

  const sizeClass =
    answerStr.length > 14
      ? "text-2xl sm:text-3xl"
      : answerStr.length > 9
        ? "text-3xl sm:text-4xl"
        : "text-4xl sm:text-5xl";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b0b15] via-[#08080f] to-[#05050a] px-5 pt-4 pb-5 shadow-[inset_0_2px_16px_rgba(0,0,0,0.9),inset_0_-1px_0_rgba(255,255,255,0.04),0_14px_34px_-14px_rgba(0,0,0,0.95)]">
      {/* CRT scanlines */}
      <div
        className="scanlines pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(180deg, transparent 0px, transparent 2px, rgba(255,255,255,0.3) 3px, transparent 4px)",
        }}
      />
      {/* periodic glare sweep */}
      <div className="display-glare" />

      <div className="relative flex min-h-[84px] flex-col items-end justify-end gap-1.5 sm:min-h-[102px]">
        {/* expression line */}
        <div
          key={`expr-${state.resultNonce}`}
          className={`font-display w-full truncate text-right font-medium tracking-wide ${
            error
              ? "error-shake text-base text-[#ff5c8a] sm:text-lg"
              : "text-lg text-violet-200/70 sm:text-xl"
          }`}
        >
          {hasPrefix && <span className="text-slate-600">…</span>}
          {prettyExpression(sliced)}
        </div>

        {/* answer line */}
        <div className="relative w-full text-right">
          {state.phase === "success" && (
            <span
              key={`bloom-${state.resultNonce}`}
              className="answer-bloom pointer-events-none absolute -inset-3 rounded-2xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--c-cyan) 30%, transparent), transparent 70%)",
              }}
            />
          )}
          {error ? (
            <span
              key={`err-${state.resultNonce}`}
              className="error-shake font-display block w-full truncate text-right text-sm font-bold text-[#ff5c8a]/90 sm:text-base"
            >
              {errorMessage || "Invalid input"}
            </span>
          ) : (
            <AnimatedNumber
              value={answerStr || "\u00A0"}
              className={`font-display w-full text-right font-bold ${
                state.phase === "success" ? "glow-cyan text-cyan-50" : "glow-cyan text-cyan-300/80"
              } ${sizeClass}`}
            />
          )}
        </div>
      </div>
    </div>
  );
});
