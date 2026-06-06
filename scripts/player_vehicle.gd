extends CharacterBody2D

# Movement
const MAX_SPEED = 189.5  # MPH equivalent in pixels/frame
const ACCELERATION = 500.0
const FRICTION = 300.0
const ROTATION_SPEED = 5.0

# Damage system
var damage_percent: float = 0.0
var is_disabled: bool = false
var max_damage: float = 100.0

# Input
var input_direction: Vector2 = Vector2.ZERO
var current_speed: float = 0.0
var is_accelerating: bool = false
var is_braking: bool = false

@onready var sprite = $Sprite2D
@onready var collision = $CollisionShape2D
@onready var game_manager = get_parent()

# Mobile UI elements
var mobile_ui: Control
var gas_button: Button
var brake_button: Button
var left_arrow: Button
var right_arrow: Button

func _ready():
	# Create player vehicle sprite (white rectangle for now)
	if not sprite:
		sprite = Sprite2D.new()
		add_child(sprite)
		sprite.modulate = Color.WHITE
		sprite.scale = Vector2(2, 3)
	
	# Create collision shape
	if not collision:
		collision = CollisionShape2D.new()
		add_child(collision)
		var shape = RectangleShape2D.new()
		shape.size = Vector2(32, 48)
		collision.shape = shape
	
	# Setup mobile controls
	setup_mobile_controls()

func setup_mobile_controls():
	# Create mobile UI container
	mobile_ui = Control.new()
	add_child(mobile_ui)
	mobile_ui.anchor_right = 1.0
	mobile_ui.anchor_bottom = 1.0
	
	# Bottom left: Gas button
	gas_button = Button.new()
	mobile_ui.add_child(gas_button)
	gas_button.text = "GAS"
	gas_button.anchor_left = 0
	gas_button.anchor_top = 1
	gas_button.anchor_right = 0
	gas_button.anchor_bottom = 1
	gas_button.offset_left = 20
	gas_button.offset_top = -120
	gas_button.custom_minimum_size = Vector2(100, 100)
	gas_button.modulate = Color(0.3, 0.7, 0.3, 0.8)
	gas_button.pressed.connect(_on_gas_pressed)
	gas_button.released.connect(_on_gas_released)
	
	# Bottom left below gas: Brake button
	brake_button = Button.new()
	mobile_ui.add_child(brake_button)
	brake_button.text = "BRAKE"
	brake_button.anchor_left = 0
	brake_button.anchor_top = 1
	brake_button.anchor_right = 0
	brake_button.anchor_bottom = 1
	brake_button.offset_left = 20
	brake_button.offset_top = -200
	brake_button.custom_minimum_size = Vector2(100, 100)
	brake_button.modulate = Color(0.7, 0.3, 0.3, 0.8)
	brake_button.pressed.connect(_on_brake_pressed)
	brake_button.released.connect(_on_brake_released)
	
	# Bottom right: Left arrow
	left_arrow = Button.new()
	mobile_ui.add_child(left_arrow)
	left_arrow.text = "◀"
	left_arrow.anchor_left = 1
	left_arrow.anchor_top = 1
	left_arrow.anchor_right = 1
	left_arrow.anchor_bottom = 1
	left_arrow.offset_left = -220
	left_arrow.offset_top = -120
	left_arrow.custom_minimum_size = Vector2(100, 100)
	left_arrow.modulate = Color(0.3, 0.5, 0.8, 0.8)
	left_arrow.pressed.connect(_on_left_pressed)
	left_arrow.released.connect(_on_left_released)
	
	# Bottom right: Right arrow
	right_arrow = Button.new()
	mobile_ui.add_child(right_arrow)
	right_arrow.text = "▶"
	right_arrow.anchor_left = 1
	right_arrow.anchor_top = 1
	right_arrow.anchor_right = 1
	right_arrow.anchor_bottom = 1
	right_arrow.offset_left = -110
	right_arrow.offset_top = -120
	right_arrow.custom_minimum_size = Vector2(100, 100)
	right_arrow.modulate = Color(0.3, 0.5, 0.8, 0.8)
	right_arrow.pressed.connect(_on_right_pressed)
	right_arrow.released.connect(_on_right_released)

# Mobile button callbacks
func _on_gas_pressed():
	is_accelerating = true

func _on_gas_released():
	is_accelerating = false

func _on_brake_pressed():
	is_braking = true

func _on_brake_released():
	is_braking = false

func _on_left_pressed():
	input_direction.x = -1

func _on_left_released():
	input_direction.x = 0

func _on_right_pressed():
	input_direction.x = 1

func _on_right_released():
	input_direction.x = 0

func _process(delta):
	if is_disabled:
		return
	
	handle_input()
	update_movement(delta)
	update_rotation()
	
	velocity = velocity.normalized() * current_speed

func _physics_process(delta):
	if not is_disabled:
		move_and_slide()

func handle_input():
	# Desktop controls (arrow keys)
	if Input.is_action_pressed("ui_up"):
		is_accelerating = true
	else if Input.is_action_pressed("ui_down"):
		is_braking = true
	else:
		if not (gas_button.is_pressed() if gas_button else false):
			is_accelerating = false
		if not (brake_button.is_pressed() if brake_button else false):
			is_braking = false
	
	# Steering
	input_direction.x = 0
	if Input.is_action_pressed("ui_left"):
		input_direction.x -= 1
	if Input.is_action_pressed("ui_right"):
		input_direction.x += 1
	
	# Mobile doesn't override - handled by button callbacks
	if not (left_arrow.is_pressed() if left_arrow else false):
		pass
	if not (right_arrow.is_pressed() if right_arrow else false):
		pass
	
	input_direction = input_direction.normalized()

func update_movement(delta):
	var target_speed = 0.0
	
	if is_accelerating:
		target_speed = MAX_SPEED
		current_speed = move_toward(current_speed, target_speed, ACCELERATION * delta)
	elif is_braking:
		target_speed = 0.0
		# Braking is faster than natural friction
		current_speed = move_toward(current_speed, target_speed, FRICTION * 2.0 * delta)
	else:
		# Natural deceleration
		target_speed = 0.0
		current_speed = move_toward(current_speed, target_speed, FRICTION * delta)
	
	# Apply steering based on current speed
	if current_speed > 0:
		velocity = velocity.rotated(input_direction.x * ROTATION_SPEED * delta)
		velocity = velocity.normalized() * current_speed
	else:
		velocity = Vector2.ZERO

func update_rotation():
	if velocity.length() > 0:
		rotation = velocity.angle()

func take_damage(amount: float):
	if is_disabled:
		return
	
	damage_percent = min(damage_percent + amount, max_damage)
	print("Vehicle damaged: %.1f%%" % damage_percent)
	
	if damage_percent >= max_damage:
		disable_vehicle()

func disable_vehicle():
	is_disabled = true
	print("Vehicle disabled - Game Over")
	game_manager.player_apprehended()

func get_velocity_magnitude() -> float:
	return velocity.length()
