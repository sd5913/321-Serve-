# Level 3 — Sushi Making / 第三关：寿司制作

## Playable build / 可玩版本

This level is a playable rhythm game. Open `index.html` directly — all artwork and audio are embedded as data URIs, so it works from `file://` or any static host with no extra requests.

Play online: https://sd5913.github.io/321-Serve-/assets/level3/index.html

- `index.html` — standalone playable build (open this one)
- `index.source.html` — source build with relative `assets/` references
- `assets/` — artwork and audio used by the source build
- The PNG assets and `manifest.json` listed below are the original level artwork and are all preserved.

Controls: Arrow Left / A for salmon, Arrow Right / D for squid. Click the game first to give it keyboard focus; you can also tap the left / right half of the board.

---

# Level 3 — Sashimi / 第三关资产：三文鱼与鱿鱼

## English

Each PNG is an individual asset taken from the earlier high-resolution source images, rather than an enlarged overview screenshot. Original pixel proportions and alpha channels are preserved, with transparent margins around each asset.

- cutting-board-1~3: three long cutting boards.
- plate-round: a white plate viewed directly from above.
- hand-chopsticks-*: pinching, small flick and large flick poses.
- salmon-character-style-1~3-*: three pattern sets, each with front, right, back and left views.
- salmon-chunk-happy-1~2: happy salmon-chunk alternatives.
- squid-character-frightened: a frightened squid slice.
- squid-slice-1~5 and squid-slice-curved: six top-view squid slices.
- salmon-slice-set-a-1~5 and set-b-1~5: two sets of top-view salmon-slice alternatives.

manifest.json records each file's high-resolution source, crop region and dimensions. Only assets were added; game logic was not changed. The existing assets/level1 folder is preserved to avoid overwriting the earlier rice assets.

## 中文

每个 PNG 为一个独立素材，来自历史高清原图，未使用总览截图放大。保持原始像素比例及透明通道，四周留有透明间距。

- cutting-board-1~3：三种长案板
- plate-round：正俯视白盘
- hand-chopsticks-*：夹取、小幅甩动、大幅甩动
- salmon-character-style-1~3-*：三套花纹，正面、右侧、背面、左侧
- salmon-chunk-happy-1~2：开心三文鱼块候选
- squid-character-frightened：惊恐鱿鱼片
- squid-slice-1~5 与 squid-slice-curved：六种俯视鱿鱼片
- salmon-slice-set-a-1~5、set-b-1~5：两组俯视三文鱼片候选

manifest.json 记录每个文件的高清来源、裁切区域及尺寸。只添加素材，不修改游戏逻辑。保留仓库原有 assets/level1，避免覆盖旧饭团素材。
