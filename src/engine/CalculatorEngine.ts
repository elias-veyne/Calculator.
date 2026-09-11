/**
 * CalculatorEngine.kt  →  CalculatorEngine.ts
 * ============================================================
 * Pure, side-effect-free math core (mirrors the Android Kotlin
 * engine 1:1). Tokenizes an expression string, evaluates it with
 * a shunting-yard algorithm (correct operator precedence), and
 * formats results for display.
 *
 * All functions return `null` for a valid expression and a
 * human-readable message for any error — never throws.
 * ============================================================
 */

export interface EngineResult {
  value: number;
  expression: string; // normalized expression (e.g. "sin(45+5)")
}

export type EvalResult =
  | { ok: true; result: EngineResult }
  | { ok: false; error: string };

/* ------------------------------------------------------------
 * Tokens
 * ---------------------------------------------------------- */
type TokenType = "num" | "op" | "func" | "lparen" | "rparen";

interface Token {
  type: TokenType;
  value: string;
  prec: number; // operator precedence (higher binds tighter)
  rightAssoc: boolean;
}

type OpKind =
  | "plus" | "minus" | "times" | "div" | "mod" | "pow"
  | "unaryNeg" | "unaryPlus"
  | "sin" | "cos" | "tan" | "asin" | "acos" | "atan"
  | "log" | "ln" | "sqrt" | "cbrt" | "fact" | "percent";

interface Node {
  kind: "num" | "op";
  num?: number;
  op?: OpKind;
  children?: Node[];
}

const EPSILON = 1e-12;

/* ------------------------------------------------------------
 * Tokenizer — turns "sin(30)+2" into a token list
 * ---------------------------------------------------------- */
const FUNC_NAMES = ["asin", "acos", "atan", "cbrt", "sin", "cos", "tan", "log", "ln", "sqrt"];

export function tokenize(expression: string): Token[] | string {
  const tokens: Token[] = [];
  let i = 0;
  let prev: TokenType | null = null;
  const expr = expression.replace(/\s+/g, "");

  const pushOp = (value: string): void => {
    if (value === "^") tokens.push({ type: "op", value, prec: 4, rightAssoc: true });
    if (value === "×" || value === "*") tokens.push({ type: "op", value: "×", prec: 2, rightAssoc: false });
    if (value === "÷" || value === "/") tokens.push({ type: "op", value: "÷", prec: 2, rightAssoc: false });
    if (value === "%") tokens.push({ type: "op", value: "%", prec: 2, rightAssoc: false });
    if (value === "+") tokens.push({ type: "op", value: "+", prec: 1, rightAssoc: false });
    if (value === "−" || value === "-") tokens.push({ type: "op", value: "−", prec: 1, rightAssoc: false });
  };

  while (i < expr.length) {
    const ch = expr[i];

    // numbers: digits with decimal points, and '.5'-style entries
    if (/\d/.test(ch) || (ch === "." && /\d/.test(expr[i + 1] ?? ""))) {
      let j = i;
      let digits = 0;
      while (j < expr.length && (/\d/.test(expr[j]) || expr[j] === ".")) {
        if (/\d/.test(expr[j])) digits++;
        j++;
      }
      const raw = expr.slice(i, j);
      if (raw === "." || digits === 0) return `Invalid number format near "${raw}"`;
      const num = Number(raw);
      if (!Number.isFinite(num)) return "Number is too large";
      tokens.push({ type: "num", value: raw, prec: 0, rightAssoc: false });
      i = j;
      prev = "num";
      continue;
    }

    // function names
    const name = FUNC_NAMES.find((f) => expr.startsWith(f, i));
    if (name) {
      tokens.push({ type: "func", value: name, prec: 5, rightAssoc: false });
      i += name.length;
      prev = "func";
      continue;
    }

    if (ch === "!") {
      tokens.push({ type: "op", value: "!", prec: 5, rightAssoc: false });
      i++;
      prev = "op";
      continue;
    }
    if (ch === "π") {
      tokens.push({ type: "num", value: String(Math.PI), prec: 0, rightAssoc: false });
      i++;
      prev = "num";
      continue;
    }
    if (ch === "e") {
      tokens.push({ type: "num", value: String(Math.E), prec: 0, rightAssoc: false });
      i++;
      prev = "num";
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen", value: "(", prec: 0, rightAssoc: false });
      i++;
      prev = "lparen";
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ")", prec: 0, rightAssoc: false });
      i++;
      prev = "rparen";
      continue;
    }
    if ("^×*/%+−-".includes(ch)) {
      // implicit multiplication before an operator at the very start?
      const unaryOk = prev === null || prev === "op" || prev === "lparen" || prev === "func";
      if (ch === "-" || ch === "−") {
        if (unaryOk) tokens.push({ type: "op", value: "−", prec: 3, rightAssoc: true });
        else pushOp("−");
      } else if (ch === "+") {
        if (unaryOk) tokens.push({ type: "op", value: "+", prec: 3, rightAssoc: true });
        else pushOp("+");
      } else if (ch === "%") {
        if (unaryOk) return "Unexpected % — it must follow a number";
        pushOp("%");
      } else if (unaryOk) {
        return `Unexpected operator "${ch}"`;
      } else {
        pushOp(ch);
      }
      i++;
      prev = "op";
      continue;
    }
    return `Unsupported character "${ch}"`;
  }
  return tokens;
}

/* ------------------------------------------------------------
 * Parser — tokens → AST (shunting-yard)
 * ---------------------------------------------------------- */
export function parse(tokens: Token[]): Node[] | string {
  const output: Node[] = [];
  const stack: Token[] = [];

  const topOp = (): Token | null => (stack.length ? stack[stack.length - 1] : null);
  const isOpToken = (t: Token | null): boolean => t !== null && t.type === "op";

  const flushUntilParen = (): string | null => {
    while (stack.length && topOp()!.type !== "lparen") {
      const err = emitOp(stack.pop()!);
      if (err) return err;
    }
    if (!stack.length) return "Mismatched parentheses";
    stack.pop(); // drop the '('
    return null;
  };

  const emitOp = (tok: Token): string | null => {
    const op = opFromToken(tok);
    const isUnary = op === "unaryNeg" || op === "unaryPlus";
    const arity = isUnary ? 1 : op === "fact" || op === "percent" ? 1 : 2;
    if (output.length < arity) {
      return `${tok.value} is missing an operand`;
    }
    if (isUnary) {
      output.push({ kind: "op", op, children: [output.pop()!] });
    } else if (arity === 1) {
      output.push({ kind: "op", op, children: [output.pop()!] });
    } else {
      const b = output.pop()!;
      const a = output.pop()!;
      output.push({ kind: "op", op, children: [a, b] });
    }
    return null;
  };

  /** Push an implicit "×" with full precedence handling (it is a normal
   *  binary operator that is still waiting for its right operand). */
  const pushImplicitMultiply = (): void => {
    const implicitTok: Token = { type: "op", value: "×", prec: 2, rightAssoc: false };
    while (
      isOpToken(topOp()) &&
      (topOp()!.prec > implicitTok.prec || (topOp()!.prec === implicitTok.prec && !implicitTok.rightAssoc))
    ) {
      emitOp(stack.pop()!);
    }
    stack.push(implicitTok);
  };

  /** Does the last emitted node read as a value that can be multiplied? */
  const previousIsValue = (): boolean => {
    if (!output.length) return false;
    const last = output[output.length - 1];
    return (
      last.kind === "num" ||
      (last.kind === "op" &&
        (last.op === "fact" || last.op === "percent" || last.op === "unaryNeg" || last.op === "unaryPlus"))
    );
  };

  for (const tok of tokens) {
    switch (tok.type) {
      case "num":
        output.push({ kind: "num", num: Number(tok.value) });
        break;

      case "func":
        // Implicit multiplication before functions: "2sin(30)", "2!sin(30)"
        if (previousIsValue()) pushImplicitMultiply();
        stack.push(tok);
        break;

      case "lparen":
        // Implicit multiplication before parentheses: "2(", ")(", "!("
        if (previousIsValue()) pushImplicitMultiply();
        stack.push(tok);
        break;

      case "rparen": {
        const err = flushUntilParen();
        if (err) return err;
        if (stack.length && stack[stack.length - 1].type === "func") {
          const fn = stack.pop()!;
          if (!output.length) return `${fn.value}() needs a number inside`;
          output.push({ kind: "op", op: fn.value as OpKind, children: [output.pop()!] });
        }
        break;
      }

      case "op": {
        while (
          isOpToken(topOp()) &&
          (topOp()!.prec > tok.prec || (topOp()!.prec === tok.prec && !tok.rightAssoc))
        ) {
          const err = emitOp(stack.pop()!);
          if (err) return err;
        }
        stack.push(tok);
        break;
      }
    }
  }

  while (stack.length) {
    if (stack[stack.length - 1].type === "lparen" || stack[stack.length - 1].type === "func") {
      return "Missing closing parenthesis";
    }
    const err = emitOp(stack.pop()!);
    if (err) return err;
  }

  if (output.length !== 1) return "Incomplete expression";
  return output;
}

function opFromToken(tok: Token): OpKind {
  switch (tok.value) {
    case "−":
      return tok.prec === 3 ? "unaryNeg" : "minus";
    case "+":
      return tok.prec === 3 ? "unaryPlus" : "plus";
    case "×": return "times";
    case "÷": return "div";
    case "%": return "percent";
    case "^": return "pow";
    case "!": return "fact";
    case "sin": return "sin";
    case "cos": return "cos";
    case "tan": return "tan";
    case "asin": return "asin";
    case "acos": return "acos";
    case "atan": return "atan";
    case "log": return "log";
    case "ln": return "ln";
    case "sqrt": return "sqrt";
    case "cbrt": return "cbrt";
    default: return "plus";
  }
}

/* ------------------------------------------------------------
 * Evaluator — walks the AST
 * ---------------------------------------------------------- */
export function evaluate(node: Node): number | string {
  if (node.kind === "num") return node.num ?? 0;

  const child = (idx: number): number => {
    const res = evaluate(node.children![idx]);
    if (typeof res === "string") throw new Error(res);
    return res;
  };
  const unary = (): number => child(0);

  switch (node.op) {
    case "plus": return child(0) + child(1);
    case "minus": return child(0) - child(1);
    case "times": return child(0) * child(1);

    case "div": {
      const b = child(1);
      if (Math.abs(b) < EPSILON) throw new Error("Cannot divide by zero");
      return child(0) / b;
    }

    case "mod": {
      const b = child(1);
      if (Math.abs(b) < EPSILON) throw new Error("Cannot divide by zero");
      return child(0) % b;
    }

    case "pow": {
      const a = child(0);
      const b = child(1);
      if (a === 0 && b < 0) throw new Error("Division by zero (negative power)");
      const r = Math.pow(a, b);
      if (!Number.isFinite(r)) throw new Error("Result is not a finite number");
      return r;
    }

    case "unaryNeg": return -unary();
    case "unaryPlus": return unary();

    case "fact": {
      const x = unary();
      if (x < 0) throw new Error("Factorial of a negative number");
      if (!Number.isInteger(x)) throw new Error("Factorial needs an integer");
      if (x > 170) throw new Error("Factorial result too large");
      let r = 1;
      for (let k = 2; k <= x; k++) r *= k;
      return r;
    }

    case "percent": return unary() / 100;

    case "sqrt": {
      const x = unary();
      if (x < 0) throw new Error("Square root of a negative number");
      return Math.sqrt(x);
    }

    case "cbrt": return Math.cbrt(unary());

    case "sin": {
      const v = Math.sin((unary() * Math.PI) / 180);
      return Math.abs(v) < EPSILON ? 0 : v;
    }
    case "cos": {
      const v = Math.cos((unary() * Math.PI) / 180);
      return Math.abs(v) < EPSILON ? 0 : v;
    }
    case "tan": {
      const deg = ((unary() % 180) + 180) % 180;
      if (Math.abs(deg - 90) < EPSILON) throw new Error("tan(90°) is undefined");
      const v = Math.tan((deg * Math.PI) / 180);
      return Math.abs(v) < EPSILON ? 0 : v;
    }
    case "asin": {
      const x = unary();
      if (x < -1 || x > 1) throw new Error("asin needs a value in [-1, 1]");
      return (Math.asin(x) * 180) / Math.PI;
    }
    case "acos": {
      const x = unary();
      if (x < -1 || x > 1) throw new Error("acos needs a value in [-1, 1]");
      return (Math.acos(x) * 180) / Math.PI;
    }
    case "atan": return (Math.atan(unary()) * 180) / Math.PI;

    case "log": {
      const x = unary();
      if (x <= 0) throw new Error("log needs a positive number");
      return Math.log10(x);
    }

    case "ln": {
      const x = unary();
      if (x <= 0) throw new Error("ln needs a positive number");
      return Math.log(x);
    }

    default:
      throw new Error("Unknown operation");
  }
}

/* ------------------------------------------------------------
 * Normalizer — rewrites "sin(" → "sin(" isn't needed for display,
 * but we do produce a canonical rendering used in history.
 * ---------------------------------------------------------- */
export function normalizeExpression(expr: string): string {
  return expr.replace(/√/g, "sqrt");
}

/* ------------------------------------------------------------
 * Formatting — plain notation (up to 10+ decimals) + scientific
 * for very large/small values, with clean rounding.
 * ---------------------------------------------------------- */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  if (Object.is(value, -0)) value = 0;

  const abs = Math.abs(value);

  if (value !== 0 && (abs >= 1e16 || abs < 1e-9)) {
    const exp = Math.floor(Math.log10(abs));
    const mantissa = value / Math.pow(10, exp);
    const m = roundForDisplay(mantissa, 8);
    return `${m}e${exp}`;
  }

  return roundForDisplay(value, 10);
}

/** Rounds to `digits` significant decimals, trimming trailing zeros. */
function roundForDisplay(value: number, maxDecimals: number): string {
  const fixed = value.toFixed(maxDecimals);
  if (!fixed.includes(".")) return fixed;

  let end = fixed.length;
  while (end > 0 && fixed[end - 1] === "0") end--;
  if (fixed[end - 1] === ".") end--;
  return fixed.slice(0, end);
}

export function formatForDisplay(value: number): string {
  return formatResult(value);
}

/* ------------------------------------------------------------
 * Public entry point
 * ---------------------------------------------------------- */
export function calculateExpression(rawExpression: string): EvalResult {
  try {
    const expression = rawExpression.replace(/√/g, "sqrt");
    if (expression.trim().length === 0) return { ok: false, error: "Empty expression" };

    const tokens = tokenize(expression);
    if (typeof tokens === "string") return { ok: false, error: tokens };

    const nodes = parse(tokens);
    if (typeof nodes === "string") return { ok: false, error: nodes };

    const result = evaluate(nodes[0]);
    if (typeof result === "string") return { ok: false, error: result };
    if (!Number.isFinite(result)) return { ok: false, error: "Result is not a finite number" };

    return { ok: true, result: { value: result, expression } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // Only surface user-friendly, intentional error messages; mask the rest.
    const knownErrors = ["Cannot", "Result", "Factorial", "Square", "tan", "asin", "acos", "log", "ln", "Division"];
    const friendly = knownErrors.some((prefix) => message.startsWith(prefix));
    return { ok: false, error: friendly ? message : "Invalid expression" };
  }
}

/* ------------------------------------------------------------
 * Built-in unit tests (JUnit-equivalent). Runs once at app start
 * and logs to the console — see also src/engine/CalculatorEngine.test.ts
 * ---------------------------------------------------------- */
interface TestCase {
  name: string;
  expr: string;
  expected: number;
}

export function runEngineTests(): { passed: number; failed: number } {
  const tests: TestCase[] = [
    { name: "basic addition", expr: "2+3", expected: 5 },
    { name: "multiplication", expr: "7×8", expected: 56 },
    { name: "division", expr: "9÷4", expected: 2.25 },
    { name: "operator precedence", expr: "2+3×4", expected: 14 },
    { name: "parentheses", expr: "(2+3)×4", expected: 20 },
    { name: "power", expr: "2^10", expected: 1024 },
    { name: "negative unary", expr: "−5+3", expected: -2 },
    { name: "negative multiply", expr: "5×−3", expected: -15 },
    { name: "sine degrees", expr: "sin(30)", expected: 0.5 },
    { name: "cosine degrees", expr: "cos(180)", expected: -1 },
    { name: "tangent 45", expr: "tan(45)", expected: 1 },
    { name: "log base 10", expr: "log(1000)", expected: 3 },
    { name: "natural log", expr: "ln(e)", expected: 1 },
    { name: "sqrt 144", expr: "sqrt(144)", expected: 12 },
    { name: "factorial", expr: "5!", expected: 120 },
    { name: "percent", expr: "25%×200", expected: 50 },
    { name: "implicit multiply", expr: "2(3+4)", expected: 14 },
    { name: "e constant", expr: "e^0", expected: 1 },
    { name: "π constant", expr: "π", expected: Math.PI },
    { name: "deep precedence", expr: "10−3×2", expected: 4 },
    { name: "nested powers", expr: "2^3^2", expected: 512 },
    { name: "decimals", expr: "0.1+0.2", expected: 0.3 },
  ];

  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    const res = calculateExpression(t.expr);
    if (res.ok && Math.abs(res.result.value - t.expected) < 1e-9) {
      passed++;
    } else {
      failed++;
      // eslint-disable-next-line no-console
      console.error(`[EngineTest] FAIL ${t.name}: ${t.expr} → ${res.ok ? res.result.value : res.error}`);
    }
  }

  const errorCases = [
    { expr: "5÷0", error: "Cannot divide by zero" },
    { expr: "sqrt(−4)", error: "Square root of a negative number" },
    { expr: "tan(90)", error: "tan(90°) is undefined" },
    { expr: "(−3)!", error: "Factorial of a negative number" },
    { expr: "log(−2)", error: "log needs a positive number" },
    { expr: "asin(2)", error: "asin needs a value in [-1, 1]" },
  ];
  for (const t of errorCases) {
    const res = calculateExpression(t.expr);
    if (!res.ok && res.error === t.error) {
      passed++;
    } else {
      failed++;
      // eslint-disable-next-line no-console
      console.error(`[EngineTest] FAIL error-case ${t.expr} → ${res.ok ? res.result.value : res.error}`);
    }
  }

  // eslint-disable-next-line no-console
  console.info(`[NeonCalc] engine self-tests: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
