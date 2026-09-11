/**
 * ScientificKeypad.kt-compose  →  ScientificKeypad.tsx
 * ============================================================
 * 6-column scientific layout: trig + inverse trig (degree/radian
 * aware), logarithms, roots, factorial, power, π/e constants,
 * eˣ, Ans and a tall corner "=" key spanning three rows.
 * Every cell cascades in with a staggered entrance delay.
 * ============================================================
 */
import { memo } from "react";
import { CalculatorKey, type KeyVariant } from "./CalculatorKey";

interface ScientificKeypadProps {
  onKey: (label: string) => void;
  radian: boolean;
}

interface Cell {
  label: string;
  sub?: string;
  variant?: KeyVariant;
  labelClass?: string;
  className?: string;
  badge?: boolean;
}

export const ScientificKeypad = memo(function ScientificKeypad({ onKey, radian }: ScientificKeypadProps) {
  const h = "h-10 sm:h-12";
  const digit = "text-lg font-bold";
  const fnLabel = "text-sm font-bold";

  const fn = (label: string, sub?: string): Cell => ({ label, sub, variant: "fn", labelClass: fnLabel });

  const rows: Cell[][] = [
    [fn("sin"), fn("cos"), fn("tan"), fn("√", "sqrt"), fn("^", "xʸ"), fn("!", "fact")],
    [fn("sin⁻¹", "asin"), fn("cos⁻¹", "acos"), fn("tan⁻¹", "atan"), fn("³√", "cbrt"), fn("log", "base 10"), fn("ln", "natural")],
    [fn("π"), fn("e"), { label: "(", labelClass: "text-base" }, { label: ")", labelClass: "text-base" }, { label: "⌫", variant: "danger", labelClass: "text-base" }, { label: "C", variant: "danger", labelClass: "text-base font-bold" }],
    [{ label: "7", labelClass: digit }, { label: "8", labelClass: digit }, { label: "9", labelClass: digit }, { label: "÷", variant: "op", labelClass: "text-xl" }, { label: "%", variant: "fn", labelClass: fnLabel }, { label: "", badge: true }],
    [{ label: "4", labelClass: digit }, { label: "5", labelClass: digit }, { label: "6", labelClass: digit }, { label: "×", variant: "op", labelClass: "text-xl" }, { label: "−", variant: "op", labelClass: "text-xl" }, { label: "=", variant: "eq", labelClass: "text-2xl font-extrabold", className: "row-span-3" }],
    [{ label: "1", labelClass: digit }, { label: "2", labelClass: digit }, { label: "3", labelClass: digit }, { label: "+", variant: "op", labelClass: "text-xl" }, { label: ".", labelClass: "text-xl font-bold" }],
    [{ label: "Ans", sub: "answer", variant: "fn", labelClass: fnLabel }, { label: "0", labelClass: digit, className: "col-span-2" }, { label: "eˣ", sub: "exp", variant: "fn", labelClass: fnLabel, className: "col-span-2" }],
  ];

  let step = 0;
  const nextDelay = () => (step += 24) - 24;

  return (
    <div className="grid grid-cols-6 gap-1.5 sm:gap-2" role="group" aria-label="Scientific keypad">
      {rows.map((row, ri) =>
        row.map((cell, ci) => {
          const delay = nextDelay();
          if (cell.badge) {
            return (
              <div key={`badge-${ri}-${ci}`} className="rise-in grid place-items-center" style={{ animationDelay: `${delay}ms` }}>
                <span
                  title="Angle unit used by trigonometric functions"
                  className={`font-display rounded-md border px-1.5 py-0.5 text-[0.55rem] font-bold tracking-widest ${
                    radian
                      ? "border-pink-400/40 bg-pink-500/10 text-pink-300 glow-pink"
                      : "border-cyan-300/30 bg-cyan-400/5 text-cyan-300/90 glow-cyan"
                  }`}
                >
                  {radian ? "RAD" : "DEG"}
                </span>
              </div>
            );
          }
          return (
            <CalculatorKey
              key={`${ri}-${ci}-${cell.label}`}
              label={cell.label}
              sub={cell.sub}
              variant={cell.variant}
              labelClass={cell.labelClass}
              onPress={() => onKey(cell.label)}
              className={cell.className ?? h}
              delay={delay}
            />
          );
        })
      )}
    </div>
  );
});
