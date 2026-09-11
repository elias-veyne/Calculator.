/**
 * MemoryBar.kt-compose  →  MemoryBar.tsx
 * ============================================================
 * Memory registers (M+, M−, MR, MC) — always visible, styled
 * like a slim instrument strip with a glowing "M" indicator.
 * ============================================================
 */
import { memo } from "react";
import { formatResult } from "../engine/CalculatorEngine";
import { CalculatorKey } from "./CalculatorKey";

interface MemoryBarProps {
  memory: number | null;
  onMC: () => void;
  onMR: () => void;
  onMPlus: () => void;
  onMMinus: () => void;
}

export const MemoryBar = memo(function MemoryBar({
  memory,
  onMC,
  onMR,
  onMPlus,
  onMMinus,
}: MemoryBarProps) {
  const hasMemory = memory !== null;

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`font-display grid h-6 w-6 shrink-0 place-items-center rounded-md border text-[0.6rem] font-extrabold ${
            hasMemory
              ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-300 glow-cyan"
              : "border-white/10 bg-white/[0.03] text-slate-600"
          }`}
        >
          M
        </span>
        <span className={`font-display truncate text-xs tracking-wide ${hasMemory ? "text-slate-300" : "text-slate-600"}`}>
          {hasMemory ? formatResult(memory as number) : "memory empty"}
        </span>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <CalculatorKey
          label="MC"
          variant="mem"
          onPress={onMC}
          dim={!hasMemory}
          className="h-9 w-11 rounded-lg"
          labelClass="text-xs font-bold"
        />
        <CalculatorKey
          label="MR"
          variant="mem"
          onPress={onMR}
          dim={!hasMemory}
          className="h-9 w-11 rounded-lg"
          labelClass="text-xs font-bold"
        />
        <CalculatorKey
          label="M+"
          variant="mem"
          onPress={onMPlus}
          className="h-9 w-11 rounded-lg"
          labelClass="text-xs font-bold"
        />
        <CalculatorKey
          label="M−"
          variant="mem"
          onPress={onMMinus}
          className="h-9 w-11 rounded-lg"
          labelClass="text-xs font-bold"
        />
      </div>
    </div>
  );
});
