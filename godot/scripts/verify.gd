extends SceneTree

func _initialize() -> void:
	call_deferred("verify")

func verify() -> void:
	var level = load("res://scenes/level.tscn").instantiate()
	root.add_child(level)
	await process_frame
	level.start()
	level.music.stop()
	level.running = false
	# Hit one portion, then deliberately sweep off-beat: rice must still react.
	level.clock = float(level.notes[0].t)
	level.phrase_index = 0
	level.spawn_phrase()
	level.animate_table(level.clock / level.beat_seconds())
	level.running = true
	level.input_action("a")
	assert(level.portions[0].shaped)
	assert(level.score == 1000)
	level.clock += 0.03
	level.input_action("d")
	level.clock += level.settings.sweep_duration * 0.5
	level.animate_hands()
	assert(level.portions[0].departing, "Off-beat D must move rice")
	level.clock += 0.5
	level.animate_hands()
	assert(not level.hand.visible and not level.blade.visible)
	for i in range(1, level.phrases.size()):
		assert(is_equal_approx(float(level.phrases[i].beat), float(level.phrases[i-1].beat) + float(level.phrases[i-1].duration)))
	# Prepare a triple scene for visual review.
	level.start()
	level.music.stop()
	level.running = false
	level.phrase_index = 5
	level.clock = (float(level.phrases[5].beat) + 0.7) * level.beat_seconds()
	level.spawn_phrase()
	level.animate_table(level.clock / level.beat_seconds())
	level.input_action("a")
	level.animate_hands()
	await process_frame
	await process_frame
	if DisplayServer.get_name() != "headless":
		root.get_texture().get_image().save_png("/private/tmp/godot-level.png")
	print("PASS: import, pinch, off-beat sweep response, hidden idle hands, gap-free phrases")
	quit()
