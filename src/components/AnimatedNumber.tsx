/**
 * AnimatedNumber.kt-compose  →  AnimatedNumber.tsx
 * ============================================================
 * Slot-machine style number readout: when the value changes,
 * the old digits roll up and out while the new ones roll in.
 * ============================================================
 */
import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: string;
  className?: string;
}

export function AnimatedNumber({ value, className = "" }: AnimatedNumberProps) {
  const [display, setDisplay] = useState({ current: value, prev: value });
  const [animating, setAnimating] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (value === display.current) return;
    setDisplay({ prev: display.current, current: value });
    setAnimating(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAnimating(false), 320);
    return () => window.clearTimeout(timer.current);
  }, [value, display.current]);

  return (
    <span className={`relative block overflow-hidden leading-tight ${className}`}>
      {animating && (
        <span
          key={`out-${display.prev}`}
          aria-hidden="true"
          className="roll-out absolute inset-y-0 right-0 block max-w-full truncate"
        >
          {display.prev}
        </span>
      )}
      <span key={`in-${display.current}`} className={`block max-w-full truncate ${animating ? "roll-in" : ""}`}>
        {display.current}
      </span>
    </span>
  );
}
