extends CharacterBody2D

const MAX_SPEED = 190.0
const ACCELERATION = 250.0
const FRICTION = 100.0
const ROTATION_SPEED = 6.0
const PURSUIT_DISTANCE = 400.0
const SEARCH_RADIUS = 500.0

var current_speed = 0.0
var is_pursuing = false
var pursuit_target: Vector2 = Vector2.ZERO
var search_direction = 0.0
var search_timer = 0.0
var player_ref: Node = null

func _ready():
	search_direction = randf() * TAU

func _process(delta):
	if player_ref == null:
		player_ref = get_parent().get_node("Player")
	
	update_behavior(delta)
	update_movement(delta)
	rotate_towards_direction()

func update_behavior(delta):
	if player_ref == null:
		return
	
	var distance_to_player = global_position.distance_to(player_ref.global_position)
	
	if is_pursuing:
		pursuit_target = player_ref.global_position
		# Try to position ahead of player for containment
		var player_vel = player_ref.velocity.normalized()
		if player_vel.length() > 0:
			pursuit_target += player_vel * 50
	else:
		# Search pattern
		search_timer += delta
		if search_timer > 3.0:
			search_timer = 0.0
			search_direction = randf() * TAU

func update_movement(delta):
	var target_direction = Vector2.ZERO
	
	if is_pursuing and player_ref != null:
		target_direction = (pursuit_target - global_position).normalized()
		current_speed = move_toward(current_speed, MAX_SPEED, ACCELERATION * delta)
	else:
		# Patrol/search behavior
		target_direction = Vector2.RIGHT.rotated(search_direction)
		current_speed = move_toward(current_speed, MAX_SPEED * 0.7, ACCELERATION * delta)
	
	if target_direction.length() > 0:
		velocity = target_direction * current_speed
	else:
		velocity = Vector2.ZERO
	
	move_and_slide()

func rotate_towards_direction():
	if velocity.length() > 10:
		var target_angle = velocity.angle()
		rotation = lerp_angle(rotation, target_angle, ROTATION_SPEED * get_physics_process_delta_time())

func set_pursuit_mode(pursuing: bool):
	is_pursuing = pursuing

func get_current_district() -> String:
	var x = global_position.x
	var y = global_position.y
	
	if x < 400:
		return "WEST"
	elif x > 900:
		return "EAST"
	elif y < 300:
		return "NORTH"
	elif y > 500:
		return "SOUTH"
	else:
		return "CENTRAL"
