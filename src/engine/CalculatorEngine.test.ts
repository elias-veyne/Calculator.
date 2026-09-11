/**
 * CalculatorEngine.test.ts
 * ============================================================
 * JUnit-style unit test suite for the calculator engine.
 * Android equivalent: app/src/test/java/.../CalculatorEngineTest.kt
 * running on the JVM via JUnit 4. Here we mirror it with a tiny
 * assertion harness executed in the browser console at startup.
 * ============================================================
 */
import {
  calculateExpression,
  formatResult,
  tokenize,
} from "./CalculatorEngine";

const results: { name: string; pass: boolean; detail?: string }[] = [];
let current = "";

function test(name: string, fn: () => void): void {
  current = name;
  try {
    fn();
    results.push({ name, pass: true });
  } catch (e) {
    results.push({ name, pass: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

function assertApprox(actual: number | null | undefined, expected: number, epsilon = 1e-9): void {
  if (actual === null || actual === undefined || Math.abs(actual - expected) > epsilon) {
    throw new Error(`${current}: expected ≈${expected}, got ${actual}`);
  }
}

function assertError(expr: string, messagePart: string): void {
  const res = calculateExpression(expr);
  if (res.ok) throw new Error(`${current}: "${expr}" should fail, but returned ${res.result.value}`);
  if (!res.error.includes(messagePart)) {
    throw new Error(`${current}: "${expr}" error was "${res.error}", expected to include "${messagePart}"`);
  }
}

/* ------------------- test suite ------------------- */
test("addition of two integers", () => {
  const r = calculateExpression("2+3");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 5);
});

test("operator precedence (× binds tighter than +)", () => {
  const r = calculateExpression("2+3×4");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 14);
});

test("parentheses override precedence", () => {
  const r = calculateExpression("(2+3)×4");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 20);
});

test("division by zero returns error", () => {
  assertError("5÷0", "Cannot divide by zero");
  assertError("1÷(2−2)", "Cannot divide by zero");
});

test("negative numbers via unary minus", () => {
  const r = calculateExpression("−5×3");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, -15);
});

test("trigonometric functions use degrees", () => {
  const sin = calculateExpression("sin(30)");
  const cos = calculateExpression("cos(60)");
  const tan = calculateExpression("tan(45)");
  if (!sin.ok || !cos.ok || !tan.ok) throw new Error("trig failed");
  assertApprox(sin.result.value, 0.5);
  assertApprox(cos.result.value, 0.5);
  assertApprox(tan.result.value, 1);
});

test("tan(90) is undefined", () => {
  assertError("tan(90)", "undefined");
});

test("logarithms", () => {
  const log10 = calculateExpression("log(1000)");
  const ln = calculateExpression("ln(e)");
  if (!log10.ok || !ln.ok) throw new Error("log failed");
  assertApprox(log10.result.value, 3);
  assertApprox(ln.result.value, 1);
});

test("exponentials", () => {
  const sq = calculateExpression("3^4");
  const cube = calculateExpression("2^10");
  if (!sq.ok || !cube.ok) throw new Error("pow failed");
  assertApprox(sq.result.value, 81);
  assertApprox(cube.result.value, 1024);
});

test("factorial", () => {
  const f = calculateExpression("5!");
  if (!f.ok) throw new Error(f.error);
  assertApprox(f.result.value, 120);
});

test("factorial of negative errors", () => {
  assertError("(−3)!", "negative");
});

test("square root", () => {
  const r = calculateExpression("sqrt(144)");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 12);
});

test("square root of negative errors", () => {
  assertError("sqrt(−4)", "negative");
});

test("percentage", () => {
  const r = calculateExpression("25%×200");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 50);
});

test("large number formatting switches to scientific", () => {
  const r = calculateExpression("123456789012345678");
  if (!r.ok) throw new Error(r.error);
  const formatted = formatResult(r.result.value);
  if (!formatted.includes("e")) throw new Error(`expected scientific notation, got ${formatted}`);
});

test("very small numbers use scientific notation", () => {
  const r = calculateExpression("1÷10^12");
  if (!r.ok) throw new Error(r.error);
  const formatted = formatResult(r.result.value);
  if (!formatted.includes("e")) throw new Error(`expected scientific notation, got ${formatted}`);
});

test("implicit multiplication 2(3+4)", () => {
  const r = calculateExpression("2(3+4)");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 14);
});

test("implicit multiplication before functions: 2sin(30)", () => {
  const r = calculateExpression("2sin(30)");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 1);
});

test("factorial then implicit multiply: 2!sin(30)", () => {
  const r = calculateExpression("2!sin(30)");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 1);
});

test("power after unary minus: 2^−3", () => {
  const r = calculateExpression("2^−3");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 0.125);
});

test("deep parentheses and unary chains", () => {
  const r = calculateExpression("((2+3)×(4−1))^2");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 225);
});

test("tokenizer rejects unknown characters", () => {
  const t = tokenize("2 & 3");
  if (typeof t !== "string") throw new Error("expected tokenizer error");
});

test("empty expression errors", () => {
  assertError("", "Empty expression");
});

test("right-associative power: 2^3^2 = 512", () => {
  const r = calculateExpression("2^3^2");
  if (!r.ok) throw new Error(r.error);
  assertApprox(r.result.value, 512);
});

/* ------------------- report ------------------- */
const failed = results.filter((r) => !r.pass);

if (typeof window !== "undefined" && !(window as unknown as { __calcTestsRun?: boolean }).__calcTestsRun) {
  (window as unknown as { __calcTestsRun?: boolean }).__calcTestsRun = true;
  if (failed.length) {
    // eslint-disable-next-line no-console
    console.error(`[NeonCalc] engine tests: ${results.length - failed.length}/${results.length} passed`, failed);
  } else {
    // eslint-disable-next-line no-console
    console.info(`[NeonCalc] engine tests: all ${results.length} passed ✅`);
  }
}

export { results as testResults, assertApprox };
