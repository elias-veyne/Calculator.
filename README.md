# 🌙 NeonCalc — Dark Animé Scientific Calculator

A 3D, dark animé-styled scientific calculator with a full expression engine, memory, history, sound effects, haptics and keyboard support — shipped as **two apps in one repo**:

| Path | What it is |
|---|---|
| `/` (root) | **Web version** — React + Vite + Tailwind (runs in any browser) |
| `/android` | **Native Android version** — Kotlin + Jetpack Compose + Material 3 (builds to an APK) |

Both share the same engine design (tokenizer → shunting-yard parser → evaluator) and the same feature set.

---

## Features

- **Basic ops**: `+ − × ÷ %` with correct operator precedence, parentheses, decimals, negative numbers
- **Scientific**: `sin cos tan` + inverse trig (DEG/RAD), `log ln √ ³√ x^y eˣ`, factorial, `π` / `e`, `Ans`
- **Input validation**: friendly errors for division by zero, `tan(90°)`, `sqrt(−4)`, domain errors
- **Memory**: `M+ M− MR MC` · **History** with reuse / copy / delete · **Keyboard support**
- **Dark animé style**: neon cyan/purple/pink palette, 3D keys, particle background, animations
- **Sound + haptics**: synthesized sounds (zero audio assets)

## Web version

```bash
npm install
npm run dev     # local dev server
npm run build   # production build → dist/
```

## Android version (Android Studio)

1. Open **`android/`** as a project in Android Studio (Ladybug or newer).
   - JDK 17, Gradle 8.9, AGP 8.7.3, Kotlin 2.0.21, Compose BOM 2024.12.01
   - minSdk **24** (Android 7.0) · targetSdk 35
2. Android Studio will offer to generate the Gradle wrapper on first sync — accept it (or run `gradle wrapper` once).
3. Run ▶ on an emulator/device, or build via:
   ```bash
   cd android
   gradle :app:assembleDebug
   # APK → android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Project structure (mirrors the web app's architecture)

```
android/app/src/main/java/com/neoncalc/app/
├── MainActivity.kt               # entry point (ComponentActivity + Compose)
├── CalculatorScreen.kt           # full Compose UI (header, display, memory, keypads, history)
├── CalculatorViewModel.kt        # MVVM state holder (StateFlow)
├── engine/CalculatorEngine.kt    # pure math core — tokenizer, parser, evaluator
├── ui/theme/Theme.kt             # dark neon Material 3 theme
└── util/SoundFx.kt               # Android-native key tones (ToneGenerator, no assets)
```

## CI/CD — automatic APK builds

`.github/workflows/build.yml` is **triggered** by:

- push to `main` / `master`
- pull requests
- tags matching `v*`
- the **“Run workflow”** button (Actions tab → Build Android APK)

Each run: sets up JDK 17 + Gradle 8.9 → runs the **JUnit engine tests** → compiles `app-debug.apk` → uploads it as an artifact (`NeonCalc-debug-apk`, kept 14 days).

Download: **Actions → latest run → Artifacts → NeonCalc-debug-apk**.

> Release signing: the pipeline builds a *debug* APK (installable immediately). To publish on the Play Store, add a release keystore + `secrets.KEYSTORE_BASE64` / `secrets.KEYSTORE_PASSWORD` and a signing step.

## Creating the private GitHub repo & pushing

This environment can't authenticate to GitHub, so run these once on your machine:

```bash
gh auth login   # one-time GitHub CLI sign-in

git init
git add .
git commit -m "NeonCalc — dark anime scientific calculator (web + Android + CI)"
git branch -M main
gh repo create neoncalc --private --source=. --remote=origin --push
```

The workflow fires automatically on that first push. Without `gh` CLI, create an empty private repo at github.com/new, then:

```bash
git remote add origin https://github.com/<you>/neoncalc.git
git push -u origin main
```
