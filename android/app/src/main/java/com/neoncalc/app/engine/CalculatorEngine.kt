package com.neoncalc.app.engine

import java.util.Locale
import kotlin.math.E
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.log10
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tan

/**
 * CalculatorEngine — pure, side-effect-free math core (JVM only, so it is
 * fully unit-testable). Tokenizes an expression string, evaluates it with a
 * shunting-yard algorithm (correct operator precedence, right-associative
 * powers, unary minus) and formats results for display.
 *
 * All functions return [EvalResult.Failure] with a human-readable message
 * for invalid input — they never throw past this object's public API.
 */
object CalculatorEngine {

    private const val EPSILON = 1e-12

    /** Public result type. */
    sealed interface EvalResult {
        data class Success(val value: Double, val expression: String) : EvalResult
        data class Failure(val error: String) : EvalResult
    }

    /* ---------------------------------------------------------
     * Tokens
     * ------------------------------------------------------- */
    private enum class TokenType { NUM, OP, FUNC, LPAREN, RPAREN }

    private data class Token(
        val type: TokenType,
        val value: String,
        val precedence: Int,
        val rightAssoc: Boolean,
    )

    private enum class OpKind {
        PLUS, MINUS, TIMES, DIV, POW,
        UNARY_NEG, UNARY_PLUS,
        SIN, COS, TAN, ASIN, ACOS, ATAN,
        LOG, LN, SQRT, CBRT, FACT, PERCENT,
    }

    private sealed class Node {
        data class Num(val num: Double) : Node()
        data class Op(val op: OpKind, val children: List<Node>) : Node()
    }

    private val FUNCTION_NAMES =
        listOf("asin", "acos", "atan", "cbrt", "sin", "cos", "tan", "log", "ln", "sqrt")

    /* ---------------------------------------------------------
     * Tokenizer — "sin(30)+2" → token list
     * ------------------------------------------------------- */
    private fun tokenize(rawExpression: String): Result<List<Token>> {
        val expr = rawExpression.replace(Regex("\\s+"), "")
        val tokens = mutableListOf<Token>()
        var i = 0
        var prev: TokenType? = null

        fun pushOperator(value: String) {
            when (value) {
                "^" -> tokens.add(Token(TokenType.OP, value, 4, rightAssoc = true))
                "×", "*" -> tokens.add(Token(TokenType.OP, "×", 2, rightAssoc = false))
                "÷", "/" -> tokens.add(Token(TokenType.OP, "÷", 2, rightAssoc = false))
                "%" -> tokens.add(Token(TokenType.OP, "%", 2, rightAssoc = false))
                "+" -> tokens.add(Token(TokenType.OP, "+", 1, rightAssoc = false))
                "−", "-" -> tokens.add(Token(TokenType.OP, "−", 1, rightAssoc = false))
            }
        }

        while (i < expr.length) {
            val ch = expr[i]

            // numbers: digits with decimal points, ".5"-style entries included
            if (ch.isDigit() || (ch == '.' && i + 1 < expr.length && expr[i + 1].isDigit())) {
                var j = i
                var digits = 0
                while (j < expr.length && (expr[j].isDigit() || expr[j] == '.')) {
                    if (expr[j].isDigit()) digits++
                    j++
                }
                val raw = expr.substring(i, j)
                if (raw == "." || digits == 0) {
                    return Result.failure(IllegalArgumentException("Invalid number format near \"$raw\""))
                }
                val num = raw.toDoubleOrNull()
                    ?: return Result.failure(IllegalArgumentException("Number is too large"))
                tokens.add(Token(TokenType.NUM, raw, 0, rightAssoc = false))
                i = j
                prev = TokenType.NUM
                continue
            }

            // function names
            val name = FUNCTION_NAMES.firstOrNull { expr.startsWith(it, i) }
            if (name != null) {
                tokens.add(Token(TokenType.FUNC, name, 5, rightAssoc = false))
                i += name.length
                prev = TokenType.FUNC
                continue
            }

            when (ch) {
                '!' -> {
                    tokens.add(Token(TokenType.OP, "!", 5, rightAssoc = false))
                    prev = TokenType.OP
                }
                'π' -> {
                    tokens.add(Token(TokenType.NUM, PI.toString(), 0, rightAssoc = false))
                    prev = TokenType.NUM
                }
                'e' -> {
                    tokens.add(Token(TokenType.NUM, E.toString(), 0, rightAssoc = false))
                    prev = TokenType.NUM
                }
                '(' -> {
                    tokens.add(Token(TokenType.LPAREN, "(", 0, rightAssoc = false))
                    prev = TokenType.LPAREN
                }
                ')' -> {
                    tokens.add(Token(TokenType.RPAREN, ")", 0, rightAssoc = false))
                    prev = TokenType.RPAREN
                }
                else -> {
                    if ("^×*/%+−-".contains(ch)) {
                        val unaryOk = prev == null || prev == TokenType.OP ||
                            prev == TokenType.LPAREN || prev == TokenType.FUNC
                        when {
                            ch == '-' || ch == '−' ->
                                if (unaryOk) tokens.add(Token(TokenType.OP, "−", 3, rightAssoc = true))
                                else pushOperator("−")
                            ch == '+' ->
                                if (unaryOk) tokens.add(Token(TokenType.OP, "+", 3, rightAssoc = true))
                                else pushOperator("+")
                            ch == '%' -> {
                                if (unaryOk) return Result.failure(
                                    IllegalArgumentException("Unexpected % — it must follow a number")
                                )
                                pushOperator("%")
                            }
                            unaryOk ->
                                return Result.failure(IllegalArgumentException("Unexpected operator \"$ch\""))
                            else -> pushOperator(ch.toString())
                        }
                        prev = TokenType.OP
                    } else {
                        return Result.failure(IllegalArgumentException("Unsupported character \"$ch\""))
                    }
                }
            }
            i++
        }
        return Result.success(tokens)
    }

    /* ---------------------------------------------------------
     * Parser — tokens → AST (shunting-yard)
     * ------------------------------------------------------- */
    private fun parse(tokens: List<Token>): Result<List<Node>> {
        val output = ArrayDeque<Node>()
        val stack = ArrayDeque<Token>()

        fun topOp(): Token? = stack.lastOrNull()?.takeIf { it.type == TokenType.OP }
        fun isOpToken(t: Token?): Boolean = t != null && t.type == TokenType.OP

        fun previousIsValue(): Boolean {
            val last = output.lastOrNull() ?: return false
            return when (last) {
                is Node.Num -> true
                is Node.Op -> last.op == OpKind.FACT || last.op == OpKind.PERCENT ||
                    last.op == OpKind.UNARY_NEG || last.op == OpKind.UNARY_PLUS
            }
        }

        fun emitOp(tok: Token): String? {
            val op = opFromToken(tok)
            val arity = when (op) {
                OpKind.UNARY_NEG, OpKind.UNARY_PLUS -> 1
                OpKind.FACT, OpKind.PERCENT -> 1
                else -> 2
            }
            if (output.size < arity) return "${tok.value} is missing an operand"
            if (arity == 1) {
                val a = output.removeLast()
                output.addLast(Node.Op(op, listOf(a)))
            } else {
                val b = output.removeLast()
                val a = output.removeLast()
                output.addLast(Node.Op(op, listOf(a, b)))
            }
            return null
        }

        // Implicit "×" with full precedence handling — a normal binary
        // operator still waiting for its right-hand operand.
        fun pushImplicitMultiply() {
            val implicitTok = Token(TokenType.OP, "×", 2, rightAssoc = false)
            while (isOpToken(topOp()) &&
                (topOp()!!.precedence > implicitTok.precedence ||
                    (topOp()!!.precedence == implicitTok.precedence && !implicitTok.rightAssoc))
            ) {
                emitOp(stack.removeLast())
            }
            stack.addLast(implicitTok)
        }

        fun flushUntilParen(): String? {
            while (stack.isNotEmpty() && stack.last().type != TokenType.LPAREN) {
                val err = emitOp(stack.removeLast())
                if (err != null) return err
            }
            if (stack.isEmpty()) return "Mismatched parentheses"
            stack.removeLast()
            return null
        }

        for (tok in tokens) {
            when (tok.type) {
                TokenType.NUM -> output.addLast(Node.Num(tok.value.toDouble()))

                TokenType.FUNC -> {
                    if (previousIsValue()) pushImplicitMultiply()
                    stack.addLast(tok)
                }

                TokenType.LPAREN -> {
                    if (previousIsValue()) pushImplicitMultiply()
                    stack.addLast(tok)
                }

                TokenType.RPAREN -> {
                    val err = flushUntilParen()
                    if (err != null) return Result.failure(IllegalArgumentException(err))
                    if (stack.isNotEmpty() && stack.last().type == TokenType.FUNC) {
                        val fn = stack.removeLast()
                        if (output.isEmpty()) {
                            return Result.failure(
                                IllegalArgumentException("${fn.value}() needs a number inside")
                            )
                        }
                        val child = output.removeLast()
                        output.addLast(Node.Op(opFromToken(fn), listOf(child)))
                    }
                }

                TokenType.OP -> {
                    while (isOpToken(topOp()) &&
                        (topOp()!!.precedence > tok.precedence ||
                            (topOp()!!.precedence == tok.precedence && !tok.rightAssoc))
                    ) {
                        val err = emitOp(stack.removeLast())
                        if (err != null) return Result.failure(IllegalArgumentException(err))
                    }
                    stack.addLast(tok)
                }
            }
        }

        while (stack.isNotEmpty()) {
            if (stack.last().type == TokenType.LPAREN || stack.last().type == TokenType.FUNC) {
                return Result.failure(IllegalArgumentException("Missing closing parenthesis"))
            }
            val err = emitOp(stack.removeLast())
            if (err != null) return Result.failure(IllegalArgumentException(err))
        }

        if (output.size != 1) {
            return Result.failure(IllegalArgumentException("Incomplete expression"))
        }
        return Result.success(output.toList())
    }

    private fun opFromToken(tok: Token): OpKind = when (tok.value) {
        "−" -> if (tok.precedence == 3) OpKind.UNARY_NEG else OpKind.MINUS
        "+" -> if (tok.precedence == 3) OpKind.UNARY_PLUS else OpKind.PLUS
        "×" -> OpKind.TIMES
        "÷" -> OpKind.DIV
        "%" -> OpKind.PERCENT
        "^" -> OpKind.POW
        "!" -> OpKind.FACT
        "sin" -> OpKind.SIN
        "cos" -> OpKind.COS
        "tan" -> OpKind.TAN
        "asin" -> OpKind.ASIN
        "acos" -> OpKind.ACOS
        "atan" -> OpKind.ATAN
        "log" -> OpKind.LOG
        "ln" -> OpKind.LN
        "sqrt" -> OpKind.SQRT
        "cbrt" -> OpKind.CBRT
        else -> OpKind.PLUS
    }

    /* ---------------------------------------------------------
     * Evaluator — walks the AST
     * ------------------------------------------------------- */
    private fun evaluate(node: Node): Double = when (node) {
        is Node.Num -> node.num
        is Node.Op -> {
            fun child(idx: Int): Double = evaluate(node.children[idx])
            fun unary(): Double = child(0)

            when (node.op) {
                OpKind.PLUS -> child(0) + child(1)
                OpKind.MINUS -> child(0) - child(1)
                OpKind.TIMES -> child(0) * child(1)
                OpKind.DIV -> {
                    val b = child(1)
                    if (abs(b) < EPSILON) throw ArithmeticException("Cannot divide by zero")
                    child(0) / b
                }
                OpKind.POW -> {
                    val a = child(0)
                    val b = child(1)
                    if (a == 0.0 && b < 0) {
                        throw ArithmeticException("Division by zero (negative power)")
                    }
                    val r = a.pow(b)
                    if (!r.isFinite()) throw ArithmeticException("Result is not a finite number")
                    r
                }
                OpKind.UNARY_NEG -> -unary()
                OpKind.UNARY_PLUS -> unary()
                OpKind.FACT -> {
                    val x = unary()
                    if (x < 0) throw ArithmeticException("Factorial of a negative number")
                    if (x != floor(x)) throw ArithmeticException("Factorial needs an integer")
                    if (x > 170) throw ArithmeticException("Factorial result too large")
                    var r = 1.0
                    var k = 2
                    while (k <= x.toInt()) {
                        r *= k
                        k++
                    }
                    r
                }
                OpKind.PERCENT -> unary() / 100.0
                OpKind.SQRT -> {
                    val x = unary()
                    if (x < 0) throw ArithmeticException("Square root of a negative number")
                    sqrt(x)
                }
                OpKind.CBRT -> Math.cbrt(unary())
                OpKind.SIN -> {
                    val v = sin(unary() * PI / 180.0)
                    if (abs(v) < EPSILON) 0.0 else v
                }
                OpKind.COS -> {
                    val v = cos(unary() * PI / 180.0)
                    if (abs(v) < EPSILON) 0.0 else v
                }
                OpKind.TAN -> {
                    val deg = ((unary() % 180.0) + 180.0) % 180.0
                    if (abs(deg - 90.0) < EPSILON) {
                        throw ArithmeticException("tan(90°) is undefined")
                    }
                    val v = tan(deg * PI / 180.0)
                    if (abs(v) < EPSILON) 0.0 else v
                }
                OpKind.ASIN -> {
                    val x = unary()
                    if (x < -1 || x > 1) throw ArithmeticException("asin needs a value in [-1, 1]")
                    asin(x) * 180.0 / PI
                }
                OpKind.ACOS -> {
                    val x = unary()
                    if (x < -1 || x > 1) throw ArithmeticException("acos needs a value in [-1, 1]")
                    acos(x) * 180.0 / PI
                }
                OpKind.ATAN -> atan(unary()) * 180.0 / PI
                OpKind.LOG -> {
                    val x = unary()
                    if (x <= 0) throw ArithmeticException("log needs a positive number")
                    log10(x)
                }
                OpKind.LN -> {
                    val x = unary()
                    if (x <= 0) throw ArithmeticException("ln needs a positive number")
                    ln(x)
                }
            }
        }
    }

    /* ---------------------------------------------------------
     * Public entry point
     * ------------------------------------------------------- */
    fun calculate(rawExpression: String): EvalResult {
        return try {
            val expression = rawExpression.replace("√", "sqrt")
            if (expression.isBlank()) return EvalResult.Failure("Empty expression")

            val tokens = tokenize(expression).getOrElse {
                return EvalResult.Failure(it.message ?: "Invalid expression")
            }
            val nodes = parse(tokens).getOrElse {
                return EvalResult.Failure(it.message ?: "Invalid expression")
            }
            val result = evaluate(nodes.first())
            if (!result.isFinite()) {
                return EvalResult.Failure("Result is not a finite number")
            }
            EvalResult.Success(result, expression)
        } catch (e: Exception) {
            EvalResult.Failure(e.message ?: "Invalid expression")
        }
    }

    /* ---------------------------------------------------------
     * Formatting — plain notation (10+ decimals) + scientific
     * notation for very large / very small values.
     * ------------------------------------------------------- */
    fun formatResult(value: Double): String {
        if (!value.isFinite()) return "Error"
        val v = if (value == 0.0) 0.0 else value // normalize -0.0
        val absV = abs(v)

        if (v != 0.0 && (absV >= 1e16 || absV < 1e-9)) {
            val exp = floor(log10(absV)).toInt()
            val mantissa = v / 10.0.pow(exp)
            return "${roundForDisplay(mantissa, 8)}e$exp"
        }
        return roundForDisplay(v, 10)
    }

    /** Rounds to [maxDecimals] significant decimals, trimming trailing zeros. */
    private fun roundForDisplay(value: Double, maxDecimals: Int): String {
        val fixed = String.format(Locale.US, "%.${maxDecimals}f", value)
        if (!fixed.contains('.')) return fixed
        var end = fixed.length
        while (end > 0 && fixed[end - 1] == '0') end--
        if (end > 0 && fixed[end - 1] == '.') end--
        return fixed.substring(0, end)
    }
}
