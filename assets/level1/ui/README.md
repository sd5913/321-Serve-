# Clean rice machine artwork

`machine-clean.svg` uses solid color regions and the supplied machine silhouette. Its main panel is #87DCB0, with cream/beige and metal colors retained as separate details. Filled regions are opaque, so the red glow does not tint the body through partially transparent pixels.

The original `assets/level1/imgMachineNormal1.png` is preserved. Both files use the same 1536 × 1024 coordinate space. `machine-clean.png` is the transparent 2× export; the game uses SVG directly.

Regenerate with `node scripts/build-clean-machine.cjs` (development dependencies: sharp and potrace). Runtime requires no new library. Tutorial and formal rounds share machine placement, scale and glow coordinates.
