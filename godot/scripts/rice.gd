extends Sprite2D

var shaped := false
var departing := false
var departed := false
var exit_time := 0.0
var exit_origin := Vector2.ZERO
var exit_direction := Vector2.DOWN
var exit_duration := 0.25
var base_scale := Vector2.ONE
var squeeze_time := -10.0

func launch_exit(at: float, direction: Vector2, duration: float) -> void:
	if departing or departed:
		return
	departing = true
	exit_time = at
	exit_origin = position
	exit_direction = direction.normalized()
	exit_duration = duration

func animate(at: float) -> void:
	if departing:
		var progress := clampf((at - exit_time) / exit_duration, 0.0, 1.0)
		position = exit_origin + exit_direction * progress * progress * 1500.0
		rotation = progress * 0.65
		modulate.a = 1.0 - progress * progress
		if progress >= 1.0:
			departed = true
			visible = false
	else:
		var elapsed := at - squeeze_time
		var squash := sin(clampf(elapsed / 0.2, 0.0, 1.0) * PI) * 0.13
		scale = base_scale * Vector2(1.0 + squash, 1.0 - squash)
