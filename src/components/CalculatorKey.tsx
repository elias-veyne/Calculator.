/**
 * CalculatorKey.kt-compose  →  CalculatorKey.tsx
 * ============================================================
 * A single 3D calculator key with full sensory feedback:
 *  · synthesized sound + haptic tick per key type
 *  · neon spark burst + expanding ripple on every press
 *  · staggered cinematic entrance (rise-in with per-key delay)
 *  · physical 3D dip on press
 *
 * Variants map to the animé palette (all theme-driven):
 *   base=graphite · fn=purple · op=cyan · eq=pink · danger · mem=amber
 * ============================================================
 */
import { memo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { sound, haptic } from "../audio/SoundEngine";

export type KeyVariant = "base" | "fn" | "op" | "eq" | "danger" | "mem";

export interface CalculatorKeyProps {
  label: string;
  sub?: string;
  onPress: () => void;
  variant?: KeyVariant;
  className?: string;
  /** Extra classes for the label span (e.g. "text-2xl font-bold") */
  labelClass?: string;
  dim?: boolean;
  /** Stagger delay (ms) for the entrance animation */
  delay?: number;
}

interface Spark {
  id: number;
  ang: number;
  dist: number;
  size: number;
}

const VARIANT_CLASS: Record<KeyVariant, string> = {
  base: "key-base",
  fn: "key-fn",
  op: "key-op",
  eq: "key-eq",
  danger: "key-danger",
  mem: "key-mem",
};

const SPARK_COLOR: Record<KeyVariant, string> = {
  base: "var(--c-cyan)",
  fn: "var(--c-purple)",
  op: "var(--c-cyan)",
  eq: "var(--c-pink)",
  danger: "var(--c-pink)",
  mem: "var(--c-amber)",
};

export const CalculatorKey = memo(function CalculatorKey({
  label,
  sub,
  onPress,
  variant = "base",
  className = "",
  labelClass = "",
  dim = false,
  delay = 0,
}: CalculatorKeyProps) {
  const [burst, setBurst] = useState<{ id: number; sparks: Spark[] } | null>(null);
  const burstId = useRef(0);

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // --- sound + haptics, tuned per key type ---
    const name = sound.keySound(label);
    if (name) {
      sound.play(name, /^[0-9]$/.test(label) ? Number(label) : 0);
      if (name === "equals") haptic([12, 40, 20]);
      else if (name === "clear") haptic(16);
      else if (name === "backspace") haptic(9);
      else haptic(6);
    }

    // --- neon spark burst + ripple ---
    const id = ++burstId.current;
    const count = variant === "eq" ? 10 : 7;
    setBurst({
      id,
      sparks: Array.from({ length: count }, (_, i) => ({
        id: i,
        ang: (i / count) * Math.PI * 2 + Math.random() * 0.6,
        dist: 16 + Math.random() * 18,
        size: 2.5 + Math.random() * 2,
      })),
    });
    window.setTimeout(() => setBurst((b) => (b && b.id === id ? null : b)), 680);

    onPress();
  };

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={handlePointerDown}
      className={`key-3d rise-in ${VARIANT_CLASS[variant]} rounded-2xl outline-none select-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${
        dim ? "opacity-40" : ""
      } ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {burst && (
        <>
          {burst.sparks.map((s) => (
            <span
              key={s.id}
              className="key-spark"
              style={
                {
                  "--ang": `${s.ang}rad`,
                  "--dist": `${s.dist}px`,
                  "--sz": `${s.size}px`,
                  "--sc": SPARK_COLOR[variant],
                } as CSSProperties
              }
            />
          ))}
          <span key={`ripple-${burst.id}`} className="key-ripple" aria-hidden="true" />
        </>
      )}
      {sub ? (
        <span className="flex flex-col items-center justify-center leading-none">
          <span className="text-[0.55rem] font-semibold uppercase tracking-wider opacity-60">{sub}</span>
          <span className={`mt-1 text-[0.95rem] font-semibold ${labelClass}`}>{label}</span>
        </span>
      ) : (
        <span className={`text-lg font-semibold leading-none ${labelClass}`}>{label}</span>
      )}
    </button>
  );
});
