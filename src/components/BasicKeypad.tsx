/**
 * BasicKeypad.kt-compose  →  BasicKeypad.tsx
 * ============================================================
 * 4-column basic layout: digits, operators, C/⌫, parentheses,
 * decimal point and a full-width glowing "=" bar. Keys cascade
 * in with staggered entrance delays.
 * ============================================================
 */
import { memo } from "react";
import { CalculatorKey, type KeyVariant } from "./CalculatorKey";

interface BasicKeypadProps {
  onKey: (label: string) => void;
}

interface KeyDef {
  label: string;
  variant?: KeyVariant;
  labelClass?: string;
}

const ROWS: KeyDef[][] = [
  [
    { label: "C", variant: "danger", labelClass: "text-lg font-bold" },
    { label: "⌫", variant: "danger", labelClass: "text-lg" },
    { label: "%", variant: "fn", labelClass: "text-xl" },
    { label: "÷", variant: "op", labelClass: "text-2xl" },
  ],
  [
    { label: "7", labelClass: "text-xl font-bold" },
    { label: "8", labelClass: "text-xl font-bold" },
    { label: "9", labelClass: "text-xl font-bold" },
    { label: "×", variant: "op", labelClass: "text-2xl" },
  ],
  [
    { label: "4", labelClass: "text-xl font-bold" },
    { label: "5", labelClass: "text-xl font-bold" },
    { label: "6", labelClass: "text-xl font-bold" },
    { label: "−", variant: "op", labelClass: "text-2xl" },
  ],
  [
    { label: "1", labelClass: "text-xl font-bold" },
    { label: "2", labelClass: "text-xl font-bold" },
    { label: "3", labelClass: "text-xl font-bold" },
    { label: "+", variant: "op", labelClass: "text-2xl" },
  ],
  [
    { label: "(", labelClass: "text-lg" },
    { label: ")", labelClass: "text-lg" },
    { label: "0", labelClass: "text-xl font-bold" },
    { label: ".", labelClass: "text-2xl font-bold" },
  ],
];

export const BasicKeypad = memo(function BasicKeypad({ onKey }: BasicKeypadProps) {
  const h = "h-12 sm:h-14";
  let delay = 0;

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-2.5" role="group" aria-label="Basic keypad">
      {ROWS.flat().map((k) => (
        <CalculatorKey
          key={k.label}
          label={k.label}
          variant={k.variant}
          labelClass={k.labelClass}
          onPress={() => onKey(k.label)}
          className={h}
          delay={(delay += 22) - 22}
        />
      ))}
      <CalculatorKey
        label="="
        variant="eq"
        onPress={() => onKey("=")}
        className="col-span-4 h-12 sm:h-14"
        labelClass="text-2xl font-extrabold"
        delay={delay}
      />
    </div>
  );
});
