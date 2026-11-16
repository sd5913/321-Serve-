# Verification — 2026-11-12

Passed using Playwright with local Microsoft Edge (headless), against the actual file:// entry point.

- All required local PNG assets loaded.
- Space on a note increments Perfect and score.
- An off-beat press produces the wrong-beat feedback.
- Escape pauses; elapsed level time remains frozen.
- Resume continues the audio timeline.
- The yellow squish segment renders during play.
- The level ends with the result panel.
- Retry resets score and note judgments.
- 375 × 812 viewport has no horizontal overflow; start control visible.
- Pointer input hits the first note.
- No JavaScript page errors.

Screenshots are stored alongside this document. These automated checks validate state and rendering, not subjective audio/visual synchronization or game feel on physical devices.


## UI integration — 2026-11-16

Passed:

- `node --check game.js`, `node --check ui-state.js`, `node --check verify.cjs`.
- `node tests/ui-regression.cjs`: six-note pages, actual judgment mapping, input offset, partial last page, dynamic percentage, English runtime, asset paths and circular CSS constraints.
- Native Canvas integration of the actual game code: loaded all assets and local font, high-DPI backing buffer, tutorial/start, timed keyboard hit, missed note, pause/frozen clock, settings, cancel/confirm quit, resume, SQUISH, results and retry reset.
- Original soundtrack and sound-effect files have identical SHA-256 checksums. Chart and hit-judgment function are unchanged.

Optional integration command (requires @napi-rs/canvas, not needed to play):

```sh
CANVAS_MODULE=/absolute/path/to/@napi-rs/canvas node tests/ui-regression.cjs
```

The native Canvas integration supplies a minimal DOM/audio test harness; it does not validate actual browser CSS layout or hardware audio latency. `verify.cjs` has been updated for the new screens but could not be executed here because the available browser could not access the local project. The 12 November browser results above describe the earlier version, not a browser verification of this UI update.

Manual retest: START → GOT IT → count-in → successful hit / intentional miss → pause → settings/back → resume → result percentage → retry → pause/home/quit. Also check landscape phone sizing and hardware timing with the existing music.
