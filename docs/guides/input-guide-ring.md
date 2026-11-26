# Formal-round input guide: retained settings and restoration

The formal round hides the level/phase label, right-hand A/D ring and caption, and bottom live action hint. Tutorial explanation cards, demo/practice prompts and their text remain unchanged. Score, COMBO, judgment artwork, dot bar, pause and the progress line remain visible.

## Restore the display

In `game.js`, search for `LEVEL_UI_GUIDES` near the top:

```js
const LEVEL_UI_GUIDES=Object.freeze({phase:false,inputRing:false,actionHint:false});
```

Set `inputRing:true` to show the original ring and its A/D/caption again during formal play. Set `phase:true` to restore the top-left level/phase label; set `actionHint:true` to restore the bottom live instruction. These toggles affect rendering only. Reload after editing, and update the `game.js` version query in `index.html` when publishing.

The original ring code remains in `draw(t)` in `game.js`. Search for `LEVEL_UI_GUIDES.inputRing` or `c.arc(1040, 150`.

## Original ring settings

Coordinates use the 1200 × 675 logical HUD space; they are separate from the machine/table coordinate space.

- Target: the first note without a `result` (`notes.find(n => !n.result)`).
- Distance in beats: `(next.t - t) / BEAT` using the audio clock passed to `draw`.
- Highlight: `Math.abs(distance) <= .14` beats. This is a visual highlight, **not** the scoring window.
- Center: `(1040, 150)`.
- Radius: `20 + clamp(distance, 0, 2) * 11` (20–42 logical units).
- Stroke: coral/6 units when highlighted; navy/3 otherwise.
- Key label: `next.action.toUpperCase()` at `(1040, 158)`, 24-unit type.
- Caption: `PRESS NOW!` or `PRESS AS THE RING CLOSES` at `(1040, 210)`, 16-unit type.

Retained original rendering block:

```js
const distance = (next.t - t) / BEAT;
const onBeat = Math.abs(distance) <= .14;
c.strokeStyle = onBeat ? RED : INK;
c.lineWidth = onBeat ? 6 : 3;
c.beginPath();
c.arc(1040, 150, 20 + Math.max(0, Math.min(2, distance)) * 11, 0, Math.PI * 2);
c.stroke();
txt(next.action.toUpperCase(),1040,158,24,onBeat?RED:INK,'center');
txt(onBeat?'PRESS NOW!':'PRESS AS THE RING CLOSES',1040,210,16,onBeat?RED:INK,'center');
```

## Actual input judgments are unchanged

`perfectWindow` and `goodWindow` near the top of `game.js` are `.24 * BEAT` and `.4 * BEAT`. `hit(action)` applies the input offset to the audio time (`judge = t - offset / 1000`) and performs the original action, timing and score checks. Automatic misses remain in `loop(ms)`. Hiding/restoring the ring does not change these functions, chart notes, soundtrack or touch/keyboard controls.
