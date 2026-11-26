# Rice Rice Baby tutorial artwork

The approved English tutorial uses a `#87DCB0` background with gently moving related green blocks, `#FCEBD1` panels, `#00133A` outlines and angular title/key lettering. Panel width is 1205 units, reduced from 1446 by one sixth; height and rounded corners are preserved. Narrow `I` glyphs use their own advance width.

- `intro-card`: brief introduction, shape/send keys and left/right touch mapping.
- `lesson-1-card` through `lesson-4-card`: regular rice, triple rice, bouncing rice and sponge. Key sequences are visual, with a crossed-out shape key for the sponge.
- `now-its-your-turn`: transition from demonstration to interactive practice.
- `tutorial-complete-card`: all four patterns complete.
- `continue-button`, `watch-demo-button`, `key-a`, `key-d`, `textbox-empty`: reusable transparent components.
- `countdown-1/2/3` and `countdown-go`: transparent count-in exports. The 3/2/1 companions wrap the shared countdown paths; only their number bodies are matched to GO height, excluding the small decorative accents. GO is coral and the turn cue is cream with navy outline/shadow.
- `background-green`: the solid background, exported separately.

PNGs are exported at twice the design size. Transparent margins surround the components; only the background is opaque. Runtime uses the corresponding SVGs for sharp rendering. Body text is outlined from the bundled IBM Plex Mono font so browsers do not substitute another typeface.

Flow: introduction → explanation → demonstration → “Now it’s your turn!” → practice. Repeat for four patterns. Failed practice replays the same demonstration, then shows “Now it’s your turn!” before another attempt. Continue after completion to a green block-background 3 → 2 → 1 → GO! screen, with 800 ms per image, then start the unchanged formal chart and soundtrack. No count-in appears inside the tutorial. Skip remains available.

To regenerate, install development dependencies `sharp` and Python `fonttools`, then run `node scripts/build-rice-tutorial.cjs` from the repository root. These dependencies are not required by the game in the browser.

`background-blocks` is the static composite; `block-left/right/bottom/top` are separate transparent motion layers. Motion is slow and decorative, and stops for Reduced Motion. The result screen uses the related deeper greens `#75D3A5` and `#60C597`; `assets/ui/elements/result/background-rice-green` is the matching export. Tutorial and formal gameplay both fill the canvas with the original table artwork.
