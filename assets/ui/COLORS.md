# UI colors · 界面配色

- **Navy / 深蓝：`#00133A`** — sampled as the most frequent fully opaque navy pixel in `elements/branding/logo-321-serve.png`, the supplied 321 Serve title. The original reference logo remains intact.
- **Cream / 米白：`#FCEBD1`** — unchanged.
- **Coral / 珊瑚红：`#FF5537`** — unchanged, including MISS and the TOO EARLY / TOO LATE lettering.

Independent UI components, percentage artwork, selector assets, outlines, labels, and runtime UI text share the same navy. The normalization preserves pixel dimensions and alpha. Complete-screen references, source sheets, backgrounds, and gameplay illustration layers retain their original colors.

独立 UI 组件、百分比、选关素材、描边与运行时文字统一采用大标题取样的深蓝。素材尺寸与透明通道保留；整页设计参考、原始字形图、背景和游戏插画不改色。

`elements/feedback/too-early.png` and `too-late.png` include editable SVG counterparts. They are available as assets only; this update does not change judgment rules or wire the new feedback into gameplay.

TOO EARLY / TOO LATE 提供透明 PNG 与可编辑 SVG，本次仅加入素材库，尚未接入游戏判定。

Generators call `scripts/normalize-ui-navy.cjs` so rebuilt assets keep the same navy. Run it directly with Sharp available to normalize independent UI assets.
