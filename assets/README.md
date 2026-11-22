# Asset groups

- `audio/`: existing music and sound effects.
- `fonts/`: bundled fonts and their licenses.
- `game/environment/`: background, conveyor belt and plate artwork previously stored loose at the assets root.
- `game/hands/`: open-hand and fist artwork previously stored at the root.
- `game/rice/`: loose and formed rice artwork previously stored at the root.
- `game/Assets-2.png`: existing game-art overview sheet.
- `level2/`, `level3/`, `level4/`: existing level-specific asset groups; their paths and contents are preserved.
- `ui/backgrounds/`: UI background artwork.
- `ui/complete/`: complete screen and dialog references, distinct from individual UI elements.
- `ui/elements/`: individual branding, buttons, countdowns, feedback, titles, panels and other reusable UI parts.
- `ui/elements/buttons/unified/`: shared controls with the unified cream fill, including the compact SELECT LEVEL PNG and editable SVG. Original button exports remain in the parent folder.
- `ui/elements/feedback/on-beat-legacy.png`: distinct earlier ON BEAT artwork, preserved from the assets root. Current gameplay continues to use `on-beat.png`.
- `ui/level-select/`: level badges, titles and selector decorations. Shared START, BACK, settings and SELECT LEVEL controls live only in `ui/elements/buttons/unified/`; their relative paths are listed under `sharedControls` in this folder's manifest.
- `ui/source/`: source artwork used by the asset generators.
- `ui/startpage-motion/`: layered home-screen animation artwork.

The eight root PNGs were checked by file hash and decoded RGBA pixels against the other PNGs. None was an exact duplicate. Four identical shared-control PNG copies were removed from `ui/level-select/`. Original artwork, complete-screen references, color variants and SVG/PNG pairs are retained because they serve different purposes. The results screen references the grouped plate and formed-rice files.
