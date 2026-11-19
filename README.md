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

下载仓库后，用 Chrome 或 Edge 打开 [index.html](index.html)，点击 **START**。无需安装依赖，手机试玩推荐横屏。

- Click **START** and listen for the four-beat count-in. Press **Space** or tap the game canvas as a rice plate reaches the central red zone.
- **Escape** pauses/resumes; the top bar also includes pause, mute and fullscreen controls.
- The yellow **SQUISH** section asks for one press every two beats.
- 120 BPM · 47 seconds · 56 notes · four-beat count-in.
- Perfect: ±75 ms. Good: ±155 ms. Late notes miss automatically; extra presses break the combo and reduce accuracy.
- Open the gear on the start screen to adjust input compensation from −200 to +200 ms. Positive values compensate late input. Reduced-motion mode removes shaking and the close-up camera change.

### v0.1 UI update · 界面更新

- The start screen uses the repository artwork for the sushi turntable, logo, START button and settings gear. The count-in uses the illustrated **3 → 2 → 1** assets followed by **GO!**.
- Both normal play and SQUISH show **ON BEAT!** for Perfect and Good hits, with the judgment and timing offset beneath the artwork. **MISS!** shows **TOO LATE** for a missed note or **OFF BEAT** for an extra press.

开场使用仓库里的寿司转盘、Logo 和按钮素材。普通段和 SQUISH 段共用判定贴图。命中时显示 **ON BEAT!** 和偏差毫秒数，漏拍或误触时显示 **MISS!** 和具体原因。

![Start-screen design reference / 开始页设计参考](assets/ui/complete/Startpage.png)

### Version scope

The browser prototype plays a bundled soundtrack from [assets/audio](assets/audio/) and uses its playback time to synchronize the fixed chart. Hit and miss effects are synthesized with Web Audio. Audio and input latency still need real-device playtesting.

### Verification

Browser checks cover asset loading, keyboard and pointer hits, off-beat feedback, pause/resume, the squish segment, results, restart, and a 375px viewport. To repeat: install Playwright as a development tool, install its Chromium browser, and run **node verify.cjs**. Optional environment variables PLAYWRIGHT_MODULE and BROWSER_PATH select an existing local installation.

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

Full screen references and the game asset overview are preserved as supplied. UI components are separated into a dedicated elements directory; see the UI asset guide before implementation. The Chinese design document records an earlier proposal and its open questions; it is not a statement that every listed feature or asset is complete.

---

## Contact

For design or development questions, please reach the team through the repository issues.
