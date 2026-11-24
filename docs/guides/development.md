# 开发与迭代指南

## 从哪里改

| 路径 | 用途 |
| --- | --- |
| [index.html](../../index.html) · [style.css](../../style.css) | 浏览器入口、画面结构、公共样式和响应式布局 |
| [level-select.js](../../level-select.js) · [level-select.css](../../level-select.css) · [startpage-motion.js](../../startpage-motion.js) | 选关和首页动画 |
| [game.js](../../game.js) · [rice-audio.js](../../rice-audio.js) | 饭团谱面、教学、判定、Canvas 动作及内嵌音频素材 |
| [soundtrack.js](../../soundtrack.js) · [ui-audio.js](../../ui-audio.js) · [audio-studio.js](../../audio-studio.js) | 音频调度、混音和调音台 |
| [assets/](../../assets/) · [scripts/](../../scripts/) | 音画素材与素材生成脚本 |
| [tests/](../../tests/) · [godot/](../../godot/) | 浏览器验证与早期 Godot 原型 |

试玩直接用浏览器打开本地 `index.html` 即可。开发时也可以用静态服务器预览。

## 一轮迭代怎么走

1. **记下现象。** 写清关卡、当前提交、设备、浏览器和输入方式。音频问题补充输出设备和补偿值，画面卡顿补充窗口尺寸、缩放和是否全屏。
2. **做一个可比较的改动。** 如果要替换三连录音，同时留好源文件、片段边界和拍点。若先改素材路径，确认旧引用和资源清单也已更新。
3. **从真实入口玩一次。** 进选关、看完整示范、做一次练习、进正式关卡，再暂停继续。修改音频时也验证静默等待、按键立即发声以及海绵的两种分支。
4. **记录证据。** 先在 [试玩记录](../playtest-log.md) 记现象和复测结果。对玩家或组员有影响的更新，在 [更新记录](../CHANGELOG.md) 补日期和一句说明；可加提交链接以便交接。

## 运行回归

浏览器测试使用 Playwright 和 Chromium。装好测试依赖后，在仓库根目录按改动范围运行。已有独立安装时，可用 `PLAYWRIGHT_MODULE` 和 `BROWSER_PATH` 指定模块和浏览器路径。

| 改动范围 | 回归 |
| --- | --- |
| 首页、选关、开局、暂停、调音台入口 | `node tests/integrated-rice.cjs` |
| 谱面、音频、四项教学 | `node tests/rice-score.cjs`、`node tests/tutorial-audio.cjs` |
| 键盘或音效响应 | `node tests/input-latency.cjs` |
| 调音台编辑、导入和保存 | `node tests/audio-studio.cjs` |

浏览器回归验证逻辑路径。对拍感和性能，还要在常用设备上复测一次，至少覆盖窄窗口和普通大窗口。渲染变慢时，分别测绘制分辨率、整屏滤镜和隐藏界面的重绘，并对比同尺寸下的结果。
