package com.neoncalc.app

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.KeyEvent as ComposeKeyEvent
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import android.view.KeyEvent
import com.neoncalc.app.engine.CalculatorEngine
import com.neoncalc.app.ui.theme.NeonColors
import com.neoncalc.app.util.SoundFx
import com.neoncalc.app.viewmodel.CalculatorViewModel
import com.neoncalc.app.viewmodel.CalculatorViewModel.CalcMode
import com.neoncalc.app.viewmodel.CalculatorViewModel.CalcState
import com.neoncalc.app.viewmodel.CalculatorViewModel.Phase

/**
 * CalculatorScreen — the full Compose UI: header (mode + angle toggles),
 * glowing display, memory strip, adaptive keypads (basic/scientific) and
 * the history log. Physical keyboard input is handled via [Modifier.onKeyEvent].
 */
@Composable
fun CalculatorScreen(viewModel: CalculatorViewModel = viewModel()) {
    val state by viewModel.state.collectAsState()
    val focusRequester = remember { FocusRequester() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF0B0B18), NeonColors.Void, Color(0xFF140A20))
                )
            )
            .focusRequester(focusRequester)
            .focusable()
            .onKeyEvent { handlePhysicalKey(it, viewModel) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(modifier = Modifier.widthIn(max = 520.dp)) {
                HeaderBar(state, viewModel)
                Spacer(Modifier.height(12.dp))
                CalcDisplay(state)
                Spacer(Modifier.height(10.dp))
                MemoryRow(state, viewModel)
                Spacer(Modifier.height(10.dp))
                if (state.mode == CalcMode.BASIC) {
                    BasicKeypad { handleKey(it, viewModel) }
                } else {
                    ScientificKeypad(state) { handleKey(it, viewModel) }
                }
                Spacer(Modifier.height(18.dp))
                HistorySection(state, viewModel)
            }
        }
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }
}

/* ==================================================================
 * Key routing — one place where sounds + actions meet
 * ================================================================ */
private fun handleKey(label: String, vm: CalculatorViewModel) {
    when (label) {
        "C" -> { SoundFx.clear(); vm.clear() }
        "⌫" -> { SoundFx.backspace(); vm.backspace() }
        "=" -> { SoundFx.equals(); vm.equals() }
        "Ans" -> { SoundFx.function(); vm.pressAns() }
        else -> {
            when {
                label.length == 1 && label[0].isDigit() -> SoundFx.digit(label.toInt())
                label == "." -> SoundFx.digit(0)
                label in listOf("+", "−", "×", "÷", "%", "^") -> SoundFx.operator()
                else -> SoundFx.function()
            }
            vm.press(label)
        }
    }
}

/* ==================================================================
 * Physical keyboard support (Activity-level key handling equivalent)
 * ================================================================ */
private fun handlePhysicalKey(event: ComposeKeyEvent, vm: CalculatorViewModel): Boolean {
    if (event.type != KeyEventType.KeyDown) return false
    val kc = event.nativeKeyEvent.keyCode
    val label: String = when {
        kc in KeyEvent.KEYCODE_0..KeyEvent.KEYCODE_9 -> (kc - KeyEvent.KEYCODE_0).toString()
        kc in KeyEvent.KEYCODE_NUMPAD_0..KeyEvent.KEYCODE_NUMPAD_9 -> (kc - KeyEvent.KEYCODE_NUMPAD_0).toString()
        kc == KeyEvent.KEYCODE_PERIOD || kc == KeyEvent.KEYCODE_NUMPAD_DOT || kc == KeyEvent.KEYCODE_COMMA -> "."
        kc == KeyEvent.KEYCODE_PLUS || kc == KeyEvent.KEYCODE_NUMPAD_ADD -> "+"
        kc == KeyEvent.KEYCODE_MINUS || kc == KeyEvent.KEYCODE_NUMPAD_SUBTRACT -> "−"
        kc == KeyEvent.KEYCODE_STAR || kc == KeyEvent.KEYCODE_NUMPAD_MULTIPLY -> "×"
        kc == KeyEvent.KEYCODE_SLASH || kc == KeyEvent.KEYCODE_NUMPAD_DIVIDE -> "÷"
        kc == KeyEvent.KEYCODE_LEFT_BRACKET -> "("
        kc == KeyEvent.KEYCODE_RIGHT_BRACKET -> ")"
        kc == KeyEvent.KEYCODE_ENTER || kc == KeyEvent.KEYCODE_NUMPAD_ENTER || kc == KeyEvent.KEYCODE_EQUALS -> "="
        kc == KeyEvent.KEYCODE_DEL -> "⌫"
        kc == KeyEvent.KEYCODE_ESCAPE -> "C"
        kc == KeyEvent.KEYCODE_P -> "π"
        kc == KeyEvent.KEYCODE_E -> "e"
        else -> return false
    }
    handleKey(label, vm)
    return true
}

/* ==================================================================
 * Header — logo, DEG/RAD, BASIC ⇄ SCIENTIFIC
 * ================================================================ */
@Composable
private fun HeaderBar(state: CalcState, vm: CalculatorViewModel) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "🌙 NEON·CALC",
                color = NeonColors.Purple,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                letterSpacing = 2.sp,
            )
            Text(
                text = "animé · scientific",
                color = NeonColors.TextDim,
                fontSize = 10.sp,
                letterSpacing = 3.sp,
            )
        }
        Spacer(Modifier.weight(1f))

        SmallPill(
            text = if (state.radian) "RAD" else "DEG",
            active = state.radian,
            activeColor = NeonColors.Pink,
            inactiveColor = NeonColors.TextDim,
            onClick = {
                SoundFx.toggle()
                vm.toggleRadian()
            }
        )
        Spacer(Modifier.padding(horizontal = 3.dp))

        Row(
            modifier = Modifier
                .background(Color.Black.copy(alpha = 0.4f), RoundedCornerShape(50))
                .padding(3.dp)
        ) {
            SmallPill(
                text = "BASIC",
                active = state.mode == CalcMode.BASIC,
                activeColor = NeonColors.Cyan,
                inactiveColor = NeonColors.TextDim,
                onClick = { if (state.mode != CalcMode.BASIC) { SoundFx.toggle(); vm.toggleMode() } }
            )
            SmallPill(
                text = "SCI",
                active = state.mode == CalcMode.SCIENTIFIC,
                activeColor = NeonColors.Purple,
                inactiveColor = NeonColors.TextDim,
                onClick = { if (state.mode != CalcMode.SCIENTIFIC) { SoundFx.toggle(); vm.toggleMode() } }
            )
        }
    }
}

@Composable
private fun SmallPill(
    text: String,
    active: Boolean,
    activeColor: Color,
    inactiveColor: Color,
    onClick: () -> Unit,
) {
    TextButton(
        onClick = onClick,
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
        modifier = Modifier.height(32.dp)
    ) {
        Text(
            text = text,
            color = if (active) activeColor else inactiveColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
        )
    }
}

/* ==================================================================
 * Display — glowing readout with live answer preview + errors
 * ================================================================ */
@Composable
private fun CalcDisplay(state: CalcState) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = Color(0xFF0A0A12),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.End
        ) {
            val isError = state.phase == Phase.ERROR
            val errorMsg = if (isError) {
                when (val r = CalculatorEngine.calculate(state.input)) {
                    is CalculatorEngine.EvalResult.Failure -> r.error
                    else -> "Invalid input"
                }
            } else null

            Text(
                text = state.input.ifEmpty { "0" },
                color = if (isError) NeonColors.ErrorPink else Color(0xFFC9B8FF),
                fontFamily = FontFamily.Monospace,
                fontSize = if (state.input.length > 20) 13.sp else 16.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.End,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(10.dp))

            val answerText = if (isError) {
                errorMsg ?: "Invalid input"
            } else {
                state.answer?.let { CalculatorEngine.formatResult(it) } ?: "\u00A0"
            }
            Text(
                text = answerText,
                color = if (isError) NeonColors.ErrorPink else NeonColors.Cyan,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = when {
                    isError -> 14.sp
                    answerText.length > 14 -> 24.sp
                    answerText.length > 9 -> 32.sp
                    else -> 40.sp
                },
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.End,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

/* ==================================================================
 * Memory strip — MC MR M+ M−
 * ================================================================ */
@Composable
private fun MemoryRow(state: CalcState, vm: CalculatorViewModel) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White.copy(alpha = 0.03f), RoundedCornerShape(18.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "M",
            color = if (state.memory != null) NeonColors.Cyan else NeonColors.TextDim,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
        )
        Text(
            text = state.memory?.let { CalculatorEngine.formatResult(it) } ?: "empty",
            color = if (state.memory != null) MaterialTheme.colorScheme.onSurface else NeonColors.TextDim,
            fontFamily = FontFamily.Monospace,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 10.dp)
        )
        MemKey("MC", state.memory != null) { SoundFx.memory(); vm.clearMemory() }
        MemKey("MR", state.memory != null) { SoundFx.memory(); vm.memoryRecall() }
        MemKey("M+", true) { SoundFx.memory(); vm.memoryPlus() }
        MemKey("M−", true) { SoundFx.memory(); vm.memoryMinus() }
    }
}

@Composable
private fun MemKey(label: String, enabled: Boolean, onClick: () -> Unit) {
    TextButton(onClick = onClick, enabled = enabled, contentPadding = PaddingValues(8.dp)) {
        Text(
            text = label,
            color = NeonColors.Amber,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

/* ==================================================================
 * 3D calculator key — elevation + press dip + per-variant neon colors
 * ================================================================ */
private enum class KeyVariant(
    val bg: Color,
    val fg: Color,
    val border: Color,
) {
    BASE(Color(0xFF1B1B27), Color(0xFFF2F2FA), Color(0x22FFFFFF)),
    FN(Color(0xFF231442), Color(0xFFCDB2FF), Color(0x55B26BFF)),
    OP(Color(0xFF05323B), Color(0xFF7DF3FF), Color(0x5500F0FF)),
    EQ(NeonColors.Pink, Color.White, Color(0x88FF9AE8)),
    DANGER(Color(0xFF2B1220), Color(0xFFFF9AD6), Color(0x55FF4FD8)),
    MEM(Color(0xFF2A2210), Color(0xFFFFD9A0), Color(0x55FFB347)),
}

@Composable
private fun CalcKey(
    label: String,
    variant: KeyVariant,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    sub: String? = null,
    fontSize: Int = 18,
) {
    Button(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = variant.bg,
            contentColor = variant.fg,
        ),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 7.dp,
            pressedElevation = 1.dp,
        ),
        border = BorderStroke(1.dp, variant.border),
        contentPadding = PaddingValues(2.dp),
    ) {
        if (sub != null) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(sub, fontSize = 9.sp, color = variant.fg.copy(alpha = 0.6f))
                Text(
                    label,
                    fontSize = fontSize.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = variant.fg,
                )
            }
        } else {
            Text(
                label,
                fontSize = fontSize.sp,
                fontWeight = FontWeight.SemiBold,
                color = variant.fg,
            )
        }
    }
}

/* ==================================================================
 * Basic keypad — 4 columns + full-width "="
 * ================================================================ */
@Composable
private fun BasicKeypad(onKey: (String) -> Unit) {
    val gap = Arrangement.spacedBy(10.dp)
    val keyHeight = 54.dp

    Column(verticalArrangement = gap) {
        basicRow(listOf("C" to KeyVariant.DANGER, "⌫" to KeyVariant.DANGER, "%" to KeyVariant.FN, "÷" to KeyVariant.OP), keyHeight, gap, onKey)
        basicRow(listOf("7" to KeyVariant.BASE, "8" to KeyVariant.BASE, "9" to KeyVariant.BASE, "×" to KeyVariant.OP), keyHeight, gap, onKey)
        basicRow(listOf("4" to KeyVariant.BASE, "5" to KeyVariant.BASE, "6" to KeyVariant.BASE, "−" to KeyVariant.OP), keyHeight, gap, onKey)
        basicRow(listOf("1" to KeyVariant.BASE, "2" to KeyVariant.BASE, "3" to KeyVariant.BASE, "+" to KeyVariant.OP), keyHeight, gap, onKey)
        basicRow(listOf("(" to KeyVariant.BASE, ")" to KeyVariant.BASE, "0" to KeyVariant.BASE, "." to KeyVariant.BASE), keyHeight, gap, onKey)
        CalcKey("=", KeyVariant.EQ, { onKey("=") }, Modifier.fillMaxWidth().height(keyHeight), fontSize = 24)
    }
}

@Composable
private fun basicRow(
    cells: List<Pair<String, KeyVariant>>,
    keyHeight: androidx.compose.ui.unit.Dp,
    gap: Arrangement.HorizontalOrVertical,
    onKey: (String) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        cells.forEach { (label, variant) ->
            CalcKey(
                label = label,
                variant = variant,
                onClick = { onKey(label) },
                modifier = Modifier.weight(1f).height(keyHeight),
            )
        }
    }
}

/* ==================================================================
 * Scientific keypad — 6 columns, tall corner "="
 * ================================================================ */
@Composable
private fun ScientificKeypad(state: CalcState, onKey: (String) -> Unit) {
    val keyH = 46.dp
    val gapDp = 8.dp
    val spacing = Arrangement.spacedBy(gapDp)

    Column(verticalArrangement = spacing) {
        sciRow(
            listOf("sin" to KeyVariant.FN, "cos" to KeyVariant.FN, "tan" to KeyVariant.FN,
                "√" to KeyVariant.FN, "^" to KeyVariant.FN, "!" to KeyVariant.FN),
            keyH, onKey, fontSize = 13
        )
        sciRow(
            listOf("sin⁻¹" to KeyVariant.FN, "cos⁻¹" to KeyVariant.FN, "tan⁻¹" to KeyVariant.FN,
                "³√" to KeyVariant.FN, "log" to KeyVariant.FN, "ln" to KeyVariant.FN),
            keyH, onKey, fontSize = 13
        )
        sciRow(
            listOf("π" to KeyVariant.FN, "e" to KeyVariant.FN, "(" to KeyVariant.BASE,
                ")" to KeyVariant.BASE, "⌫" to KeyVariant.DANGER, "C" to KeyVariant.DANGER),
            keyH, onKey
        )

        // Rows 4-6: 5-unit grid on the left + tall "=" on the right
        Row(horizontalArrangement = Arrangement.spacedBy(gapDp), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(5f), verticalArrangement = spacing) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gapDp)) {
                    listOf("4" to KeyVariant.BASE, "5" to KeyVariant.BASE, "6" to KeyVariant.BASE,
                        "×" to KeyVariant.OP, "−" to KeyVariant.OP).forEach { (label, variant) ->
                        CalcKey(label, variant, { onKey(label) }, Modifier.weight(1f).height(keyH))
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gapDp)) {
                    listOf("1" to KeyVariant.BASE, "2" to KeyVariant.BASE, "3" to KeyVariant.BASE,
                        "+" to KeyVariant.OP, "." to KeyVariant.BASE).forEach { (label, variant) ->
                        CalcKey(label, variant, { onKey(label) }, Modifier.weight(1f).height(keyH))
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gapDp)) {
                    CalcKey("Ans", KeyVariant.FN, { onKey("Ans") }, Modifier.weight(1f).height(keyH), fontSize = 13)
                    CalcKey("0", KeyVariant.BASE, { onKey("0") }, Modifier.weight(2f).height(keyH))
                    CalcKey("eˣ", KeyVariant.FN, { onKey("eˣ") }, Modifier.weight(2f).height(keyH), fontSize = 13)
                }
            }
            CalcKey(
                label = "=",
                variant = KeyVariant.EQ,
                onClick = { onKey("=") },
                modifier = Modifier.weight(1f).height(keyH * 3 + gapDp * 2),
                fontSize = 24,
            )
        }

        // angle-unit indicator chip
        Text(
            text = if (state.radian) "RAD — trig functions use radians" else "DEG — trig functions use degrees",
            color = if (state.radian) NeonColors.Pink else NeonColors.Cyan,
            fontSize = 10.sp,
            letterSpacing = 1.sp,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun sciRow(
    cells: List<Pair<String, KeyVariant>>,
    keyH: androidx.compose.ui.unit.Dp,
    onKey: (String) -> Unit,
    fontSize: Int = 15,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        cells.forEach { (label, variant) ->
            CalcKey(
                label = label,
                variant = variant,
                onClick = { onKey(label) },
                modifier = Modifier.weight(1f).height(keyH),
                fontSize = fontSize,
            )
        }
    }
}

/* ==================================================================
 * History — tap to reuse, delete per entry, clear all
 * ================================================================ */
@Composable
private fun HistorySection(state: CalcState, vm: CalculatorViewModel) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White.copy(alpha = 0.03f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "HISTORY",
                    color = MaterialTheme.colorScheme.onSurface,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                    letterSpacing = 2.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                TextButton(onClick = { vm.clearHistory() }) {
                    Text("CLEAR", color = NeonColors.Pink, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
            if (state.history.isEmpty()) {
                Text(
                    text = "No calculations yet — results appear here.",
                    color = NeonColors.TextDim,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(vertical = 18.dp),
                )
            } else {
                LazyColumn {
                    items(state.history, key = { it.id }) { entry ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(
                                    text = entry.expression,
                                    color = NeonColors.TextSoft,
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 11.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    text = "= ${entry.result}",
                                    color = NeonColors.Cyan,
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            TextButton(onClick = { vm.insertValue(entry.result) }) {
                                Text("USE", color = NeonColors.Purple, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                            TextButton(onClick = { vm.deleteHistoryEntry(entry.id) }) {
                                Text("✕", color = NeonColors.TextDim, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
