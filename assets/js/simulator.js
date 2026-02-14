// Connect to Socket.IO server
const socket = io({
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
});

// DOM Elements
const canvas = document.getElementById('droneCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('connection-status');

// Telemetry elements
const altitudeEl = document.getElementById('altitude');
const speedEl = document.getElementById('speed');
const pitchEl = document.getElementById('pitch');
const rollEl = document.getElementById('roll');
const yawEl = document.getElementById('yaw');

// Motor elements
const motor1Bar = document.getElementById('motor1-bar');
const motor2Bar = document.getElementById('motor2-bar');
const motor3Bar = document.getElementById('motor3-bar');
const motor4Bar = document.getElementById('motor4-bar');
const motor1Value = document.getElementById('motor1-value');
const motor2Value = document.getElementById('motor2-value');
const motor3Value = document.getElementById('motor3-value');
const motor4Value = document.getElementById('motor4-value');

// Drone state
const drone = {
    x: 0,
    y: 0,
    z: 0,
    pitch: 0,    // rotation around X axis (forward/backward tilt)
    roll: 0,     // rotation around Y axis (left/right tilt)
    yaw: 0,      // rotation around Z axis (spinning)
    velocityX: 0,
    velocityY: 0,
    velocityZ: 0,
    angularVelocityPitch: 0,
    angularVelocityRoll: 0,
    angularVelocityYaw: 0,
};

// Motor values - initialize to neutral (128 = 0 power in our -1 to 1 logic)
let motorValues = {
    motor1: 128,
    motor2: 128,
    motor3: 128,
    motor4: 128
};

// Physics constants
const GRAVITY = 9.81;
const MASS = 1.0; // kg
const DRAG_COEFFICIENT = 0.1;
const ANGULAR_DRAG = 0.15;

// Canvas setup
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Socket events
socket.on('connect', () => {
    console.log('Connected to server');
    statusEl.textContent = 'Connected';
    statusEl.classList.remove('disconnected');
    statusEl.classList.add('connected');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    statusEl.textContent = 'Disconnected';
    statusEl.classList.add('disconnected');
    statusEl.classList.remove('connected');
});

socket.on('motor-values', (data) => {
    // console.log('Received motor values:', data);
    motorValues = data;
    updateMotorDisplay();
});

// Update motor display
function updateMotorDisplay() {
    const motors = [
        { bar: motor1Bar, value: motor1Value, val: motorValues.motor1 },
        { bar: motor2Bar, value: motor2Value, val: motorValues.motor2 },
        { bar: motor3Bar, value: motor3Value, val: motorValues.motor3 },
        { bar: motor4Bar, value: motor4Value, val: motorValues.motor4 }
    ];

    motors.forEach(motor => {
        const percentage = (motor.val / 255) * 100;
        motor.bar.style.width = `${percentage}%`;
        motor.value.textContent = motor.val;
    });
}

// Physics simulation
function updatePhysics(deltaTime) {
    // Convert motor values (0-255) to thrust (normalized 0-1)
    const m1 = motorValues.motor1 / 255;
    const m2 = motorValues.motor2 / 255;
    const m3 = motorValues.motor3 / 255;
    const m4 = motorValues.motor4 / 255;

    // Calculate total thrust (upward force)
    const totalThrust = (m1 + m2 + m3 + m4) / 4;
    const thrustForce = totalThrust * 40; // Increased scale factor for better response

    // Calculate torques for rotation
    // Pitch: front motors vs back motors
    const pitchTorque = ((m2 + m3) - (m1 + m4)) * 0.5;

    // Roll: left motors vs right motors
    const rollTorque = ((m1 + m2) - (m3 + m4)) * 0.5;

    // Yaw: CW motors vs CCW motors (diagonal pairs)
    const yawTorque = ((m2 + m3) - (m1 + m4)) * 0.3;

    // Apply angular accelerations
    drone.angularVelocityPitch += pitchTorque * deltaTime * 2;
    drone.angularVelocityRoll += rollTorque * deltaTime * 2;
    drone.angularVelocityYaw += yawTorque * deltaTime * 2;

    // Apply angular drag
    drone.angularVelocityPitch *= (1 - ANGULAR_DRAG);
    drone.angularVelocityRoll *= (1 - ANGULAR_DRAG);
    drone.angularVelocityYaw *= (1 - ANGULAR_DRAG);

    // Update rotations
    drone.pitch += drone.angularVelocityPitch * deltaTime;
    drone.roll += drone.angularVelocityRoll * deltaTime;
    drone.yaw += drone.angularVelocityYaw * deltaTime;

    // Clamp pitch and roll to realistic values
    drone.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, drone.pitch));
    drone.roll = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, drone.roll));

    // Calculate acceleration from thrust
    const netForceZ = thrustForce - GRAVITY;
    const accelerationZ = netForceZ / MASS;

    // Apply tilt to create horizontal movement
    const accelerationX = Math.sin(drone.roll) * thrustForce * 0.5;
    const accelerationY = -Math.sin(drone.pitch) * thrustForce * 0.5;

    // Update velocities
    drone.velocityX += accelerationX * deltaTime;
    drone.velocityY += accelerationY * deltaTime;
    drone.velocityZ += accelerationZ * deltaTime;

    // Apply drag
    drone.velocityX *= (1 - DRAG_COEFFICIENT * deltaTime);
    drone.velocityY *= (1 - DRAG_COEFFICIENT * deltaTime);
    drone.velocityZ *= (1 - DRAG_COEFFICIENT * deltaTime);

    // Update positions
    drone.x += drone.velocityX * deltaTime;
    drone.y += drone.velocityY * deltaTime;
    drone.z += drone.velocityZ * deltaTime;

    // Ground collision
    if (drone.z < 0) {
        drone.z = 0;
        drone.velocityZ = 0;
        // Dampen horizontal velocities on ground impact
        drone.velocityX *= 0.8;
        drone.velocityY *= 0.8;
    }

    // Update telemetry display
    updateTelemetry();
}

// Update telemetry display
function updateTelemetry() {
    altitudeEl.textContent = `${drone.z.toFixed(2)} m`;

    const speed = Math.sqrt(
        drone.velocityX ** 2 +
        drone.velocityY ** 2 +
        drone.velocityZ ** 2
    );
    speedEl.textContent = `${speed.toFixed(2)} m/s`;

    pitchEl.textContent = `${(drone.pitch * 180 / Math.PI).toFixed(1)}°`;
    rollEl.textContent = `${(drone.roll * 180 / Math.PI).toFixed(1)}°`;
    yawEl.textContent = `${(drone.yaw * 180 / Math.PI).toFixed(1)}°`;
}

// Draw 3D drone
function drawDrone() {
    const logicWidth = canvas.clientWidth;
    const logicHeight = canvas.clientHeight;

    ctx.clearRect(0, 0, logicWidth, logicHeight);

    // Draw grid floor
    drawGrid();

    // Calculate screen position
    const centerX = logicWidth / 2;
    const centerY = logicHeight / 2;

    // Perspective projection
    const scale = 100 / (1 + drone.z * 0.1);

    // Position - include z in Y coordinate to make it look like it's lift off
    const screenX = centerX + drone.x * scale;
    const screenY = centerY + (drone.y * scale) - (drone.z * 10); // Minus z to move UP on screen

    // Draw drone shadow on the ground
    drawShadow(centerX + drone.x * 50, logicHeight - 100);

    // Save context
    ctx.save();
    ctx.translate(screenX, screenY);

    // Apply 3D rotation (simplified isometric view)
    const rotationScale = 1 + drone.z * 0.02;
    ctx.scale(rotationScale, rotationScale);

    // Draw drone body
    drawDroneBody();

    ctx.restore();
}

// Draw grid floor
function drawGrid() {
    const logicWidth = canvas.clientWidth;
    const logicHeight = canvas.clientHeight;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    const gridSize = 50;
    const gridCount = 20;

    for (let i = -gridCount; i <= gridCount; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(logicWidth / 2 + i * gridSize, 0);
        ctx.lineTo(logicWidth / 2 + i * gridSize, logicHeight);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, logicHeight / 2 + i * gridSize);
        ctx.lineTo(logicWidth, logicHeight / 2 + i * gridSize);
        ctx.stroke();
    }
}

// Draw shadow
function drawShadow(x, y) {
    const shadowSize = 40 + drone.z * 2;
    const shadowOpacity = Math.max(0, 0.3 - drone.z * 0.02);

    ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
    ctx.beginPath();
    ctx.ellipse(x, y, shadowSize, shadowSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
}

// Draw drone body
function drawDroneBody() {
    const armLength = 40;
    const motorSize = 8;
    const bodySize = 15;

    // Apply rotation
    ctx.rotate(drone.yaw);

    // Draw arms
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 4;

    // Arm 1 (Front Right)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(armLength * Math.cos(-Math.PI / 4), armLength * Math.sin(-Math.PI / 4));
    ctx.stroke();

    // Arm 2 (Rear Right)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(armLength * Math.cos(Math.PI / 4), armLength * Math.sin(Math.PI / 4));
    ctx.stroke();

    // Arm 3 (Rear Left)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(armLength * Math.cos(3 * Math.PI / 4), armLength * Math.sin(3 * Math.PI / 4));
    ctx.stroke();

    // Arm 4 (Front Left)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(armLength * Math.cos(-3 * Math.PI / 4), armLength * Math.sin(-3 * Math.PI / 4));
    ctx.stroke();

    // Draw motors with spinning effect
    const motorPositions = [
        { angle: -Math.PI / 4, motor: motorValues.motor1 },
        { angle: Math.PI / 4, motor: motorValues.motor2 },
        { angle: 3 * Math.PI / 4, motor: motorValues.motor3 },
        { angle: -3 * Math.PI / 4, motor: motorValues.motor4 }
    ];

    motorPositions.forEach(pos => {
        const mx = armLength * Math.cos(pos.angle);
        const my = armLength * Math.sin(pos.angle);

        // Motor glow based on power
        const glowIntensity = pos.motor / 255;
        ctx.shadowBlur = 15 * glowIntensity;
        ctx.shadowColor = '#2ecc71';

        ctx.fillStyle = `rgba(46, 204, 113, ${0.3 + glowIntensity * 0.7})`;
        ctx.beginPath();
        ctx.arc(mx, my, motorSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    });

    // Draw center body
    ctx.fillStyle = '#2980b9';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bodySize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw front indicator
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(0, -bodySize + 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw pitch/roll indicators
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    // Pitch line
    ctx.save();
    ctx.rotate(drone.pitch * 0.5);
    ctx.beginPath();
    ctx.moveTo(-bodySize - 5, 0);
    ctx.lineTo(bodySize + 5, 0);
    ctx.stroke();
    ctx.restore();

    // Roll line
    ctx.save();
    ctx.rotate(drone.roll * 0.5 + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-bodySize - 5, 0);
    ctx.lineTo(bodySize + 5, 0);
    ctx.stroke();
    ctx.restore();
}

// Animation loop
let lastTime = performance.now();

function animate() {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 100ms
    lastTime = currentTime;

    updatePhysics(deltaTime);
    drawDrone();

    requestAnimationFrame(animate);
}

// Start animation
animate();

console.log('Drone simulator initialized');
