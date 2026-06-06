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
const GAME_WIDTH = 12800; // 12.5 miles in game units (1000 units = 1 mile)
const GAME_HEIGHT = 7200;
const PLAYER_MAX_SPEED = 189.5;
const POLICE_MAX_SPEED = 200;
const CITY_CENTER_X = GAME_WIDTH / 2;
const CITY_CENTER_Y = GAME_HEIGHT / 2;
const CITY_RADIUS = 6000; // Approximately 6 miles radius = 12.5 miles diameter

// Game States
const STATE = {
    RUNNING: 'running',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory'
};

// Pursuit States
const PURSUIT_STATE = {
    SEARCH: 'search',
    PURSUIT: 'pursuit',
    CONTAINMENT: 'containment'
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
            policeImg.src = 'file_00000000f820720c96555bdb986101c9-removebg-preview.png';
        })
    ]);
}

// Road system
class Road {
    constructor(points, width = 120) {
        this.points = points;
        this.width = width;
        this.segments = [];
        this.computeSegments();
    }

    computeSegments() {
        for (let i = 0; i < this.points.length - 1; i++) {
            this.segments.push({
                start: this.points[i],
                end: this.points[i + 1]
            });
        }
    }

    draw(ctx) {
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();

        // Draw road markings
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    isNearRoad(pos, distance = 100) {
        for (let segment of this.segments) {
            const dist = this.distanceToLineSegment(pos, segment.start, segment.end);
            if (dist < distance) return true;
        }
        return false;
    }

    distanceToLineSegment(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)));
        const nearestX = lineStart.x + t * dx;
        const nearestY = lineStart.y + t * dy;
        const distX = point.x - nearestX;
        const distY = point.y - nearestY;
        return Math.sqrt(distX * distX + distY * distY);
    }
}

class RoadSign {
    constructor(x, y, text, direction) {
        this.pos = { x, y };
        this.text = text;
        this.direction = direction;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        
        // Draw sign post
        ctx.fillStyle = '#444444';
        ctx.fillRect(-5, -30, 10, 40);
        
        // Draw sign
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-40, -30, 80, 40);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-40, -30, 80, 40);
        
        // Draw text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, 0, -10);
        
        ctx.restore();
    }
}

class RoadNetwork {
    constructor() {
        this.roads = [];
        this.signs = [];
        this.exits = [];
        this.createRoads();
    }

    createRoads() {
        const center = { x: CITY_CENTER_X, y: CITY_CENTER_Y };

        // Main north route (leads to north exit)
        const northRoute = [
            { x: center.x, y: center.y },
            { x: center.x + 100, y: center.y - 1000 },
            { x: center.x + 200, y: center.y - 2000 },
            { x: center.x + 300, y: center.y - 3500 },
            { x: center.x + 300, y: center.y - 5800 }
        ];
        this.roads.push(new Road(northRoute, 120));
        this.exits.push({ x: center.x + 300, y: center.y - 5800, name: 'North Exit' });
        this.signs.push(new RoadSign(center.x + 100, center.y - 1500, 'North Exit', 'N'));

        // Main south route (leads to south exit)
        const southRoute = [
            { x: center.x, y: center.y },
            { x: center.x - 150, y: center.y + 1000 },
            { x: center.x - 300, y: center.y + 2000 },
            { x: center.x - 400, y: center.y + 3500 },
            { x: center.x - 400, y: center.y + 5800 }
        ];
        this.roads.push(new Road(southRoute, 120));
        this.exits.push({ x: center.x - 400, y: center.y + 5800, name: 'South Exit' });
        this.signs.push(new RoadSign(center.x - 150, center.y + 1500, 'South Exit', 'S'));

        // East route (leads to east exit)
        const eastRoute = [
            { x: center.x, y: center.y },
            { x: center.x + 1500, y: center.y - 200 },
            { x: center.x + 3000, y: center.y - 500 },
            { x: center.x + 4500, y: center.y - 300 },
            { x: center.x + 5800, y: center.y }
        ];
        this.roads.push(new Road(eastRoute, 120));
        this.exits.push({ x: center.x + 5800, y: center.y, name: 'East Exit' });
        this.signs.push(new RoadSign(center.x + 2000, center.y - 500, 'East Exit', 'E'));

        // West route (leads to west exit)
        const westRoute = [
            { x: center.x, y: center.y },
            { x: center.x - 1500, y: center.y + 200 },
            { x: center.x - 3000, y: center.y + 500 },
            { x: center.x - 4500, y: center.y + 300 },
            { x: center.x - 5800, y: center.y }
        ];
        this.roads.push(new Road(westRoute, 120));
        this.exits.push({ x: center.x - 5800, y: center.y, name: 'West Exit' });
        this.signs.push(new RoadSign(center.x - 2000, center.y + 500, 'West Exit', 'W'));

        // Branch routes with intersections
        const neBranch = [
            { x: center.x + 100, y: center.y - 1000 },
            { x: center.x + 1500, y: center.y - 1500 },
            { x: center.x + 3000, y: center.y - 2500 },
            { x: center.x + 4500, y: center.y - 4000 },
            { x: center.x + 5800, y: center.y - 5500 }
        ];
        this.roads.push(new Road(neBranch, 100));

        const swBranch = [
            { x: center.x - 150, y: center.y + 1000 },
            { x: center.x - 1500, y: center.y + 1500 },
            { x: center.x - 3000, y: center.y + 2500 },
            { x: center.x - 4500, y: center.y + 4000 },
            { x: center.x - 5800, y: center.y + 5500 }
        ];
        this.roads.push(new Road(swBranch, 100));
    }

    draw(ctx) {
        for (let road of this.roads) {
            road.draw(ctx);
        }
        for (let sign of this.signs) {
            sign.draw(ctx);
        }
    }

    isNearRoad(pos) {
        for (let road of this.roads) {
            if (road.isNearRoad(pos, 150)) return true;
        }
        return false;
    }

    getExits() {
        return this.exits;
    }
}

class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.zoom = 1;
        this.smoothing = 0.1;
    }

    update(target) {
        const desiredX = target.x - this.width / (2 * this.zoom);
        const desiredY = target.y - this.height / (2 * this.zoom);

        this.x += (desiredX - this.x) * this.smoothing;
        this.y += (desiredY - this.y) * this.smoothing;

        this.x = Math.max(0, Math.min(this.x, GAME_WIDTH - this.width / this.zoom));
        this.y = Math.max(0, Math.min(this.y, GAME_HEIGHT - this.height / this.zoom));
    }

    apply(ctx) {
        ctx.save();
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }

    restore(ctx) {
        ctx.restore();
    }

    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.zoom,
            y: (worldY - this.y) * this.zoom
        };
    }

    screenToWorld(screenX, screenY) {
        return {
            x: screenX / this.zoom + this.x,
            y: screenY / this.zoom + this.y
        };
    }
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
    }
    
    update(dt) {
        this.vel = this.vel.add(this.acc.multiply(dt));
        
        const speed = this.vel.magnitude();
        if (speed > this.maxSpeed) {
            this.vel = this.vel.normalize().multiply(this.maxSpeed);
        }
        
        this.pos = this.pos.add(this.vel.multiply(dt));
        
        if (this.vel.magnitude() > 0.1) {
            this.angle = Math.atan2(this.vel.y, this.vel.x);
        }
        
        this.pos.x = Math.max(0, Math.min(GAME_WIDTH, this.pos.x));
        this.pos.y = Math.max(0, Math.min(GAME_HEIGHT, this.pos.y));
        
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
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
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
        this.desiredAngle = 0;
        this.rotationSpeed = 0.1;
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
        this.desiredAngle -= 0.05;
    }
    
    steerRight() {
        this.desiredAngle += 0.05;
    }
    
    steerToAngle(angle) {
        this.desiredAngle = angle;
    }
    
    takeDamage(amount) {
        this.damage = Math.min(100, this.damage + amount);
    }
    
    update(dt) {
        let angleDiff = this.desiredAngle - this.angle;
        
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        this.angle += angleDiff * this.rotationSpeed;
        
        super.update(dt);
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        if (this.spriteImage && this.spriteImage.complete && this.spriteImage.naturalHeight !== 0) {
            ctx.drawImage(this.spriteImage, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 10, this.width - 10, 15);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.width / 2 - 8, -4, 8, 8);
        }
        
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(-5, -20);
        ctx.moveTo(0, -30);
        ctx.lineTo(5, -20);
        ctx.stroke();
        
        ctx.restore();
    }
}

class PoliceVehicle extends Vehicle {
    constructor(x, y, id) {
        super(x, y, 38, 58, '#000000', POLICE_MAX_SPEED);
        this.id = id;
        this.acceleration = 280;
        this.detectionRange = 800;
        this.visualRange = 600;
        this.state = PURSUIT_STATE.SEARCH;
        this.targetPos = new Vector2(x, y);
        this.spriteImage = images.police;
        this.pitAttemptCooldown = 0;
        this.ramCooldown = 0;
    }
    
    update(dt, player, allPolice) {
        this.pitAttemptCooldown = Math.max(0, this.pitAttemptCooldown - dt);
        this.ramCooldown = Math.max(0, this.ramCooldown - dt);

        const distToPlayer = this.pos.distance(player.pos);
        
        const playerDistFromCenter = Math.sqrt(
            Math.pow(player.pos.x - CITY_CENTER_X, 2) + 
            Math.pow(player.pos.y - CITY_CENTER_Y, 2)
        );
        
        if (playerDistFromCenter > CITY_RADIUS - 1000) {
            this.state = PURSUIT_STATE.CONTAINMENT;
            this.containmentBehavior(player, allPolice);
        } else if (distToPlayer < this.visualRange) {
            this.state = PURSUIT_STATE.PURSUIT;
            this.coordinatedPursuitBehavior(player, allPolice);
        } else {
            this.state = PURSUIT_STATE.SEARCH;
            this.searchBehavior();
        }
        
        super.update(dt);
    }
    
    coordinatedPursuitBehavior(player, allPolice) {
        const toPlayer = player.pos.subtract(this.pos).normalize();
        this.applyForce(toPlayer.multiply(this.acceleration * 1.2));
        this.angle = Math.atan2(toPlayer.y, toPlayer.x);
        
        const distToPlayer = this.pos.distance(player.pos);
        if (distToPlayer < 150 && this.pitAttemptCooldown === 0 && Math.random() < 0.02) {
            this.attemptPitManeuver(player);
            this.pitAttemptCooldown = 5;
        }
        
        if (distToPlayer < 120 && this.ramCooldown === 0 && this.vel.magnitude() > 100) {
            this.applyForce(toPlayer.multiply(this.acceleration * 2));
            this.ramCooldown = 3;
        }
    }
    
    containmentBehavior(player, allPolice) {
        const playerDir = player.vel.normalize();
        const predictedPos = player.pos.add(playerDir.multiply(500));
        const toIntercept = predictedPos.subtract(this.pos);
        
        if (toIntercept.magnitude() > 10) {
            const dir = toIntercept.normalize();
            this.applyForce(dir.multiply(this.acceleration * 1.3));
            this.angle = Math.atan2(dir.y, dir.x);
        }
        
        this.coordinateWithOtherUnits(player, allPolice);
    }
    
    coordinateWithOtherUnits(player, allPolice) {
        for (let other of allPolice) {
            if (other.id !== this.id) {
                const distToOther = this.pos.distance(other.pos);
                if (distToOther < 300 && distToOther > 0) {
                    const midpoint = this.pos.add(other.pos).multiply(0.5);
                    const toPlayer = player.pos.subtract(midpoint);
                    
                    if (toPlayer.magnitude() < 400) {
                        const dir = toPlayer.normalize();
                        this.applyForce(dir.multiply(this.acceleration * 0.5));
                    }
                }
            }
        }
    }
    
    attemptPitManeuver(player) {
        const toPlayer = player.pos.subtract(this.pos);
        const angle = Math.atan2(toPlayer.y, toPlayer.x);
        
        let angleDiff = angle - player.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        if (Math.abs(angleDiff) > 0.5) {
            player.takeDamage(8);
            const pushDir = player.vel.normalize().multiply(-150);
            player.applyForce(pushDir);
        }
    }
    
    searchBehavior() {
        const angle = Math.random() * Math.PI * 2;
        const searchDir = new Vector2(Math.cos(angle), Math.sin(angle));
        this.applyForce(searchDir.multiply(this.acceleration * 0.5));
        this.angle += (Math.random() - 0.5) * 0.02;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        if (this.spriteImage && this.spriteImage.complete && this.spriteImage.naturalHeight !== 0) {
            ctx.drawImage(this.spriteImage, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(-this.width / 2, -this.height / 2 + 18, this.width, 6);
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

class PoliceRoadblock {
    constructor(x, y, width = 150, height = 40) {
        this.pos = { x, y };
        this.width = width;
        this.height = height;
    }

    draw(ctx) {
        ctx.fillStyle = 'rgba(100, 100, 200, 0.7)';
        ctx.fillRect(this.pos.x - this.width / 2, this.pos.y - this.height / 2, this.width, this.height);
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.pos.x - this.width / 2, this.pos.y - this.height / 2, this.width, this.height);
    }

    collidesWith(vehicle) {
        const dx = vehicle.pos.x - this.pos.x;
        const dy = vehicle.pos.y - this.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < vehicle.width / 2 + this.width / 2;
    }
}

class TouchController {
    constructor(game) {
        this.game = game;
        this.upArrowBtn = document.getElementById('up-arrow-btn');
        this.downArrowBtn = document.getElementById('down-arrow-btn');
        this.leftArrowBtn = document.getElementById('left-arrow-btn');
        this.rightArrowBtn = document.getElementById('right-arrow-btn');
        this.gasButton = document.getElementById('gas-button');
        this.brakeButton = document.getElementById('brake-button');
        
        this.upActive = false;
        this.downActive = false;
        this.leftActive = false;
        this.rightActive = false;
        this.gasActive = false;
        this.brakeActive = false;
        
        this.setupControls();
    }
    
    setupControls() {
        // Up arrow
        this.upArrowBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.upActive = true;
        });
        this.upArrowBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.upActive = false;
        });
        this.upArrowBtn.addEventListener('mousedown', () => this.upActive = true);
        this.upArrowBtn.addEventListener('mouseup', () => this.upActive = false);
        
        // Down arrow
        this.downArrowBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.downActive = true;
        });
        this.downArrowBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.downActive = false;
        });
        this.downArrowBtn.addEventListener('mousedown', () => this.downActive = true);
        this.downArrowBtn.addEventListener('mouseup', () => this.downActive = false);
        
        // Left arrow
        this.leftArrowBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.leftActive = true;
        });
        this.leftArrowBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.leftActive = false;
        });
        this.leftArrowBtn.addEventListener('mousedown', () => this.leftActive = true);
        this.leftArrowBtn.addEventListener('mouseup', () => this.leftActive = false);
        
        // Right arrow
        this.rightArrowBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.rightActive = true;
        });
        this.rightArrowBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.rightActive = false;
        });
        this.rightArrowBtn.addEventListener('mousedown', () => this.rightActive = true);
        this.rightArrowBtn.addEventListener('mouseup', () => this.rightActive = false);
        
        // Gas button
        this.gasButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.gasActive = true;
        });
        this.gasButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.gasActive = false;
        });
        this.gasButton.addEventListener('mousedown', () => this.gasActive = true);
        this.gasButton.addEventListener('mouseup', () => this.gasActive = false);
        
        // Brake button
        this.brakeButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.brakeActive = true;
        });
        this.brakeButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.brakeActive = false;
        });
        this.brakeButton.addEventListener('mousedown', () => this.brakeActive = true);
        this.brakeButton.addEventListener('mouseup', () => this.brakeActive = false);
    }
    
    update() {
        if (this.upActive) {
            this.game.player.accelerate();
        }
        if (this.downActive) {
            this.game.player.brake();
        }
        if (this.leftActive) {
            this.game.player.steerLeft();
        }
        if (this.rightActive) {
            this.game.player.steerRight();
        }
        if (this.gasActive) {
            this.game.player.accelerate();
        }
        if (this.brakeActive) {
            this.game.player.brake();
        }
    }
}

class Game {
    constructor() {
        this.state = STATE.RUNNING;
        this.pursuitState = PURSUIT_STATE.SEARCH;
        this.lastTime = Date.now();
        
        this.camera = new Camera(canvas.width, canvas.height);
        this.roadNetwork = new RoadNetwork();
        
        this.player = new PlayerVehicle(CITY_CENTER_X, CITY_CENTER_Y);
        
        this.policeUnits = [];
        this.policeUnits.push(new PoliceVehicle(CITY_CENTER_X + 1000, CITY_CENTER_Y, 0));
        this.policeUnits.push(new PoliceVehicle(CITY_CENTER_X - 1000, CITY_CENTER_Y, 1));
        this.policeUnits.push(new PoliceVehicle(CITY_CENTER_X, CITY_CENTER_Y + 1000, 2));
        this.policeUnits.push(new PoliceVehicle(CITY_CENTER_X, CITY_CENTER_Y - 1000, 3));
        
        this.roadblocks = [];
        this.spawnRoadblock();
        
        this.keys = {};
        this.setupInput();
        
        this.touchController = new TouchController(this);
    }
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') this.keys['gas'] = true;
            if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') this.keys['brake'] = true;
            if (e.key === 'ArrowLeft') this.keys['left'] = true;
            if (e.key === 'ArrowRight') this.keys['right'] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            
            if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') this.keys['gas'] = false;
            if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') this.keys['brake'] = false;
            if (e.key === 'ArrowLeft') this.keys['left'] = false;
            if (e.key === 'ArrowRight') this.keys['right'] = false;
        });
    }
    
    handleInput() {
        if (this.keys['gas']) this.player.accelerate();
        if (this.keys['brake']) this.player.brake();
        if (this.keys['left']) this.player.steerLeft();
        if (this.keys['right']) this.player.steerRight();
        
        this.touchController.update();
    }
    
    checkCollisions() {
        for (let police of this.policeUnits) {
            const distToPolice = this.player.pos.distance(police.pos);
            if (distToPolice < 60) {
                this.player.takeDamage(3);
                police.vel = police.vel.multiply(-0.3);
            }
        }
        
        for (let roadblock of this.roadblocks) {
            if (roadblock.collidesWith(this.player)) {
                this.player.takeDamage(5);
            }
        }
    }
    
    spawnRoadblock() {
        if (this.roadblocks.length < 6) {
            const exits = this.roadNetwork.getExits();
            const exit = exits[Math.floor(Math.random() * exits.length)];
            
            const angle = Math.random() * Math.PI * 2;
            const distance = 500 + Math.random() * 1000;
            const x = exit.x + Math.cos(angle) * distance;
            const y = exit.y + Math.sin(angle) * distance;
            
            this.roadblocks.push(new PoliceRoadblock(x, y));
        }
    }
    
    checkVictory() {
        const exits = this.roadNetwork.getExits();
        for (let exit of exits) {
            const distToExit = this.player.pos.distance(new Vector2(exit.x, exit.y));
            if (distToExit < 200) {
                this.showEventScreen('ESCAPED THE CITY');
                this.state = STATE.VICTORY;
                return true;
            }
        }
        return false;
    }
    
    checkGameOver() {
        if (this.player.damage >= 100) {
            this.showEventScreen('YOU WERE CAUGHT');
            this.state = STATE.GAME_OVER;
            return true;
        }
        
        for (let police of this.policeUnits) {
            if (this.player.pos.distance(police.pos) < 40 && this.player.vel.magnitude() < 20) {
                this.showEventScreen('YOU WERE CAUGHT');
                this.state = STATE.GAME_OVER;
                return true;
            }
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
        
        const cappedDt = Math.min(dt, 0.016);
        
        this.handleInput();
        this.player.update(cappedDt);
        
        for (let police of this.policeUnits) {
            police.update(cappedDt, this.player, this.policeUnits);
        }
        
        this.checkCollisions();
        this.camera.update(this.player.pos);
        this.pursuitState = this.policeUnits[0].state;
        
        this.checkVictory();
        this.checkGameOver();
        
        if (Math.random() < 0.0005) {
            this.spawnRoadblock();
        }
    }
    
    draw() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.camera.apply(ctx);
        
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.arc(CITY_CENTER_X, CITY_CENTER_Y, CITY_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        this.roadNetwork.draw(ctx);
        
        for (let roadblock of this.roadblocks) {
            roadblock.draw(ctx);
        }
        
        this.player.draw(ctx);
        for (let police of this.policeUnits) {
            police.draw(ctx);
        }
        
        this.camera.restore(ctx);
        
        document.getElementById('pursuit-status').textContent = this.pursuitState.toUpperCase();
        document.getElementById('damage-value').textContent = Math.floor(this.player.damage) + '%';
        
        const exits = this.roadNetwork.getExits();
        let minDist = Infinity;
        for (let exit of exits) {
            const dist = this.player.pos.distance(new Vector2(exit.x, exit.y));
            minDist = Math.min(minDist, dist);
        }
        const milesDist = (minDist / 1000).toFixed(1);
        document.getElementById('district-value').textContent = milesDist + ' mi';
    }
    
    run() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.run());
    }
}

loadImages().then(() => {
    const game = new Game();
    game.run();
});
