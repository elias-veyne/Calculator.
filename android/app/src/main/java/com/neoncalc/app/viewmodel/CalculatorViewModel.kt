package com.neoncalc.app.viewmodel

import androidx.lifecycle.ViewModel
import com.neoncalc.app.engine.CalculatorEngine
import com.neoncalc.app.engine.CalculatorEngine.EvalResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * CalculatorViewModel — MVVM state holder. Owns the single source of truth:
 * current input expression, live answer, memory slot, history and mode toggles.
 * Exposes plain action methods; the UI layer (CalculatorScreen) only calls
 * actions and observes [state], exactly like a Compose ViewModel should.
 */
class CalculatorViewModel : ViewModel() {

    enum class CalcMode { BASIC, SCIENTIFIC }
    enum class Phase { IDLE, SUCCESS, ERROR }

    data class HistoryEntry(
        val id: Long,
        val expression: String,
        val result: String,
        val at: Long,
    )

    data class CalcState(
        val input: String = "",
        val answer: Double? = null,
        val phase: Phase = Phase.IDLE,
        val memory: Double? = null,
        val history: List<HistoryEntry> = emptyList(),
        val mode: CalcMode = CalcMode.BASIC,
        val radian: Boolean = false,
        val lastAnswer: Double? = null,
        val resultNonce: Int = 0,
    )

    private val _state = MutableStateFlow(CalcState())
    val state: StateFlow<CalcState> = _state.asStateFlow()

    /* ---------------------------- input rules ---------------------------- */
    private val FUNC_KEYS = listOf("sin", "cos", "tan", "asin", "acos", "atan")
    private val BINARY_OPS = listOf("+", "−", "×", "÷", "^", "%")
    private val CHAIN_OPS = listOf("+", "−", "×", "÷", "%", "^", ")")
    private val OP_END = Regex("[+\\-−×÷%^]$")
    private val INPUT_SETS = mapOf("√" to "sqrt(", "³√" to "cbrt(")

    /** Appends a key to the expression, guarding against invalid sequences. */
    fun press(rawKey: String) {
        val key = INPUT_SETS[rawKey] ?: rawKey
        _state.update { s ->
            var input = s.input
            var answer = s.answer
            var phase = s.phase

            // After a result: operators chain; anything else starts fresh
            // (except "." which continues from the answer value).
            if (phase == Phase.SUCCESS) {
                if (key !in CHAIN_OPS) {
                    phase = Phase.IDLE
                    answer = null
                    if (key == "." && input.isEmpty()) {
                        input = CalculatorEngine.formatResult(s.answer ?: 0.0)
                    }
                }
            }
            // Any key after an error starts fresh
            if (phase == Phase.ERROR) {
                input = ""
                answer = null
                phase = Phase.IDLE
            }
            if (input.length >= MAX_INPUT_LENGTH) {
                return@update s.copy(input = input, answer = answer, phase = phase)
            }

            // eˣ — exponential: inserts "e^" with implicit multiplication
            if (key == "eˣ") {
                if (input.isNotEmpty() && !OP_END.matches(input)) input += "×"
                return@update s.copy(input = input + "e^", answer = answer, phase = phase)
            }

            // Digits and decimal point
            if (key.length == 1 && (key[0].isDigit() || key == ".")) {
                val currentNumber = input.split(Regex("[^0-9.]")).last()
                if (key == "." && currentNumber.contains(".")) {
                    return@update s.copy(input = input, answer = answer, phase = phase)
                }
                return@update s.copy(input = input + key, answer = answer, phase = phase)
            }

            // Scientific functions — implicit × when chained after a value
            if (key in FUNC_KEYS || key == "log" || key == "ln") {
                if (input.isNotEmpty() && !OP_END.matches(input)) input += "×"
                return@update s.copy(input = input + key + "(", answer = answer, phase = phase)
            }
            if (key == "sqrt(" || key == "cbrt(") {
                if (input.isNotEmpty() && !OP_END.matches(input)) input += "×"
                return@update s.copy(input = input + key, answer = answer, phase = phase)
            }
            if (key == "(") {
                if (input.endsWith("(")) {
                    return@update s.copy(input = input, answer = answer, phase = phase)
                }
                return@update s.copy(input = input + key, answer = answer, phase = phase)
            }
            if (key == ")") {
                val opens = input.count { it == '(' }
                val closes = input.count { it == ')' }
                val blocked = input.isEmpty() || OP_END.matches(input) || input.endsWith("(")
                if (closes >= opens || blocked) {
                    return@update s.copy(input = input, answer = answer, phase = phase)
                }
                return@update s.copy(input = input + key, answer = answer, phase = phase)
            }

            // Constants π and e
            if (key == "π" || key == "e") {
                if (input.isNotEmpty() && !OP_END.matches(input)) input += "×"
                return@update s.copy(input = input + key, answer = answer, phase = phase)
            }

            // Binary operators
            if (key in BINARY_OPS) {
                if (input.isEmpty()) {
                    if (key == "−") return@update s.copy(input = "−", answer = answer, phase = phase)
                    return@update s.copy(input = input, answer = answer, phase = phase)
                }
                if (input.endsWith("(")) {
                    if (key == "−") return@update s.copy(input = input + "−", answer = answer, phase = phase)
                    return@update s.copy(input = input, answer = answer, phase = phase)
                }
                if (OP_END.matches(input)) {
                    if (key == "−" && input.endsWith("^")) {
                        return@update s.copy(input = input + "−", answer = answer, phase = phase)
                    }
                    if (input.length == 1 && key != "−") {
                        return@update s.copy(input = input, answer = answer, phase = phase)
                    }
                    if (input.length >= 2 && input[input.length - 2] == '(' && key != "−") {
                        return@update s.copy(input = input, answer = answer, phase = phase)
                    }
                    return@update s.copy(input = input.dropLast(1) + key, answer = answer, phase = phase)
                }
                return@update s.copy(input = input + key, answer = answer, phase = phase)
            }

            // Postfix factorial
            if (key == "!") {
                if (input.isEmpty() || OP_END.matches(input) || input.endsWith("(")) {
                    return@update s.copy(input = input, answer = answer, phase = phase)
                }
                return@update s.copy(input = input + "!", answer = answer, phase = phase)
            }

            s.copy(input = input, answer = answer, phase = phase)
        }
    }

    /** Evaluates the current expression through the engine. */
    fun equals() {
        val s = _state.value
        val expr = s.input.trim()
        if (expr.isEmpty()) return

        when (val res = CalculatorEngine.calculate(expr)) {
            is EvalResult.Success -> {
                val entry = HistoryEntry(
                    id = System.nanoTime(),
                    expression = expr,
                    result = CalculatorEngine.formatResult(res.value),
                    at = System.currentTimeMillis(),
                )
                _state.update {
                    it.copy(
                        input = expr,
                        answer = res.value,
                        phase = Phase.SUCCESS,
                        lastAnswer = res.value,
                        resultNonce = it.resultNonce + 1,
                        history = (listOf(entry) + it.history).take(MAX_HISTORY),
                    )
                }
            }
            is EvalResult.Failure -> _state.update {
                it.copy(phase = Phase.ERROR, answer = null, resultNonce = it.resultNonce + 1)
            }
        }
    }

    fun clear() = _state.update { it.copy(input = "", answer = null, phase = Phase.IDLE) }

    fun backspace() {
        _state.update { s ->
            if (s.phase == Phase.SUCCESS || s.phase == Phase.ERROR) {
                return@update s.copy(input = "", answer = null, phase = Phase.IDLE)
            }
            if (s.input.isEmpty()) return@update s
            val fnNames = listOf("asin(", "acos(", "atan(", "cbrt(", "sqrt(", "sin(", "cos(", "tan(", "log(", "ln(")
            val match = fnNames.firstOrNull { s.input.endsWith(it) }
            if (match != null) s.copy(input = s.input.dropLast(match.length))
            else s.copy(input = s.input.dropLast(1))
        }
    }

    /* ---------------------------- mode toggles ---------------------------- */
    fun toggleMode() = _state.update { it.copy(mode = if (it.mode == CalcMode.BASIC) CalcMode.SCIENTIFIC else CalcMode.BASIC) }

    fun toggleRadian() = _state.update { it.copy(radian = !it.radian) }

    /* ---------------------------- memory ---------------------------- */
    private fun currentValue(s: CalcState): Double? {
        if (s.phase == Phase.SUCCESS && s.answer != null) return s.answer
        if (s.input.isBlank()) return null
        val res = CalculatorEngine.calculate(s.input)
        return (res as? EvalResult.Success)?.value
    }

    fun memoryPlus() = _state.update { s ->
        val v = currentValue(s) ?: return@update s
        s.copy(memory = (s.memory ?: 0.0) + v)
    }

    fun memoryMinus() = _state.update { s ->
        val v = currentValue(s) ?: return@update s
        s.copy(memory = (s.memory ?: 0.0) - v)
    }

    fun memoryRecall() = _state.update { s ->
        val m = s.memory ?: return@update s
        val value = CalculatorEngine.formatResult(m)
        if (s.phase == Phase.SUCCESS || s.phase == Phase.ERROR) {
            s.copy(input = value, answer = null, phase = Phase.IDLE)
        } else if (s.input.isNotEmpty() && !OP_END.matches(s.input)) {
            s.copy(input = s.input + "×" + value)
        } else {
            s.copy(input = s.input + value)
        }
    }

    fun clearMemory() = _state.update { it.copy(memory = null) }

    fun pressAns() = _state.update { s ->
        val last = s.lastAnswer ?: return@update s
        val value = CalculatorEngine.formatResult(last)
        if (s.phase == Phase.SUCCESS || s.phase == Phase.ERROR) {
            s.copy(input = value, answer = null, phase = Phase.IDLE)
        } else if (s.input.isNotEmpty() && !OP_END.matches(s.input)) {
            s.copy(input = s.input + "×" + value)
        } else {
            s.copy(input = s.input + value)
        }
    }

    /** Inserts a raw numeric value (MR, Ans, history tap). */
    fun insertValue(value: String) = _state.update { s ->
        if (s.phase == Phase.SUCCESS || s.phase == Phase.ERROR) {
            s.copy(input = value, answer = null, phase = Phase.IDLE)
        } else if (s.input.isNotEmpty() && !OP_END.matches(s.input)) {
            s.copy(input = s.input + "×" + value)
        } else {
            s.copy(input = s.input + value)
        }
    }

    /* ---------------------------- history ---------------------------- */
    fun clearHistory() = _state.update { it.copy(history = emptyList()) }

    fun deleteHistoryEntry(id: Long) =
        _state.update { it.copy(history = it.history.filterNot { h -> h.id == id }) }

    companion object {
        private const val MAX_HISTORY = 30
        private const val MAX_INPUT_LENGTH = 180
    }
}
