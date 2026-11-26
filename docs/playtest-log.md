# Playtest record & next actions · 试玩记录与后续计划

Use this shared record for the 19 November 2026 playtest and subsequent weekly updates. Record the tested commit so observations remain tied to the version actually played.

用于记录 2026 年 11 月 19 日试玩及后续每周进展。每次填写实际测试的 commit，避免将旧版本反馈当成当前版本的问题。

## Sessions · 试玩场次

No physical-device playtest results have been entered yet. Automated/browser checks are separate evidence; see [verification notes](prototype/VERIFICATION.md).

尚未录入实际设备的玩家试玩结果。自动化和浏览器检查不等同于真实设备节奏同步验证，相关记录见 [验证说明](prototype/VERIFICATION.md)。

| Date / 日期 | Tested commit / 测试版本 | Device & browser / 设备与浏览器 | Input / 键盘或触屏 | Audio output / 扬声器或耳机 | Offset / 补偿毫秒 | Observer / 记录人 |
| --- | --- | --- | --- | --- | --- | --- |
| To fill / 待填写 | — | — | — | — | — | — |

## Observations & next actions · 观察与下一步

The following are review questions to test, not confirmed player findings. Add evidence, an agreed action, an owner and status after each session.

以下为待验证问题，不是已确认的玩家测试结果。试玩后补充观察依据、约定的改进、负责人及进度。

| Topic / 项目 | Observation or evidence / 观察与依据 | Next action / 下一步 | Owner / 负责人 | Status / 状态 |
| --- | --- | --- | --- | --- |
| First-time learning / 首次上手 | To observe / 待观察 | Check whether a new player learns when to press from the six-note practice without coaching / 检查玩家能否通过六次练习独立理解按键时机 | To assign / 待分配 | To test / 待测试 |
| SQUISH transition / 阶段切换 | Earlier source review raised an instruction concern; verify the current commit / 早期代码评审提出提示问题，需以当前版本验证 | Compare normal and Reduced Motion modes: can players identify the every-two-beats rule? / 比较普通与减少动态模式，检查每两拍一次的规则是否清楚 | To assign / 待分配 | To test / 待测试 |
| Timing / 节奏同步 | No device measurements entered / 尚无设备实测记录 | Compare keyboard/touch and speakers/wired headphones; record early/late tendency and chosen offset / 比较键盘、触屏、扬声器及有线耳机，记录早晚倾向和最终补偿值 | To assign / 待分配 | To test / 待测试 |
| Feedback / 判定反馈 | To observe / 待观察 | Check whether MISS/OFF BEAT and timing feedback help recovery / 检查反馈是否帮助玩家恢复节奏 | To assign / 待分配 | To test / 待测试 |
| Phone controls / 手机操作 | To observe / 待观察 | Check landscape pause, resume, retry and quit on the intended phone / 在目标手机横屏测试暂停、继续、重试及退出 | To assign / 待分配 | To test / 待测试 |
| UI hierarchy & clutter / UI 信息层级与冗余 | User screenshot review on 26 Nov 2026: score, combo, timing text, A/D ring and repeated instructions compete with the food/action area; MISS/ON BEAT artwork and its caption do not share a clear center. Screenshot commit and device are unconfirmed; this is design-review feedback, not a controlled playtest result. / 2026年11月26日用户截图评审：分数、连击、时间判定、A/D 圆环与重复按键提示同时出现，分散对食材及动作的注意；MISS/ON BEAT 与下方文字未统一居中。截图版本、设备未确认，此项为设计评审反馈，非受控试玩结论。 | Review a simplified gameplay layout: center the main feedback; retain pause, slim four-slot judgments and the thin progress line; consider moving score/combo to results and keeping detailed timing/key instructions in tutorials or optional assistance. ON BEAT / TOO EARLY / TOO LATE display labels and shared centering are now integrated; wrong-key feedback remains distinct. Remaining information-reduction proposals still need confirmation. Confirm the layout and compare before/after without changing music, chart, scoring or judgment windows. / 评估精简正式关卡：主反馈统一居中，保留暂停、slim 四点判定条及细进度线；分数／连击移至结算、详细时间和按键提示留在教程或可选辅助均为待确认方案。ON BEAT／TOO EARLY／TOO LATE 字条及统一居中已接入，按错键保留独立提示；其余信息精简方案仍待确认。确认布局后对比试玩，音乐、谱面、计分及判定范围不变。 | UI design & integration — to assign / UI 设计及接入，待分配 | Feedback labels integrated; simplification pending / 判定字条已接入，信息精简待确认 |
| UI rendering clarity / UI 渲染清晰度 | User screenshot review on 26 Nov: fuzzy timing-label edges and mottled/soft title artwork. The scene canvas was capped at 1600 pixels and the home title used a live recolor filter. / 11月26日截图评审：判定字条边缘模糊、标题色块不均；定位到低分辨率画布拉伸及实时改色滤镜。 | Added true-vector companions following the supplied artwork, a clean logo/HD export, native-resolution judgment overlay and higher-density scene rendering; removed live recolor filters. 130 vector silhouettes and safety margins checked; browser 2×/3× checks passed, large-window median frame interval about 16.7 ms. Music, chart and scoring unchanged. / 已补原轮廓矢量版、干净标题及高清导出，判定改为独立高清层，移除实时滤镜；130 个素材轮廓及安全边距、2×/3× 浏览器显示检查通过，大窗口帧间隔中位数约16.7ms。音乐、谱面及计分不变。 | UI integration / UI 接入 | Implemented; team device review pending / 已修复，待团队设备复看 |

## Asset decisions & credits · 素材状态与来源

“Currently used” does not mean “approved for final delivery.” Confirm final/prototype status and source/licence with the team.

“当前使用”不等于“最终交付已确认”。请由团队补全最终／临时状态及来源、授权信息。

| Material / 素材 | Current reference / 当前来源记录 | Final or prototype / 最终或临时 | Next action / 下一步 |
| --- | --- | --- | --- |
| Music & sound / 音乐与音效 | [Audio files](../assets/audio/) and [verification notes](prototype/VERIFICATION.md) / 音频文件与已有验证说明 | To confirm / 待团队确认 | Record creator/source, permission or licence and final decision / 补充作者、来源、许可及最终决定 |
| UI & artwork / UI 与美术 | [Figma design](https://www.figma.com/design/wDOcRmw9hqUAvnOOdLzmeV/HP?node-id=0-1&p=f), [UI guide](../assets/ui/README.md), [start-page layer notes](../assets/ui/startpage-motion/README.md) | To confirm / 待团队确认 | Identify retained final assets and any placeholders / 标明最终保留素材及占位素材 |
| Small-text font / 英文小字字体 | IBM Plex Mono; [SIL OFL licence](../assets/fonts/IBM-Plex-Mono-OFL.txt) | Currently used; final status to confirm / 当前使用，最终状态待确认 | Retain the bundled licence / 保留许可文件 |
| Tools & AI assistance / 工具及 AI 辅助 | Figma design reference; AI assistance described in the README and start-page layer notes / Figma 设计参考，README 与开始页图层说明中的 AI 辅助记录 | Record of process / 过程记录 | Keep credits accurate as assets change / 随素材变化更新来源说明 |

### Confirmed UI choices · 已确认的 UI 设计与资产选择

Confirmed design choices recorded on 19 November 2026. The dates below identify earlier design milestones where provided. These choices do not constitute physical-device playtest results or confirmation of unrelated assets and licences.

以下为 2026年11月19日确认同步的 UI 选择；已提供日期的项目保留原设计节点日期。这些记录不代替真实设备试玩结果，也不代表其他素材及授权已全部确认。

| Item / 项目 | Confirmed direction / 已确定的方向 |
| --- | --- |
| Startpage / 开始页方案 | Selected the current design from six Startpage proposals on 5 November 2026 / 2026年11月5日，从6个 Startpage 方案中选定当前版本 |
| Large headings / 大标题风格 | Confirmed on 9 November 2026: rounded, soft lettering evolved into forward-slanted, angular, heavy display lettering with cut corners, thick dark-navy outlines and cream fills / 2026年11月9日确定：由圆润柔和改为前倾、棱角分明、带切角的粗重字形，配厚深蓝描边与米白字面 |
| UI components / UI 小组件 | Full UI screens and components refined on 12 November 2026, following the selected Startpage visual language / 2026年11月12日完善全套 UI 页面与小组件，沿用开始页建立的视觉语言 |
| Small-text font / 小字字体 | IBM Plex Mono; retain the [bundled licence](../assets/fonts/IBM-Plex-Mono-OFL.txt) / 当前选用 IBM Plex Mono，保留随附许可 |
| Cream color / 统一米白色 | **#FFF0D9** across the page background and cream UI regions / 页面背景及 UI 米白区域统一为 **#FFF0D9** |
| Screen ratio / 页面比例 | Landscape **19.5:9 (13:6)** / 手机横屏 **19.5:9（13:6）** |
| Percentages & GO! / 百分比及 GO! | Use the supplied digit/symbol sheet, preserving its lettering and thick outlines; [101 transparent percentage PNGs](../assets/ui/elements/result/percentages/) and [GO! artwork](../assets/ui/elements/countdown/go.png) / 采用已提供的数字与符号图集，保留字形和粗描边 |
| Startpage animation / 开始页动态 | Follow the approved GIF: sushi characters move to the beat; **clock hands stay fixed**. See [layers and animation notes](../assets/ui/startpage-motion/README.md) and [GIF reference](../assets/ui/startpage-motion/preview.gif) / 以已确认的 GIF 为基础，寿司跟拍活动，**指针固定** |
| Panel sizes / 面板尺寸 | Settings and quit confirmation use the same panel size as Paused / Settings、退出确认框与 Paused 保持相同面板尺寸 |

## Weekly updates · 每周更新

Append a row after each review; link screenshots, issue numbers or recordings where available.

每次讨论后追加一行，可附截图、Issue 或录像链接。

| Week / 周次 | Evidence & observations / 证据与观察 | Decisions & next actions / 决定与下一步 | Owners / 负责人 | Status / 状态 |
| --- | --- | --- | --- | --- |
| 19 November 2026 / 2026年11月19日 | Awaiting playtest entry / 待录入试玩记录 | Complete the session and observation tables above / 填写上方场次与观察表 | To assign / 待分配 | Pending / 待填写 |
| 26 November 2026 / 2026年11月26日 | User screenshot/UI review; tested commit and device unconfirmed. Current repository reference: [c2b6677](https://github.com/sd5913/321-Serve-/commit/c2b66776f6a22625e4273309752df09fb8dff6e2). / 用户截图与 UI 评审，实测版本及设备未确认；当前仓库参考见链接 | Logged UI clutter and feedback-alignment concerns above. EARLY/LATE display feedback and centering are integrated; wider UI simplification remains pending. / 已在上表登记信息冗余及反馈对齐问题；早晚反馈显示及居中已接入，其余界面精简仍待确认 | To assign / 待分配 | Pending design review / 待设计确认 |
