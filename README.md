# Procedural Slime: Idle Therapy (Web Edition)

> 把真實史萊姆養在手機裡 —— 一款解壓放置療癒系手遊，主打視覺質感的動態流變、具身重力感官體驗與 ASMR 程序化軟糯聲響。

本專案使用 **Web 技術（TypeScript + WebGL2 + Web Audio API + Cordova）** 開發，可同時作為 PWA 網頁應用與原生 Android APK 發布到 Google Play。**完全不需要 Unity**。

---

## 🎮 核心玩法循環

| 玩法 | 描述 |
|------|------|
| **放置靜置** (Idle Spreading) | 長時間不觸碰手機，史萊姆像真實液體般緩慢向下流平、向四周平攤 |
| **觸控擠壓** (Touch Squish) | 點擊、戳揉、劃過時產生彈性網格形變，並發出程序化合成的「咕嘰」聲 |
| **陀螺儀重力** (Gyroscope Tilt) | 傾斜、轉動或搖晃手機，史萊姆會響應真實物理重力場向傾斜方向滑移堆積 |
| **色粉調色** (Pigment Mixing) | 撒不同顏色的色粉於史萊姆上，色粉會依據擴散演算法在體內漸變擴散 |

無任何失敗機制或壓力，純粹解壓。

---

## 🏗️ 技術架構

| 層 | 技術 | 實作 |
|---|---|---|
| **語言** | TypeScript 5.5 | 嚴格型別檢查 |
| **建置工具** | Vite 5 + vite-plugin-pwa | HMR 開發 + PWA 打包 |
| **渲染** | WebGL2 + GLSL ES 300 | SDF / Metaballs / 高光折射 / 色粉擴散 |
| **物理** | TypeScript 質點系統 | 彈簧 + 阻尼 + 靜置平攤 |
| **陀螺儀** | `DeviceOrientationEvent` + `DeviceMotionEvent` | 重力向量 + 搖晃偵測 |
| **音效** | Web Audio API + `AudioWorklet` | 程序化「咕嘰」合成 (Sine + Triangle + LPF) |
| **打包 APK** | Apache Cordova 13 + Android SDK 36 | 跨平台 web → 原生 |
| **CI/CD** | GitHub Actions + softprops/action-gh-release | 自動 build + 發布 |

---

## 📁 專案結構

```
ProceduralSlime/
├── src/
│   ├── core/                          # Lead Architect 模組
│   │   ├── types.ts                  # 共用型別
│   │   ├── GameEvents.ts              # 弱耦合事件匯流排
│   │   ├── GameStateMachine.ts       # FSM (延遲切換)
│   │   └── GameManager.ts            # 主入口協調器
│   ├── states/
│   │   └── States.ts                 # IdleState / TouchState / GyroState
│   ├── graphics/                      # Graphics Specialist 模組
│   │   ├── WebGLHelper.ts
│   │   ├── SlimeRenderer.ts          # SDF/Metaballs 渲染
│   │   └── PigmentSystem.ts          # 色粉 Jacobi 擴散 + SSS
│   ├── physics/                       # Physics Specialist 模組
│   │   ├── SlimePhysics.ts           # 質點 + 彈簧 + 阻尼 + 靜置平攤
│   │   ├── GyroInput.ts              # DeviceOrientation 監聽
│   │   └── TouchInput.ts             # Pointer events
│   ├── audio/
│   │   └── ProceduralAudioEngine.ts  # AudioWorklet 觸發與動態參數
│   ├── ui/
│   │   └── PigmentPalette.ts         # 色粉盤 UI（8 色）
│   ├── perf/                          # Performance 模組
│   │   ├── ActivityTracker.ts        # 活躍度追蹤
│   │   ├── DynamicFPSController.ts   # 60/30/15 FPS 自適應
│   │   └── MemoryPool.ts             # Float32Array 池
│   └── main.ts                        # 應用程式入口
├── shaders/                           # GLSL shader (TypeScript template string)
│   ├── slime-sdf-shader.ts           # SDF/metaballs + 高光折射 + Fresnel
│   └── pigment-shader.ts             # Drop / Diffuse / SSS 三個 pass
├── public/
│   └── gooey-processor.js             # AudioWorklet processor（audio thread）
├── cordova/                           # Cordova 包裝（Android）
│   ├── config.xml                    # Android 豎屏 / 權限 / SDK 設定
│   └── package.json
├── .github/workflows/
│   └── build-apk.yml                 # GitHub Actions CI/CD
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html                         # 入口 HTML（含 UI、CSS）
```

---

## ⚙️ 規格對應

| 規格需求 | 實作位置 | 實作方式 |
|---------|---------|---------|
| **豎屏 + 瀏海屏適配** | `index.html` + `SafeAreaFitter` (CSS) | `env(safe-area-inset-*)` |
| **48dp × 48dp 觸控熱區** | CSS `.palette-btn` + `.icon-btn` | `width/height: 48px` 硬限制 |
| **60/30/15 FPS 自適應** | `DynamicFPSController.ts` | `requestAnimationFrame` 跳幀 + `ActivityTracker` |
| **Memory Pool GC 防禦** | `MemoryPool.ts` | `Float32Array` 預分配 + LIFO Stack |
| **SDF / Metaballs 液體** | `slime-sdf-shader.ts` | `smin` + uniform array metaballs |
| **色粉 2D 擴散** | `pigment-shader.ts` + `PigmentSystem.ts` | Jacobi 迭代 + Laplacian |
| **次表面散射 (SSS)** | `pigment-shader.ts` PIGMENT_SSS_FRAG | 9-tap 高斯模糊 |
| **高光折射** | `slime-sdf-shader.ts` frag | SDF 梯度 → 法線 → Fresnel + Specular |
| **靜置平攤** | `SlimePhysics.updateIdleSpreading` | 粘滯係數指數衰減 |
| **陀螺儀重力** | `GyroInput.ts` | `DeviceOrientationEvent` → `G = (sin γ, -sin β)` |
| **觸控擠壓** | `SlimePhysics.setTouch` | 徑向排斥力 + 彈性復原 |
| **程序化「咕嘰」** | `gooey-processor.js` + `ProceduralAudioEngine.ts` | AudioWorklet + Sine+Triangle + 動態 LPF |
| **頻率滑降 200→65 Hz** | `GooeyProcessor.process` | 指數衰減 |
| **動態參數映射** | `ProceduralAudioEngine.triggerGooey` | 觸控速度 → 音高 / Cutoff / 音量 |

---

## 🚀 快速開始

### 本機開發

```bash
# 1. 安裝依賴
cd ProceduralSlime
npm install

# 2. 啟動 dev server（http://localhost:5173）
npm run dev

# 3. 用瀏覽器開啟後，第一次互動（點擊）會啟用：
#    - AudioWorklet（程序化音效）
#    - DeviceOrientationEvent（陀螺儀）—— 在 iOS 需手動授權
```

### 打包 APK（本機）

需要先安裝：
- **JDK 17**（Temurin 推薦，[下載](https://adoptium.net/)）
- **Android SDK**（[cmdline-tools](https://developer.android.com/studio#command-line-tools-only)）
- **Gradle 8.7+**
- **Cordova 13**（`npm install -g cordova@13`）

```bash
# 設定環境變數（加到 ~/.bashrc）
export JAVA_HOME=$HOME/jdk17
export ANDROID_HOME=$HOME/android-sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

# 一鍵打包
bash scripts/build-apk.sh
# → 輸出：/home/z/my-project/download/procedural-slime-v0.1.0-debug.apk
```

### GitHub Actions 自動打包

**首次使用**：

1. Fork 或 clone 這個 repo
2. 推送 commit 到 `main` 分支即可觸發自動 build
3. 等待 5~10 分鐘，APK 會自動出現在 **Releases** 頁面

**發布穩定版**：
```bash
git tag v0.1.0
git push origin v0.1.0
```

**手動觸發**：GitHub UI → Actions → Build Android APK → Run workflow

---

## 📋 開發路線圖

### v0.1.0（核心玩法 PoC）✅
- [x] GameManager 狀態機 (Idle/Touch/Gyro)
- [x] SDF/Metaballs WebGL2 shader
- [x] 軟體物理 + DeviceOrientation 重力
- [x] AudioWorklet 程序化「咕嘰」音效
- [x] 色粉 Jacobi 擴散 + SSS
- [x] 48dp 觸控熱區 + safe-area-inset
- [x] AdaptiveFPS (60/30/15)
- [x] Cordova + GitHub Actions 自動打包 APK

### v0.2.0（細化體驗）
- [ ] 多點觸控支援
- [ ] 色粉 SSS 效果優化
- [ ] 設定面板（音量、視覺強度、陀螺儀靈敏度）
- [ ] 存檔系統（localStorage 記住色粉狀態）
- [ ] 觸感回饋 (`navigator.vibrate`)
- [ ] App 圖示與 splash screen

### v0.3.0（上架準備）
- [ ] Release build 簽名（keystore 加入 GitHub Secret）
- [ ] Google Play Services 整合
- [ ] 隱私權政策
- [ ] 多語系（繁中 / 英文）
- [ ] 正式上架 Google Play

---

## 🔐 安全注意事項

1. **絕對不要** 在 commit 中分享 Personal Access Token
2. **絕對不要** 把 keystore 加入 git（已加入 `.gitignore`）
3. 本專案的 GitHub Actions 只使用 `GITHUB_TOKEN`（自動提供），不需要任何外部 secret
4. 若要簽名 release build，把 keystore base64 編碼後加入 `ANDROID_KEYSTORE_BASE64` secret

---

## 📜 授權

MIT License - 見 [LICENSE](LICENSE)

---

## 🤝 貢貢獻

歡迎提交 Issue 與 PR。開發時遵循模組邊界（5 個 Agent 分工），避免跨模組直接耦合。
