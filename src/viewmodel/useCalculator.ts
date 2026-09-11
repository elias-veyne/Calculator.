/**
 * CalculatorViewModel.kt  →  useCalculator.ts
 * ============================================================
 * MVVM state holder for the calculator. Owns the single source
 * of truth: current input expression, live answer, memory slots,
 * history, and mode toggles. Exposes pure actions that mutate
 * state immutably — the UI layer (CalculatorScreen) only calls
 * actions, exactly like a Compose ViewModel.
 * ============================================================
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { calculateExpression, formatForDisplay, formatResult } from "../engine/CalculatorEngine";

export type CalcMode = "basic" | "scientific";
export type EnginePhase = "idle" | "success" | "error";

export interface HistoryEntry {
  id: number;
  expression: string;
  result: string;
  at: number;
}

export interface CalcState {
  /** Raw expression being typed, e.g. "12+sin(30)×2" */
  input: string;
  /** Live answer preview, or null while typing / on error */
  answer: number | null;
  phase: EnginePhase;
  memory: number | null;
  history: HistoryEntry[];
  mode: CalcMode;
  radian: boolean;
  lastAnswer: number | null;
  /** Increments every time a new result lands (drives display animation) */
  resultNonce: number;
}

const initialState = (): CalcState => ({
  input: "",
  answer: null,
  phase: "idle",
  memory: null,
  history: [],
  mode: "basic",
  radian: false,
  lastAnswer: null,
  resultNonce: 0,
});

const MAX_HISTORY = 30;
const MAX_INPUT_LENGTH = 180;

export interface CalculatorActions {
  press: (key: string) => void;
  equals: () => void;
  clear: () => void;
  backspace: () => void;
  toggleMode: () => void;
  toggleRadian: () => void;
  clearHistory: () => void;
  clearMemory: () => void;
  memoryPlus: () => void;
  memoryMinus: () => void;
  memoryRecall: () => void;
  deleteHistoryEntry: (id: number) => void;
  pressAns: () => void;
  /** Inserts a raw numeric value, e.g. MR / history tap. */
  insertValue: (value: string) => void;
  /** Returns true when a physical keyboard key was consumed. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/* ------------------------------------------------------------------
 * Digit sequences — the append rules used by press()
 * ------------------------------------------------------------------ */
const isDigit = (k: string) => /^\d$/.test(k);

const isTrigFunc = (k: string) =>
  ["sin", "cos", "tan", "asin", "acos", "atan"].includes(k);

const INPUT_SETS: Record<string, string> = {
  "√": "sqrt(", "³√": "cbrt(",
};

export function useCalculator(): { state: CalcState; actions: CalculatorActions } {
  const [state, setState] = useState<CalcState>(initialState);
  const idRef = useRef(1);

  /* --- tiny immutable-state helpers --------------------------------- */
  const patch = useCallback((partial: Partial<CalcState> | ((s: CalcState) => Partial<CalcState>)) => {
    setState((prev) => ({ ...prev, ...(typeof partial === "function" ? partial(prev) : partial) }));
  }, []);

  /* ------------------------------------------------------------------
   * PRESS — append tokens to the expression, guarding against invalid
   * sequences (e.g. two operators in a row).
   * ------------------------------------------------------------------ */
  const press = useCallback((rawKey: string) => {
    const key = INPUT_SETS[rawKey] ?? rawKey;
    setState((s) => {
      // After a completed result, decide whether to chain or start fresh:
      //  · operators keep the expression and the answer preview (chaining)
      //  · anything else clears the preview; "." chains onto the answer value
      let input = s.input;
      let answer: number | null = s.answer;
      let phase: EnginePhase = s.phase;
      if (phase === "success") {
        const chains = ["+", "−", "×", "÷", "%", "^", ")"].includes(key);
        if (!chains) {
          phase = "idle";
          answer = null;
          if (key === "." && input === "") {
            input = formatResult(s.answer ?? 0); // e.g. 5= → "." → "5."
          }
        }
      }
      // Any key after an error starts fresh
      if (phase === "error") {
        input = "";
        answer = null;
        phase = "idle";
      }

      // Guard expression length
      if (input.length >= MAX_INPUT_LENGTH) return { ...s, input, answer, phase };

      /* eˣ — exponential: inserts "e^" with implicit multiplication */
      if (key === "eˣ") {
        if (input !== "" && !/[+\-−×÷(%^]$/.test(input)) input += "×";
        return { ...s, input: input + "e^", answer, phase };
      }

      /* Digits */
      if (isDigit(key) || key === ".") {
        // Prevent a second decimal point in the current number
        const currentNumber = input.split(/[^0-9.]/).pop() ?? "";
        if (key === "." && currentNumber.includes(".")) return { ...s, input, answer, phase };
        return { ...s, input: input + key, answer, phase };
      }

      /* Scientific functions — implicit × when chained after a value */
      if (isTrigFunc(key) || key === "log" || key === "ln") {
        if (input !== "" && !/[+\-−×÷(%^]$/.test(input)) input += "×";
        return { ...s, input: input + key + "(", answer, phase };
      }
      if (key === "sqrt(" || key === "cbrt(") {
        if (input !== "" && !/[+\-−×÷(%^]$/.test(input)) input += "×";
        return { ...s, input: input + key, answer, phase };
      }
      if (key === "(") {
        if (input.endsWith("(")) return { ...s, input, answer, phase };
        return { ...s, input: input + key, answer, phase };
      }
      if (key === ")") {
        const opens = (input.match(/\(/g) ?? []).length;
        const closes = (input.match(/\)/g) ?? []).length;
        const endsBlocked = !input || /[+\-−×÷(%^]$/.test(input) || input.endsWith("(");
        if (closes >= opens || endsBlocked) return { ...s, input, answer, phase };
        return { ...s, input: input + ")", answer, phase };
      }

      /* Constants */
      if (key === "π" || key === "e") {
        if (input && !/[+\-−×÷(%^]$/.test(input)) {
          input += "×"; // implicit multiplication: "2π"
        }
        return { ...s, input: input + key, answer, phase };
      }

      /* Binary operators + − × ÷ ^ % */
      if (["+", "−", "×", "÷", "^", "%"].includes(key)) {
        // Leading position: only unary minus is meaningful
        if (input === "") {
          if (key === "−") return { ...s, input: "−", answer, phase };
          return { ...s, input, answer, phase };
        }
        // Right after an opening parenthesis only unary minus is allowed
        if (input.endsWith("(")) {
          if (key === "−") return { ...s, input: input + "−", answer, phase };
          return { ...s, input, answer, phase };
        }
        // An operator is already at the end of the expression
        if (/[+\-−×÷%^]$/.test(input)) {
          // unary minus inside powers: "5^−"
          if (key === "−" && input.endsWith("^")) {
            return { ...s, input: input + "−", answer, phase };
          }
          // lone leading "−": keep it, ignore other operators
          if (input.length === 1 && key !== "−") return { ...s, input, answer, phase };
          // "(−" + operator: only keep replacing with "−"
          if (input.length >= 2 && input[input.length - 2] === "(" && key !== "−") {
            return { ...s, input, answer, phase };
          }
          // otherwise replace the trailing operator (typing "5+×" → "5×")
          return { ...s, input: input.slice(0, -1) + key, answer, phase };
        }
        return { ...s, input: input + key, answer, phase };
      }

      /* Postfix factorial */
      if (key === "!") {
        if (!input || /[+\-−×÷(%^]$/.test(input)) return { ...s, input, answer, phase };
        return { ...s, input: input + "!", answer, phase };
      }

      /* Memory keys are handled by dedicated actions */
      return { ...s, input, answer, phase };
    });
  }, []);

  /* ------------------------------------------------------------------
   * EQUALS — evaluate the expression through the engine
   * ------------------------------------------------------------------ */
  const equals = useCallback(() => {
    setState((s) => {
      const input = s.input.trim();
      if (!input) return s;

      const res = calculateExpression(input);
      if (!res.ok) {
        // bump the nonce so the error-shake animation replays on repeat "="
        return { ...s, phase: "error", answer: null, resultNonce: s.resultNonce + 1 };
      }

      const id = idRef.current++;
      const historyEntry: HistoryEntry = {
        id,
        expression: input,
        result: formatResult(res.result.value),
        at: Date.now(),
      };

      return {
        ...s,
        input: input,
        answer: res.result.value,
        phase: "success",
        lastAnswer: res.result.value,
        resultNonce: s.resultNonce + 1,
        history: [historyEntry, ...s.history].slice(0, MAX_HISTORY),
      };
    });
  }, []);

  /* ------------------------------------------------------------------
   * CLEAR / BACKSPACE
   * ------------------------------------------------------------------ */
  const clear = useCallback(() => {
    patch({ input: "", answer: null, phase: "idle" });
  }, [patch]);

  const backspace = useCallback(() => {
    setState((s) => {
      if (s.phase === "success" || s.phase === "error") {
        return { ...s, input: "", answer: null, phase: "idle" };
      }
      if (s.input === "") return s;
      const functionNames = ["asin(", "acos(", "atan(", "cbrt(", "sqrt(", "sin(", "cos(", "tan(", "log(", "ln("];
      for (const fn of functionNames) {
        if (s.input.endsWith(fn)) {
          return { ...s, input: s.input.slice(0, -fn.length) };
        }
      }
      return { ...s, input: s.input.slice(0, -1) };
    });
  }, []);

  /* ------------------------------------------------------------------
   * INSERT VALUE — used by MR, Ans and history taps.
   * Applies implicit multiplication when chaining after a number.
   * ------------------------------------------------------------------ */
  const insertValue = useCallback((value: string) => {
    setState((s) => {
      if (s.phase === "success" || s.phase === "error") {
        return { ...s, input: value, answer: null, phase: "idle" };
      }
      if (s.input !== "" && !/[+\-−×÷(%^]$/.test(s.input)) {
        return { ...s, input: s.input + "×" + value };
      }
      return { ...s, input: s.input + value };
    });
  }, []);

  const pressAns = useCallback(() => {
    setState((s) => {
      if (s.lastAnswer === null) return s;
      const value = formatResult(s.lastAnswer);
      if (s.phase === "success" || s.phase === "error") {
        return { ...s, input: value, answer: null, phase: "idle" };
      }
      if (s.input !== "" && !/[+\-−×÷(%^]$/.test(s.input)) {
        return { ...s, input: s.input + "×" + value };
      }
      return { ...s, input: s.input + value };
    });
  }, []);

  /* ------------------------------------------------------------------
   * MODE TOGGLES
   * ------------------------------------------------------------------ */
  const toggleMode = useCallback(() => {
    patch((s) => ({ mode: s.mode === "basic" ? "scientific" : "basic" }));
  }, [patch]);

  const toggleRadian = useCallback(() => {
    patch((s) => ({ radian: !s.radian }));
  }, [patch]);

  /* ------------------------------------------------------------------
   * MEMORY (M+, M−, MR, MC)
   * ------------------------------------------------------------------ */
  const currentValue = useCallback((s: CalcState): number | null => {
    if (s.phase === "success" && s.answer !== null) return s.answer;
    const res = s.input.trim() ? calculateExpression(s.input) : null;
    if (res && res.ok) return res.result.value;
    return null;
  }, []);

  const memoryPlus = useCallback(() => {
    setState((s) => {
      const v = currentValue(s);
      if (v === null) return s;
      return { ...s, memory: (s.memory ?? 0) + v };
    });
  }, [currentValue]);

  const memoryMinus = useCallback(() => {
    setState((s) => {
      const v = currentValue(s);
      if (v === null) return s;
      return { ...s, memory: (s.memory ?? 0) - v };
    });
  }, [currentValue]);

  const memoryRecall = useCallback(() => {
    setState((s) => {
      if (s.memory === null) return s;
      const value = formatResult(s.memory);
      if (s.phase === "success" || s.phase === "error") {
        return { ...s, input: value, answer: null, phase: "idle" };
      }
      // Append to current input with implicit multiplication when needed
      if (s.input !== "" && !/[+\-−×÷(%^]$/.test(s.input)) {
        return { ...s, input: s.input + "×" + value };
      }
      return { ...s, input: s.input + value };
    });
  }, []);

  const clearMemory = useCallback(() => {
    patch({ memory: null });
  }, [patch]);

  const clearHistory = useCallback(() => {
    patch({ history: [] });
  }, [patch]);

  const deleteHistoryEntry = useCallback((id: number) => {
    setState((s) => ({ ...s, history: s.history.filter((h) => h.id !== id) }));
  }, []);

  /* ------------------------------------------------------------------
   * PHYSICAL KEYBOARD SUPPORT
   * Maps: 0-9 .  + - * / ( ) % ^ ! Enter Backspace Escape =  p e
   * ------------------------------------------------------------------ */
  const onKeyDown = useCallback(
    (event: KeyboardEvent): boolean => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return false;
      }

      const k = event.key;
      const shift = event.shiftKey;

      if (/^[0-9]$/.test(k)) {
        press(k);
        return true;
      }
      switch (k) {
        case ".": press("."); return true;
        case ",": press("."); return true;
        case "+": press("+"); return true;
        case "-": press("−"); return true;
        case "*": press("×"); return true;
        case "/": press("÷"); return true;
        case "%": press("%"); return true;
        case "^": press("^"); return true;
        case "!": press("!"); return true;
        case "(": press("("); return true;
        case ")": press(")"); return true;
        case "=": case "Enter": event.preventDefault(); equals(); return true;
        case "Backspace": backspace(); return true;
        case "Delete": clear(); return true;
        case "Escape": clear(); return true;
        case "p": if (!shift) { press("π"); return true; } break;
        case "e": if (!shift) { press("e"); return true; } break;
        default: break;
      }
      return false;
    },
    [press, equals, clear, backspace]
  );

  const actions: CalculatorActions = useMemo(
    () => ({
      press,
      equals,
      clear,
      backspace,
      toggleMode,
      toggleRadian,
      clearHistory,
      clearMemory,
      memoryPlus,
      memoryMinus,
      memoryRecall,
      deleteHistoryEntry,
      pressAns,
      insertValue,
      onKeyDown,
    }),
    [press, equals, clear, backspace, toggleMode, toggleRadian, clearHistory, deleteHistoryEntry, clearMemory, memoryPlus, memoryMinus, memoryRecall, pressAns, insertValue, onKeyDown]
  );

  return { state, actions };
}

/** Format a value for display in the readout (used by UI components). */
export function displayValue(v: number | null): string {
  return v === null ? "" : formatForDisplay(v);
}
