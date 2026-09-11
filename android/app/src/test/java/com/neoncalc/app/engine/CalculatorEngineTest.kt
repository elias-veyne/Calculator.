package com.neoncalc.app.engine

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * CalculatorEngineTest — JUnit 4 suite for the math core.
 * Covers arithmetic, precedence, parentheses, errors (division by zero),
 * trigonometry, logs, powers, factorial, percentages, large/small number
 * formatting and implicit multiplication.
 */
class CalculatorEngineTest {

    private fun value(expr: String): Double {
        val res = CalculatorEngine.calculate(expr)
        val failure = (res as? CalculatorEngine.EvalResult.Failure)?.error
        assertTrue("Expected success for '$expr' but got: $failure", res is CalculatorEngine.EvalResult.Success)
        return (res as CalculatorEngine.EvalResult.Success).value
    }

    private fun assertError(expr: String, part: String) {
        val res = CalculatorEngine.calculate(expr)
        assertTrue("Expected failure for '$expr'", res is CalculatorEngine.EvalResult.Failure)
        val msg = (res as CalculatorEngine.EvalResult.Failure).error
        assertTrue("Error '$msg' should contain '$part'", msg.contains(part))
    }

    /* ---------- basic arithmetic ---------- */
    @Test fun addition() = assertEquals(5.0, value("2+3"), 1e-9)

    @Test fun multiplication() = assertEquals(56.0, value("7×8"), 1e-9)

    @Test fun division() = assertEquals(2.25, value("9÷4"), 1e-9)

    @Test fun operatorPrecedence() = assertEquals(14.0, value("2+3×4"), 1e-9)

    @Test fun parenthesesOverridePrecedence() = assertEquals(20.0, value("(2+3)×4"), 1e-9)

    @Test fun subtractionPrecedence() = assertEquals(4.0, value("10−3×2"), 1e-9)

    @Test fun decimals() = assertEquals(0.3, value("0.1+0.2"), 1e-9)

    /* ---------- errors ---------- */
    @Test fun divisionByZero() {
        assertError("5÷0", "Cannot divide by zero")
        assertError("1÷(2−2)", "Cannot divide by zero")
    }

    @Test fun emptyExpressionErrors() = assertError("", "Empty expression")

    @Test fun unknownCharacterErrors() = assertError("2 & 3", "Unsupported character")

    /* ---------- negatives ---------- */
    @Test fun unaryMinus() = assertEquals(-15.0, value("−5×3"), 1e-9)

    @Test fun negativeAfterPower() = assertEquals(0.125, value("2^−3"), 1e-9)

    /* ---------- scientific functions ---------- */
    @Test fun sineDegrees() = assertEquals(0.5, value("sin(30)"), 1e-9)

    @Test fun cosineDegrees() = assertEquals(0.5, value("cos(60)"), 1e-9)

    @Test fun tangentDegrees() = assertEquals(1.0, value("tan(45)"), 1e-9)

    @Test fun tan90IsUndefined() = assertError("tan(90)", "undefined")

    @Test fun logBase10() = assertEquals(3.0, value("log(1000)"), 1e-9)

    @Test fun naturalLogOfE() = assertEquals(1.0, value("ln(e)"), 1e-9)

    @Test fun squareRoot() = assertEquals(12.0, value("sqrt(144)"), 1e-9)

    @Test fun sqrtOfNegativeErrors() = assertError("sqrt(−4)", "negative")

    @Test fun factorial() = assertEquals(120.0, value("5!"), 1e-9)

    @Test fun factorialOfNegativeErrors() = assertError("(−3)!", "negative")

    @Test fun percentage() = assertEquals(50.0, value("25%×200"), 1e-9)

    /* ---------- powers + implicit multiplication ---------- */
    @Test fun power() = assertEquals(1024.0, value("2^10"), 1e-9)

    @Test fun rightAssociativePower() = assertEquals(512.0, value("2^3^2"), 1e-9)

    @Test fun implicitMultiplyParens() = assertEquals(14.0, value("2(3+4)"), 1e-9)

    @Test fun implicitMultiplyFunction() = assertEquals(1.0, value("2sin(30)"), 1e-9)

    @Test fun nestedExpression() = assertEquals(225.0, value("((2+3)×(4−1))^2"), 1e-9)

    /* ---------- formatting: large & small numbers ---------- */
    @Test fun largeNumbersUseScientificNotation() {
        val formatted = CalculatorEngine.formatResult(value("123456789012345678"))
        assertTrue("Expected scientific notation, got $formatted", formatted.contains("e"))
    }

    @Test fun verySmallNumbersUseScientificNotation() {
        val formatted = CalculatorEngine.formatResult(value("1÷10^12"))
        assertTrue("Expected scientific notation, got $formatted", formatted.contains("e"))
    }

    @Test fun trailingZerosAreTrimmed() {
        assertEquals("5", CalculatorEngine.formatResult(5.0))
        assertEquals("0.25", CalculatorEngine.formatResult(0.25))
    }
}
