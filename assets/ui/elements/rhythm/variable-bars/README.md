# 可变点数节奏条 / Variable-dot rhythm bars

- 普通版 / Normal: `bar-1-pending` 至 / through `bar-5-pending`，透明 PNG 与可编辑 SVG。既有六点素材保留在 [six-beat-states](../six-beat-states/)。
- [细框版 / Slim](slim/): 1–6 点，每款均有透明 PNG 与可编辑 SVG。
- 普通版几何 / Normal geometry: 圆点直径 / dot diameter 60、间距 / gap 36、端部留白 / horizontal padding 48、高度 / height 120。
- 细框版几何 / Slim geometry: 圆点与间距不变，端部留白 / horizontal padding 24、高度 / height 92。

教学 HUD 按当前组显示普通版 2、4、2、1 点；正式关卡显示固定 4 点 slim 队列。运行时以相同几何与配色绘制独立状态点，便于显示命中、漏拍及平滑滚动。原素材不覆盖。

The tutorial HUD uses normal bars with 2, 4, 2 and 1 slots for its four lessons. The main level uses a fixed four-slot slim queue. Runtime dots use the same geometry and colors so judgments can update independently and the queue can scroll smoothly. Existing assets are preserved.
