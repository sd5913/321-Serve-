class_name LevelSettings
extends Resource

@export_range(60, 180) var bpm: float = 120.0
@export var pattern: Array[int] = [1, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 4]
@export var repeats: int = 4
@export var normal_beats: float = 1.0
@export var bounce_beats: float = 2.0
@export var triple_beats: float = 1.5
@export var sponge_beats: float = 1.0
@export var countdown_beats: float = 4.0
@export var perfect_window: float = 0.07
@export var good_window: float = 0.12
@export var sweep_pivot: Vector2 = Vector2(1670, 200)
@export var sweep_radius: float = 650.0
@export var sweep_start_degrees: float = -150.0
@export var sweep_end_degrees: float = -255.0
@export var sweep_duration: float = 0.32
@export var pinch_duration: float = 0.22
@export var rice_exit_duration: float = 0.25
@export var input_offset_ms: float = 0.0
