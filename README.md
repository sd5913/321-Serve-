# 当前 HTML 试玩版 · 2026-11-19

打开 index.html，点击 START。A 捏饭，D 圆弧下扫，触屏左侧捏、右侧扫。每秒一拍，相邻动作之间留一整拍，30 组关卡约 3 分 15 秒。三连饭半拍内逐份弹出，按右、中、左顺序捏三份，再用 D 扫走。海绵可用 A 捏住甩走，或 D 直接扫走。

包含与游戏时钟同步的合成背景配乐，以及出饭、故障、红灯、烟雾、捏饭、拍饭、反弹、海绵和饭团碰撞音效。右上声音按钮统一静音，Esc 暂停或继续。

素材在 assets/level2，配乐与音效实现于 soundtrack.js。Godot 可编辑原型在 godot/project.godot，其进度对应此前移植版本。以下保留开发历史，当前 HTML 操作与节奏以本节为准。

## 动势与操作更新

A 捏饭，D 从上向下扫走，触屏左侧捏、右侧下扫。手仅由按键或触屏触发，漏拍不自动伸手。出饭采用蓄力压缩、突然释放、减速落地，捏饭快速伸入再回收，下扫加速并带走饭团。

前十一句采用 11122332211，1 为单份、2 为蓄力弹饭、3 为三连饭；随后加入海绵、三连和单份收尾。三连输入 A、A、A、D。图层按桌面、饭团、机器出口、手、水滴顺序绘制，动作裁剪在操作台内。

## 新版关卡 · 2026-11-19

打开 index.html，点击 START。A 捏饭，D 手刀拍走，Space 兼容捏饭。触屏左半边捏饭、右半边手刀。右下圆环收拢到内圈时按键。

47 秒关卡依次包含正常出饭、故障弹饭、三连饭、海绵和混合挑战。正常出饭轻抖，故障在出饭前红灯、抖动、黑烟与蓄力。三连饭按 A、A、A、D，最后一次手刀扫走整批。

海绵直接 D 扫走，误按 A 会溅水并断连击。这是依据分镜两条动作分支采用的规则假设。具体节拍由本版安排，沿用原背景音乐，需要实机试听校准。

素材来自 Figma 页面 303:2 的 Assets 与逐帧分镜，保存在 assets/level2。画面用独立图层实时绘制。Perfect 显示成形饭团，Good 显示不规则饭团，漏捏保留散饭。

下方是旧版记录，旧版的空格单键与黄色特写说明已由上述新版操作替代。

# 321 Serve

A rhythm game about shaping rice balls to the beat.

一款跟着节拍捏饭团的音乐游戏。

## Play locally · 本地试玩

Download or clone this repository, then open **index.html** in a modern browser. No build step, network connection or runtime dependencies are needed. Keep the assets folder next to the HTML file. On phones, landscape orientation is recommended.

下载仓库后，用 Chrome 或 Edge 打开 [index.html](index.html)，点击 **START**，阅读教学后点击 **GOT IT**。无需安装依赖，手机试玩推荐横屏。

- Click **START**, then **GOT IT**. A static **3 → 2 → 1 → GO!** plays before the unchanged soundtrack starts from zero; then listen for its original four-beat lead-in. Press **Space** or tap the game canvas as a rice plate reaches the central red zone.
- **Escape** pauses/resumes; use the upper-right pause button or the SOUND / FULLSCREEN controls beneath the game.
- The yellow **SQUISH** section asks for one press every two beats.
- 120 BPM · 47 seconds · 56 notes · four-beat count-in.
- Perfect: ±75 ms. Good: ±155 ms. Late notes miss automatically; extra presses break the combo and reduce accuracy.
- Open the gear on the start screen to adjust input compensation from −200 to +200 ms. Positive values compensate late input. Reduced-motion mode removes shaking and the close-up camera change.

### Playtest record · 试玩记录

[Playtest observations, next actions and owners · 试玩观察、后续计划与负责人](docs/playtest-log.md)

### v0.0 UI update · 界面更新

<sub>5 November 2026 · 2026年11月5日</sub>

- Explored **six Startpage designs** and selected the start-screen direction currently used in the project.
- Finalized the large-heading style based on the selected Startpage: the initial rounded, soft lettering became **forward-slanted, angular, heavy display lettering with cut corners, a thick dark-navy outline and cream fill**, giving the interface a stronger sense of rhythm and arcade energy. <sub>Typography finalized: 9 November 2026 · 字体确定：2026年11月9日</sub>

11月5日从 **6 个 Startpage 方案**中选定目前使用的开始页方向；11月9日通过开始页确定大标题字形，由最初偏圆润、柔和的字体，调整为现在 **向前倾斜、棱角分明、带切角的粗重字形**，搭配厚深蓝描边与米白色字面，强化节奏感与街机游戏风格。

### v0.1 UI update · 界面更新

- The start screen uses the repository artwork for the sushi turntable, logo, START button and settings gear. The count-in uses the illustrated **3 → 2 → 1** assets followed by **GO!**.
- Both normal play and SQUISH show **ON BEAT!** for Perfect and Good hits, with the judgment and timing offset beneath the artwork. **MISS!** shows **TOO LATE** for a missed note or **OFF BEAT** for an extra press.

开场使用仓库里的寿司转盘、Logo 和按钮素材。普通段和 SQUISH 段共用判定贴图。命中时显示 **ON BEAT!** 和偏差毫秒数，漏拍或误触时显示 **MISS!** 和具体原因。

![Start-screen design reference / 开始页设计参考](assets/ui/complete/Startpage.png)

### v0.2 UI update · 界面更新

<sub>12 November 2026 · 2026年11月12日</sub>

- Extended the selected Startpage and confirmed heading style into the **complete UI set**: start screen, tutorial, **3 → 2 → 1 → GO!**, gameplay HUD, **ON BEAT!/MISS!**, pause, settings, quit confirmation and results.
- Updated the individual UI components and established consistent typography, colors, thick outlines, buttons, icons and screen layouts across the interface.

以选定的 Startpage 和确定后的标题风格为基础，制定并完善全部 UI 页面与小组件，覆盖开始页、教学、倒计时、游戏 HUD、判定反馈、暂停、设置、退出确认及结算页，并统一字体、配色、厚描边、按钮、图标和页面排版。

### Version scope

The browser prototype plays a bundled soundtrack from [assets/audio](assets/audio/) and uses its playback time to synchronize the fixed chart. Hit and miss effects are synthesized with Web Audio. Audio and input latency still need real-device playtesting.

### UI integration · 16 November 2026

The start screen, tutorial, countdown, judgment feedback, pause, settings, quit confirmation and results use the supplied UI components. Large headings remain supplied artwork; small runtime text is English in locally bundled IBM Plex Mono. Results display the actual calculated percentage.

The six-note HUD records chart judgments: coral circle = Perfect/Good, cross = missed note, cream = pending. It advances through groups of six using the existing music playback clock and input-offset setting. An extra off-beat press still shows MISS feedback and affects the original score; it does not consume a scheduled note. Dots keep a square aspect ratio and are independent of camera shake.

Canvas resolution follows the displayed size and device pixel ratio (up to 3×); pause and percentage artwork use SVG. Source PNGs are preserved rather than artificially upscaled, so low-resolution source backgrounds can still look soft on large screens. The soundtrack, chart, judgment windows and sound-effect synthesis are unchanged; volume sliders default to the previous levels.

### Verification

Run `node tests/ui-regression.cjs` for dependency-free HUD, percentage and asset checks. An optional native Canvas integration check is documented in [verification notes](docs/prototype/VERIFICATION.md). For browser checks, install Playwright and Chromium, then run `node verify.cjs`; `PLAYWRIGHT_MODULE` and `BROWSER_PATH` can select an existing installation. The latest UI passed Node and native Canvas integration checks; browser/device visual and audio-latency checks remain to be run on a machine with browser access.

### Font credit

IBM Plex Mono © IBM Corp., licensed under the SIL Open Font License 1.1. The font and [license](assets/fonts/IBM-Plex-Mono-OFL.txt) are bundled locally. AI assistance was used for UI integration, responsive styling and regression checks; the supplied design artwork remains the visual reference.

This repository holds the visual design and development materials for *321 Serve*.

---

## Visual Design

The full visual design of the game — interface layouts, visual style, and component guidelines — is created in Figma:

**Figma design → [HP – 321 Serve](https://www.figma.com/design/wDOcRmw9hqUAvnOOdLzmeV/HP?node-id=0-1&p=f)**

> The Figma file above is our team's original visual design for the game. It defines the interface and visual direction of the project, and all subsequent development follows it as the reference.

---

## Project Info

| Item | Details |
| --- | --- |
| Title | 321 Serve |
| Genre | Music rhythm game |
| Visual design | [Figma](https://www.figma.com/design/wDOcRmw9hqUAvnOOdLzmeV/HP?node-id=0-1&p=f) |
| Stage | v0.1 — first playable interaction prototype |

---

## Structure

| Path | Contents |
| --- | --- |
| [Complete UI / 完整界面](assets/ui/complete/) | Full screen layout references and complete dialog panels |
| [Separate UI elements / 独立元素](assets/ui/elements/) | Transparent components for game integration |
| [UI backgrounds / 背景](assets/ui/backgrounds/) | Kitchen background images |
| [UI asset guide](assets/ui/README.md) | Folder usage, duplicate cleanup and component notes |
| [assets/game/](assets/game/) | Game asset overview |
| [docs/Sushi_Rhythm_Design_and_Assets.docx](docs/Sushi_Rhythm_Design_and_Assets.docx) | Chinese transcription of the handwritten game design and asset list, dated 2 November 2026 |
| [docs/level-design-rhythm-plating.md](docs/level-design-rhythm-plating.md) | Level design for the rhythm plating stage: mechanics, rules and the full required art asset list (English) |

Full screen references and the game asset overview are preserved as supplied. UI components are separated into a dedicated elements directory; see the UI asset guide before implementation. The Chinese design document records an earlier proposal and its open questions; it is not a statement that every listed feature or asset is complete.

---

## Contact

For design or development questions, please reach the team through the repository issues.
