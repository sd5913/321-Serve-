# UI colors · 界面配色

- **Navy / 深蓝：`#00133A`** — sampled as the most frequent fully opaque navy pixel in `elements/branding/logo-321-serve.png`, the supplied 321 Serve title. The original reference logo remains intact.
- **Cream / 米白：`#FCEBD1`** — unchanged.
- **Coral / 珊瑚红：`#FF5537`** — unchanged, including MISS and the TOO EARLY / TOO LATE lettering.

Independent UI components, percentage artwork, selector assets, outlines, labels, and runtime UI text share the same navy. The normalization preserves pixel dimensions and alpha. Complete-screen references, source sheets, backgrounds, and gameplay illustration layers retain their original colors.

独立 UI 组件、百分比、选关素材、描边与运行时文字统一采用大标题取样的深蓝。素材尺寸与透明通道保留；整页设计参考、原始字形图、背景和游戏插画不改色。

`elements/feedback/too-early.png` and `too-late.png` include editable SVG counterparts. They are now used for early/late feedback in the level and tutorial. ON BEAT remains the hit feedback; wrong keys and unrelated extra presses use OFF BEAT. These are display labels only: music, chart, note results, judgment windows and scoring are unchanged.

TOO EARLY / TOO LATE 提供透明 PNG 与可编辑 SVG，现已用于关卡和教程的早晚反馈；命中仍显示 ON BEAT，按错键及无对应操作的多按显示 OFF BEAT。仅更换显示标签，音乐、谱面、音符结果、判定范围及计分不变。

Generators call `scripts/normalize-ui-navy.cjs` so rebuilt assets keep the same navy. Run it directly with Sharp available to normalize independent UI assets.

## Sharp runtime assets · 运行时清晰度

Runtime UI now prefers true path SVG companions listed in [crisp-assets.json](crisp-assets.json): logo, buttons, headings, settings labels, countdowns, feedback and percentages. Colors are flat fills; the original PNGs remain as source/reference files. `elements/branding/logo-321-serve-hd.png` is a transparent 4× PNG export of the clean vector logo. The level badges also use vector digits.

运行界面优先使用清单里的真实路径 SVG，保留原有字形轮廓并统一为纯色色块。原 PNG 保留作源文件／参考；标题另提供透明 4 倍 PNG。选关数字也已矢量化。

The scene canvas follows display pixel density (up to 3×, capped at 4096×2160 backing pixels). Judgment artwork is a separate SVG/DOM layer and is not enlarged from that canvas. Live whole-screen cream recolor filters were removed, avoiding mottled fills and an extra rasterization pass.

场景画布按屏幕像素密度绘制，判定字条独立为 SVG/DOM 层；不再将低分辨率画布里的字放大，也不再依赖整屏实时改色滤镜。

To regenerate from the supplied artwork, install the optional development tools (`npm install --no-save sharp potrace`), run the relevant existing asset generator first, then `node scripts/build-crisp-ui.cjs`. `SHARP_MODULE` and `POTRACE_MODULE` can point to existing installations. The game itself has no new runtime dependency.

重新导出时先运行对应原有生成脚本，再运行清晰版脚本。Potrace 只用于开发时描摹原素材轮廓，不会随游戏运行，也不替换为其他字体。
