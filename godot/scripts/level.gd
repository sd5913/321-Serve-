extends Node2D

@export var settings: LevelSettings
@export var loose_texture: Texture2D
@export var formed_texture: Texture2D
@export var inaccurate_texture: Texture2D
@export var sponge_texture: Texture2D
@export var squeezed_texture: Texture2D
const Rice = preload("res://scripts/rice.gd")
var phrases: Array[Dictionary] = []
var notes: Array[Dictionary] = []
var portions: Array[Sprite2D] = []
var clock := 0.0
var running := false
var paused := false
var score := 0
var combo := 0
var phrase_index := -1
var gesture := ""
var gesture_time := -10.0
var pinch_target := Vector2.ZERO
var sweep_contact := false
var message_until := 0.0
var splash_until := 0.0
var finished := false
@onready var machine: Sprite2D = $Machine
@onready var hand: Sprite2D = $HandPinch
@onready var blade: Sprite2D = $SweepPivot/HandBlade
@onready var pivot: Node2D = $SweepPivot
@onready var music: AudioStreamPlayer = $Music

func _ready() -> void:
	build_chart()
	$HUD/Help.text = "A 捏饭   D 圆弧下扫   左侧触屏捏 / 右侧扫   Esc 暂停   R 重来"
	$HUD/Start.pressed.connect(start)
	$HUD/Restart.pressed.connect(start)
	$HUD/Restart.hide()
	hand.hide()
	blade.hide()
	$Drops.hide()

func build_chart() -> void:
	phrases.clear()
	notes.clear()
	var beat := settings.countdown_beats
	for cycle in settings.repeats:
		for kind in settings.pattern:
			var duration := settings.normal_beats
			var release := 1.0 / 3.0
			var count := 1
			if kind == 2:
				duration = settings.bounce_beats
				release = 1.3
			elif kind == 3:
				duration = settings.triple_beats
				release = 0.5
				count = 3
			elif kind == 4:
				duration = settings.sponge_beats
				release = 0.5
			var index := phrases.size()
			phrases.append({"beat": beat, "duration": duration, "release": release, "kind": kind, "count": count})
			if kind != 4:
				for slot in count:
					var action_beat := beat + release + (float(slot) / 4.0 if count == 3 else 0.0)
					notes.append({"t": action_beat * beat_seconds(), "action": "a", "phrase": index, "slot": slot, "result": ""})
			var sweep_beat := beat + duration - (0.2 if kind == 3 else 1.0 / 6.0)
			notes.append({"t": sweep_beat * beat_seconds(), "action": "d", "phrase": index, "slot": 0, "result": ""})
			beat += duration

func beat_seconds() -> float:
	return 60.0 / settings.bpm

func start() -> void:
	build_chart()
	for item in $RiceLayer.get_children():
		item.queue_free()
	portions.clear()
	clock = 0.0
	score = 0
	combo = 0
	phrase_index = -1
	gesture = ""
	finished = false
	paused = false
	running = true
	music.stream_paused = false
	music.play()
	$HUD/Start.hide()
	$HUD/Restart.hide()
	$HUD/Result.text = ""

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.physical_keycode:
			KEY_A: input_action("a")
			KEY_D: input_action("d")
			KEY_R: start()
			KEY_ESCAPE:
				paused = not paused
				music.stream_paused = paused
				$HUD/Result.text = "暂停 · Esc 继续" if paused else ""
	if event is InputEventScreenTouch and event.pressed:
		input_action("a" if event.position.x < 975 else "d")
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		input_action("a" if event.position.x < 975 else "d")

func input_action(action: String) -> void:
	if not running or paused or finished:
		return
	gesture = action
	gesture_time = clock
	sweep_contact = false
	pinch_target = Vector2(1105, 450)
	var candidate := -1
	var distance := INF
	for i in notes.size():
		var note: Dictionary = notes[i]
		var delta := absf(clock - settings.input_offset_ms / 1000.0 - float(note.t))
		if note.result == "" and delta < distance:
			distance = delta
			candidate = i
	var correct: bool = candidate >= 0 and distance <= settings.good_window and notes[candidate].action == action
	if correct:
		var note: Dictionary = notes[candidate]
		note.result = "perfect" if distance <= settings.perfect_window else "good"
		combo += 1
		score += 1000 if note.result == "perfect" else 600
		feedback("ON BEAT!", Color("215b48"))
		if action == "a" and int(note.phrase) == phrase_index and int(note.slot) < portions.size():
			var item: Sprite2D = portions[int(note.slot)]
			pinch_target = item.position
			item.texture = formed_texture if note.result == "perfect" else inaccurate_texture
			item.shaped = true
			item.squeeze_time = clock
	else:
		combo = 0
		feedback("OFF BEAT", Color("b04444"))
	# Every physical sweep moves visible rice, including early/late sweeps.
	# Timing score is independent of this contact response.
	if action == "a" and phrase_index >= 0 and int(phrases[phrase_index].kind) == 4:
		for item in portions:
			item.texture = squeezed_texture
			item.squeeze_time = clock
		splash_until = clock + 0.4

func feedback(text: String, color: Color) -> void:
	$HUD/Feedback.text = text
	$HUD/Feedback.modulate = color
	message_until = clock + 0.3

func _process(delta: float) -> void:
	if not running or paused or finished:
		return
	if music.playing:
		clock = maxf(clock, music.get_playback_position() + AudioServer.get_time_since_last_mix() - AudioServer.get_output_latency())
	else:
		clock += delta
	var beat := clock / beat_seconds()
	var next_phrase := -1
	for i in phrases.size():
		if beat >= float(phrases[i].beat):
			next_phrase = i
	if next_phrase != phrase_index:
		phrase_index = next_phrase
		if phrase_index >= 0:
			spawn_phrase()
	animate_table(beat)
	animate_hands()
	for item in portions:
		item.animate(clock)
	for note in notes:
		if note.result == "" and clock - settings.input_offset_ms / 1000.0 > float(note.t) + settings.good_window:
			note.result = "miss"
			combo = 0
			feedback("MISS", Color("b04444"))
	$HUD/Score.text = "%06d   ·   %d COMBO" % [score, combo]
	$HUD/Feedback.visible = clock < message_until
	$Drops.visible = clock < splash_until
	if clock < settings.countdown_beats * beat_seconds():
		$HUD/Feedback.visible = true
		$HUD/Feedback.text = str(ceili(settings.countdown_beats - beat))
	var last: Dictionary = phrases.back()
	if beat >= float(last.beat) + float(last.duration) + 1.0:
		finished = true
		music.stop()
		hand.hide()
		blade.hide()
		$HUD/Result.text = "完成！得分 %d   命中 %d / %d" % [score, notes.filter(func(n): return n.result in ["perfect", "good"]).size(), notes.size()]
		$HUD/Restart.show()

func spawn_phrase() -> void:
	# Departing portions remain alive across phrase boundaries.
	for item in portions:
		if not item.departing:
			item.launch_exit(clock, Vector2.DOWN, settings.rice_exit_duration)
	var data: Dictionary = phrases[phrase_index]
	for slot in int(data.count):
		var item := Sprite2D.new()
		item.set_script(Rice)
		item.texture = sponge_texture if int(data.kind) == 4 else loose_texture
		item.base_scale = Vector2(552.0 / item.texture.get_width(), 368.0 / item.texture.get_height())
		item.scale = item.base_scale
		item.set_meta("phrase", phrase_index)
		item.set_meta("slot", slot)
		item.visible = false
		item.z_index = 2
		$RiceLayer.add_child(item)
		portions.append(item)
	# Keep only current portions in the input list, let exited nodes animate separately.
	portions = portions.filter(func(item): return int(item.get_meta("phrase")) == phrase_index)

func animate_table(beat: float) -> void:
	if phrase_index < 0:
		return
	var data: Dictionary = phrases[phrase_index]
	var elapsed := beat - float(data.beat)
	var release := float(data.release)
	var pressure := pow(clampf(elapsed / maxf(0.01, release - 0.18), 0.0, 1.0), 3.0)
	var charging := elapsed < release - (0.8 if int(data.kind) == 2 else 0.18)
	machine.position.x = 327.5 - (pressure * 12.0 if charging else 0.0) + (sin(clock * 90.0) * pressure * 8.0 if charging else 0.0)
	$Warning.visible = int(data.kind) != 1
	$Warning.position.x = machine.position.x - 89.5
	$Smoke.visible = charging and int(data.kind) != 1
	$HUD/Phase.text = ["", "正常", "三次反弹", "三连饭", "海绵"][int(data.kind)]
	for item in portions:
		if item.departing or item.departed:
			continue
		var travel := clampf((elapsed - (release - (0.8 if int(data.kind) == 2 else 0.18))) / (0.8 if int(data.kind) == 2 else 0.18), 0.0, 1.0)
		item.visible = travel > 0.0
		var slot := int(item.get_meta("slot"))
		var target := Vector2(1500.0 - slot * 330.0 if int(data.count) == 3 else 1105.0, 450)
		if int(data.kind) == 2:
			var path := [Vector2(480, 450), Vector2(1100, 100), Vector2(1810, 320), target]
			var segment := mini(int(travel * 3.0), 2)
			var weight := 1.0 - pow(1.0 - clampf(travel * 3.0 - segment, 0.0, 1.0), 2.0)
			item.position = path[segment].lerp(path[segment + 1], weight)
		else:
			item.position = Vector2(480, 450).lerp(target, 1.0 - pow(1.0 - travel, 3.0))
	# Animate and free old portions after their exit finishes.
	for item in $RiceLayer.get_children():
		if item not in portions:
			item.animate(clock)
			if item.departed:
				item.queue_free()

func animate_hands() -> void:
	var age := clock - gesture_time
	hand.hide()
	blade.hide()
	pivot.position = settings.sweep_pivot
	if gesture == "a" and age >= 0.0 and age < settings.pinch_duration:
		var progress := age / settings.pinch_duration
		var reach := 1.0 - pow(1.0 - progress / 0.35, 3.0) if progress < 0.35 else 1.0 - pow((progress - 0.35) / 0.65, 3.0)
		hand.position = Vector2(2300, 450).lerp(pinch_target, reach)
		hand.show()
	elif gesture == "d" and age >= 0.0 and age < settings.sweep_duration:
		var progress := age / settings.sweep_duration
		var eased := progress * progress * (3.0 - 2.0 * progress)
		pivot.rotation = deg_to_rad(lerpf(settings.sweep_start_degrees, settings.sweep_end_degrees, eased))
		blade.position = Vector2(settings.sweep_radius, 0)
		blade.show()
		if progress >= 0.36 and not sweep_contact:
			sweep_contact = true
			for item in portions:
				if item.visible and not item.departing:
					item.launch_exit(clock, Vector2(0.25, 1.0), settings.rice_exit_duration)
