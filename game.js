// YOLO - Escape Simulation Game
// HTML5 + JavaScript Implementation

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size based on container
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game Constants
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const PLAYER_MAX_SPEED = 189.5;
const POLICE_MAX_SPEED = 200;
const CITY_BOUNDARY = 100; // Distance from edge to escape

// Game States
const STATE = {
    RUNNING: 'running',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory'
};

// Pursuit States
const PURSUIT_STATE = {
    SEARCH: 'search',
    PURSUIT: 'pursuit'
};

// Image assets
const images = {
    player: null,
    police: null
};

// Load images
function loadImages() {
    return Promise.all([
        new Promise((resolve) => {
            const playerImg = new Image();
            playerImg.onload = () => {
                images.player = playerImg;
                resolve();
            };
            playerImg.onerror = () => {
                console.warn('Failed to load player image');
                resolve();
            };
            // Player car uses flipped image
            playerImg.src = 'flipped_image (2).png';
        }),
        new Promise((resolve) => {
            const policeImg = new Image();
            policeImg.onload = () => {
                images.police = policeImg;
                resolve();
            };
            policeImg.onerror = () => {
                console.warn('Failed to load police image');
                resolve();
            };
            // Police car uses file_000000... image
            policeImg.src = 'file_00000000f820720c96555bdb986101c9-removebg-preview.png';
        })
    ]);
}

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    
    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }
    
    distance(v) {
        return this.subtract(v).magnitude();
    }
}

class Vehicle {
    constructor(x, y, width, height, color, maxSpeed) {
        this.pos = new Vector2(x, y);
        this.vel = new Vector2(0, 0);
        this.acc = new Vector2(0, 0);
        this.width = width;
        this.height = height;
        this.color = color;
        this.maxSpeed = maxSpeed;
        this.angle = 0;
        this.angularVel = 0;
    }
    
    update(dt) {
        // Apply acceleration
        this.vel = this.vel.add(this.acc.multiply(dt));
        
        // Limit speed
        const speed = this.vel.magnitude();
        if (speed > this.maxSpeed) {
            this.vel = this.vel.normalize().multiply(this.maxSpeed);
        }
        
        // Update position
        this.pos = this.pos.add(this.vel.multiply(dt));
        
        // Update angle based on velocity
        if (this.vel.magnitude() > 0.1) {
            this.angle = Math.atan2(this.vel.y, this.vel.x);
        }
        
        // Clamp to bounds
        this.pos.x = Math.max(0, Math.min(GAME_WIDTH, this.pos.x));
        this.pos.y = Math.max(0, Math.min(GAME_HEIGHT, this.pos.y));
        
        // Friction
        this.vel = this.vel.multiply(0.95);
        this.acc = new Vector2(0, 0);
    }
    
    applyForce(force) {
        this.acc = this.acc.add(force);
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        // Draw vehicle body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Draw direction indicator
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.width / 2 - 8, -4, 8, 8);
        
        ctx.restore();
    }
}

class PlayerVehicle extends Vehicle {
    constructor(x, y) {
        super(x, y, 40, 60, '#ffffff', PLAYER_MAX_SPEED);
        this.damage = 0;
        this.acceleration = 300;
        this.brakingForce = 400;
        this.spriteImage = images.player;
    }
    
    accelerate() {
        const dir = new Vector2(Math.cos(this.angle), Math.sin(this.angle));
        this.applyForce(dir.multiply(this.acceleration));
    }
    
    brake() {
        const dir = this.vel.normalize();
        this.applyForce(dir.multiply(-this.brakingForce));
    }
    
    steerLeft() {
        if (this.vel.magnitude() > 10) {
            this.angle -= 0.05;
        }
    }
    
    steerRight() {
        if (this.vel.magnitude() > 10) {
            this.angle += 0.05;
        }
    }
    
    steerToAngle(angle) {
        if (this.vel.magnitude() > 10) {
            // Smoothly rotate towards target angle
            let diff = angle - this.angle;
            // Normalize angle difference to [-PI, PI]
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.angle += diff * 0.1;
        }
    }
    
    takeDamage(amount) {
        this.damage = Math.min(100, this.damage + amount);
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        // Draw sprite if loaded, otherwise fallback to geometric shape
        if (this.spriteImage && this.spriteImage.complete && this.spriteImage.naturalHeight !== 0) {
            ctx.drawImage(this.spriteImage, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Fallback geometric vehicle
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            
            // Draw red interior accents
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 10, this.width - 10, 15);
            
            // Draw direction indicator
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.width / 2 - 8, -4, 8, 8);
        }
        
        ctx.restore();
    }
}

class PoliceVehicle extends Vehicle {
    constructor(x, y) {
        super(x, y, 38, 58, '#000000', POLICE_MAX_SPEED);
        this.acceleration = 280;
        this.detectionRange = 300;
        this.visualRange = 250;
        this.state = PURSUIT_STATE.SEARCH;
        this.searchTimer = 0;
        this.lastPlayerPos = new Vector2(x, y);
        this.spriteImage = images.police;
    }
    
    update(dt, player) {
        // Check for player detection
        const distToPlayer = this.pos.distance(player.pos);
        
        if (distToPlayer < this.visualRange) {
            this.state = PURSUIT_STATE.PURSUIT;
            this.lastPlayerPos = new Vector2(player.pos.x, player.pos.y);
        } else if (distToPlayer > this.visualRange * 1.5) {
            this.state = PURSUIT_STATE.SEARCH;
        }
        
        // AI behavior
        if (this.state === PURSUIT_STATE.PURSUIT) {
            this.chaseBehavior(player);
        } else {
            this.searchBehavior(player);
        }
        
        super.update(dt);
    }
    
    chaseBehavior(player) {
        const toPlayer = player.pos.subtract(this.pos).normalize();
        this.applyForce(toPlayer.multiply(this.acceleration * 1.2));
        
        // Orient towards player
        this.angle = Math.atan2(toPlayer.y, toPlayer.x);
    }
    
    searchBehavior(player) {
        const toLastPos = this.lastPlayerPos.subtract(this.pos);
        
        if (toLastPos.magnitude() < 20) {
            // Change search direction
            const angle = Math.random() * Math.PI * 2;
            this.lastPlayerPos = this.pos.add(new Vector2(Math.cos(angle) * 200, Math.sin(angle) * 200));
        }
        
        const dir = toLastPos.normalize();
        this.applyForce(dir.multiply(this.acceleration * 0.8));
        this.angle = Math.atan2(dir.y, dir.x);
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        // Draw sprite if loaded, otherwise fallback to geometric shape
        if (this.spriteImage && this.spriteImage.complete && this.spriteImage.naturalHeight !== 0) {
            ctx.drawImage(this.spriteImage, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Fallback geometric vehicle
            ctx.fillStyle = '#000000';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            
            // Draw police stripe
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(-this.width / 2, -this.height / 2 + 18, this.width, 6);
            
            // Draw emergency lights
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(-this.width / 4, -this.height / 2 - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#0000ff';
            ctx.beginPath();
            ctx.arc(this.width / 4, -this.height / 2 - 3, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

class TouchController {
    constructor(game) {
        this.game = game;
        this.gasButton = document.getElementById('gas-button');
        this.brakeButton = document.getElementById('brake-button');
        
        this.gasActive = false;
        this.brakeActive = false;
        
        // Touch steering
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.steeringAngle = 0;
        this.isTouching = false;
        
        this.setupControls();
    }
    
    setupControls() {
        // Gas button
        this.gasButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.gasActive = true;
        });
        this.gasButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.gasActive = false;
        });
        this.gasButton.addEventListener('mousedown', () => {
            this.gasActive = true;
        });
        this.gasButton.addEventListener('mouseup', () => {
            this.gasActive = false;
        });
        
        // Brake button
        this.brakeButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.brakeActive = true;
        });
        this.brakeButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.brakeActive = false;
        });
        this.brakeButton.addEventListener('mousedown', () => {
            this.brakeActive = true;
        });
        this.brakeButton.addEventListener('mouseup', () => {
            this.brakeActive = false;
        });
        
        // Touch steering on canvas
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), false);
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
        
        // Mouse steering for desktop
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e), false);
    }
    
    handleTouchStart(e) {
        if (e.touches.length > 0) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.isTouching = true;
        }
    }
    
    handleTouchMove(e) {
        if (!this.isTouching || e.touches.length === 0) return;
        
        e.preventDefault();
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        
        const dx = currentX - this.touchStartX;
        const dy = currentY - this.touchStartY;
        
        // Calculate steering angle from touch movement
        this.steeringAngle = Math.atan2(dy, dx);
    }
    
    handleTouchEnd(e) {
        this.isTouching = false;
        this.steeringAngle = 0;
    }
    
    handleMouseMove(e) {
        // Get player position in screen space
        const playerScreenX = (this.game.player.pos.x / GAME_WIDTH) * canvas.width;
        const playerScreenY = (this.game.player.pos.y / GAME_HEIGHT) * canvas.height;
        
        const dx = e.clientX - playerScreenX;
        const dy = e.clientY - playerScreenY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only steer if mouse is within reasonable distance
        if (distance > 20 && distance < 500) {
            this.steeringAngle = Math.atan2(dy, dx);
        }
    }
    
    update() {
        if (this.gasActive) {
            this.game.player.accelerate();
        }
        if (this.brakeActive) {
            this.game.player.brake();
        }
        
        // Touch/mouse steering
        if (this.isTouching || this.steeringAngle !== 0) {
            this.game.player.steerToAngle(this.steeringAngle);
        }
    }
}

class Game {
    constructor() {
        this.state = STATE.RUNNING;
        this.pursuitState = PURSUIT_STATE.SEARCH;
        this.lastTime = Date.now();
        this.paused = false;
        
        // Create vehicles
        this.player = new PlayerVehicle(GAME_WIDTH / 2, GAME_HEIGHT - 100);
        this.police = new PoliceVehicle(100, 100);
        
        // Roadblocks
        this.roadblocks = [];
        this.spawnRoadblock();
        
        // Input handling
        this.keys = {};
        this.setupInput();
        
        // Touch controller
        this.touchController = new TouchController(this);
    }
    
    setupInput() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') this.keys['gas'] = true;
            if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') this.keys['brake'] = true;
            if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') this.keys['left'] = true;
            if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') this.keys['right'] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            
            if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') this.keys['gas'] = false;
            if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') this.keys['brake'] = false;
            if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') this.keys['left'] = false;
            if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') this.keys['right'] = false;
        });
    }
    
    handleInput() {
        // Keyboard input
        if (this.keys['gas']) this.player.accelerate();
        if (this.keys['brake']) this.player.brake();
        if (this.keys['left']) this.player.steerLeft();
        if (this.keys['right']) this.player.steerRight();
        
        // Touch input
        this.touchController.update();
    }
    
    checkCollisions() {
        // Police collision with player
        const distToPolice = this.player.pos.distance(this.police.pos);
        if (distToPolice < 40) {
            this.player.takeDamage(5);
            this.police.vel = this.police.vel.multiply(-0.5);
        }
        
        // Roadblock collisions
        for (let roadblock of this.roadblocks) {
            if (this.collideWithRoadblock(this.player, roadblock)) {
                this.player.takeDamage(3);
            }
        }
    }
    
    collideWithRoadblock(vehicle, roadblock) {
        const dx = vehicle.pos.x - roadblock.x;
        const dy = vehicle.pos.y - roadblock.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < vehicle.width / 2 + roadblock.width / 2;
    }
    
    spawnRoadblock() {
        // Spawn roadblocks at random locations
        if (this.roadblocks.length < 3) {
            const x = Math.random() * (GAME_WIDTH - 100) + 50;
            const y = Math.random() * (GAME_HEIGHT - 100) + 50;
            this.roadblocks.push({ x, y, width: 80, height: 80 });
        }
    }
    
    checkVictory() {
        // Check if player escaped the city
        if (this.player.pos.x < CITY_BOUNDARY || 
            this.player.pos.x > GAME_WIDTH - CITY_BOUNDARY ||
            this.player.pos.y < CITY_BOUNDARY ||
            this.player.pos.y > GAME_HEIGHT - CITY_BOUNDARY) {
            this.showEventScreen('CENTRAL CITY ESCAPED');
            this.state = STATE.VICTORY;
            return true;
        }
        return false;
    }
    
    checkGameOver() {
        if (this.player.damage >= 100) {
            this.showEventScreen('YOU WERE CAUGHT');
            this.state = STATE.GAME_OVER;
            return true;
        }
        
        // Check if apprehended (police too close)
        if (this.player.pos.distance(this.police.pos) < 25 && this.player.vel.magnitude() < 10) {
            this.showEventScreen('YOU WERE CAUGHT');
            this.state = STATE.GAME_OVER;
            return true;
        }
        
        return false;
    }
    
    showEventScreen(message) {
        const eventScreen = document.getElementById('event-screen');
        const eventContent = document.getElementById('event-content');
        eventContent.textContent = message;
        eventScreen.classList.remove('hidden');
    }
    
    update() {
        if (this.state !== STATE.RUNNING) return;
        
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        // Cap dt to prevent large jumps
        const cappedDt = Math.min(dt, 0.016);
        
        this.handleInput();
        this.player.update(cappedDt);
        this.police.update(cappedDt, this.player);
        this.checkCollisions();
        
        // Update pursuit state for HUD
        this.pursuitState = this.police.state;
        
        // Check win/lose conditions
        this.checkVictory();
        this.checkGameOver();
        
        // Spawn roadblocks occasionally
        if (Math.random() < 0.001) {
            this.spawnRoadblock();
        }
    }
    
    draw() {
        // Clear canvas
        ctx.fillStyle = '#222222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw city grid
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        for (let i = 0; i < GAME_WIDTH; i += 80) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, GAME_HEIGHT);
            ctx.stroke();
        }
        for (let i = 0; i < GAME_HEIGHT; i += 80) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(GAME_WIDTH, i);
            ctx.stroke();
        }
        
        // Draw city boundaries
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(CITY_BOUNDARY, CITY_BOUNDARY, GAME_WIDTH - CITY_BOUNDARY * 2, GAME_HEIGHT - CITY_BOUNDARY * 2);
        ctx.setLineDash([]);
        
        // Draw roadblocks
        ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        for (let roadblock of this.roadblocks) {
            ctx.fillRect(roadblock.x - roadblock.width / 2, roadblock.y - roadblock.height / 2, roadblock.width, roadblock.height);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(roadblock.x - roadblock.width / 2, roadblock.y - roadblock.height / 2, roadblock.width, roadblock.height);
        }
        
        // Draw vehicles
        this.player.draw(ctx);
        this.police.draw(ctx);
        
        // Update HUD
        document.getElementById('pursuit-status').textContent = this.pursuitState.toUpperCase();
        document.getElementById('damage-value').textContent = Math.floor(this.player.damage) + '%';
    }
    
    run() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.run());
    }
}

// Load images and start the game
loadImages().then(() => {
    const game = new Game();
    game.run();
});
