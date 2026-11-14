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

The browser prototype uses a synthesized Web Audio track and a fixed chart. Audio and input latency still need real-device playtesting.

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
