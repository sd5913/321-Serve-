# UI Assets / UI 素材

## Choose the right folder / 选择对应目录

| Folder | Purpose |
| --- | --- |
| [complete/](complete/) — 完整界面 | Full layout references supplied for the project. These are not independent interactive controls. |
| [complete/dialogs/](complete/dialogs/) — 完整弹窗 | Higher-resolution, tightly cropped transparent pause, settings and quit panels, with their contents baked in. Use for static previews. |
| [elements/](elements/) — 独立元素 | Tightly cropped transparent PNG components for implementation: buttons, titles, countdowns, feedback, HUD dots, sliders and a blank modal panel. |
| [backgrounds/](backgrounds/) — 背景 | Four kitchen backgrounds; no UI controls. |

## Implementation / 接入说明

- Keep complete screen references as layout guides. Their existing pause buttons and backgrounds are part of the reference image; do not stack the whole reference with another pause button.
- For an interactive screen, assemble elements/modals/panel-base.png, separate titles and individual buttons. The complete dialogs have baked-in controls and are not substitutes for separate button objects.
- Use one shared pause button anchored to the upper-right safe area across gameplay screens. Countdown PNGs in elements/countdown contain only the number and its decoration.
- Prefer elements/rhythm/bar-base.png plus six independent dots. Each beat can be pending, hit or miss independently. The precomposed six-beat states are static alternatives; the zero-to-six states share a 3740 × 702 canvas cropped to the bar.
- Settings sliders are split into track, fill and thumb. The two slider-*-reference.png files are static examples only; actual values and movement are controlled by code.
- score-100-percent-sample.png is a static design sample. Render the actual result percentage using the game code, rather than always showing 100%.
- Set UI positions and display sizes in the game layout; component PNG dimensions are native asset sizes, not screen coordinates.
- Full layout references retain their original dimensions, backgrounds and composition. Some are opaque or have slightly different canvas sizes. Use their layout as reference rather than switching entire screenshots during play.

## Duplicates and quality / 重复素材与清晰度

| Previously uploaded item | Current location / decision |
| --- | --- |
| Dot_Cream.png, Dot_Coral.png, Dot_Miss.png | Retained as elements/rhythm/dot-pending.png, dot-hit.png and dot-miss.png. Cropped from the same source detail; lower output dimensions are due to removing transparent margins, not downscaling. |
| image 49.png (298 × 128) | Replaced by elements/feedback/on-beat.png (1902 × 816), using the clearer existing standalone artwork. |
| Rhythm_Bar_5_Dots.png | Removed from the current UI directory; six beats are the current specification. The previous file remains available in Git history. |
| HUD0.png–HUD6.png, HUD-4-miss.png | Retained in complete/ as the full layout references. Independent dots and six-beat bars are in elements/rhythm/. |
| Pause.png and ExitConfirmation.png | Retained as full layout references. Clearer cropped transparent panels are in complete/dialogs/, and separate controls are in elements/. |

Existing screen layouts have not been redesigned. No game asset files are changed by this UI update. File dimensions and component types are listed in [asset-index.json](asset-index.json).

## Asset sources

The visuals reuse the project's existing design exports, including AI-assisted imagery. This upload organizes existing artwork into complete references and independent UI components; it does not claim that the UI is already integrated into the game.
