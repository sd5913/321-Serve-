# Godot 版 321 Serve

使用 Godot 4.7.2 制作并验证。在项目管理器点击「导入」，选择同目录 project.godot，打开 scenes/level.tscn，按 F6 运行当前场景，点击开始。

A 捏饭，D 沿圆弧向下扫走。触屏左半边捏、右半边扫。Esc 暂停，R 重开。

## 在 Inspector 里修改

选中场景根节点 Level，展开 Settings 资源。

- Pattern 是每句的顺序。1 普通，2 三段反弹，3 三连，4 海绵。默认 111223322114，重复四轮。
- BPM 控制节拍速度，Repeats 控制轮数。
- Normal / Bounce / Triple / Sponge Beats 控制每类乐句总长度。下一句直接从上一句结束时开始。
- Sweep Pivot 是手刀的圆心，Sweep Radius 是半径。Start / End Degrees 控制起止角度，Sweep Duration 控制时长。默认由画面上方顺时针向下掠过饭团。
- Pinch Duration 控制捏饭时长，Rice Exit Duration 控制扫走速度。
- Perfect / Good Window 为秒，Input Offset Ms 为输入补偿。

设置保存在 data/default_settings.tres，可在 FileSystem 中直接选中。调整后重新开局生效。乐句长度要容纳对应动作，三连默认先三次 A，再一次 D。

## 场景和代码

Table、Machine、HandPinch、SweepPivot/HandBlade、Smoke、Drops 都是独立 Sprite2D，可替换纹理、修改大小和 z_index。机器、手和圆心的位置在运行时受 Settings 与动作脚本控制，需调整动作位置时修改 Settings 或 scripts/level.gd 中的目标坐标。

饭团是 RiceLayer 下运行时生成的独立 Sprite2D，scripts/rice.gd 管理捏扁与离场。可在运行时 Remote 场景树查看每一份饭团。

scripts/level.gd 管理节奏表、输入、判分、出饭路径和手势。build_chart 里可逐项修改提示到出手的拍数。animate_table 中的反弹路线依次经过机器出口、顶部、右侧，再落到操作位。

## 本版规则

普通段总计一拍，蓄力和弹出约占前三分之一，随后捏饭，再下扫。弹饭段先蓄力，走三段反弹路线后捏饭和扫走。三连段先出三份，再依次 A、A、A、D。海绵直接 D，误捏会溅水。

手只由实际按键触发。D 即使提前或按晚，也会将已经出现的饭团扫走，同时保留节奏判分。普通与三连的下一句直接衔接，上一批离场动画可与下一批蓄力同时发生。

截图写 B 手刀，本版依据上一轮明确要求采用 D。截图中弹饭线条被解释为出口→顶部→右侧→操作位的三段路径。具体方向、曲率与打点可在脚本中修改。沿用原配乐，本版节奏为按截图编排的原型谱面，仍需按你的音乐听感微调。

验证脚本 scripts/verify.gd 可用命令 godot --headless --path 项目目录 --script res://scripts/verify.gd 运行，检查命中、按晚下扫仍推动饭团、空闲隐藏手以及各句连续。
