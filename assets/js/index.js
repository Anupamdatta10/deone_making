const socket = io({
    reconnection: true,         // Enable reconnection
    reconnectionAttempts: 10,   // Try to reconnect 10 times
    reconnectionDelay: 1000,    // Wait 1s between attempts
});

const statusEl = document.getElementById('status');
const logWindow = document.getElementById('log-window');

let heartbeatInterval;
let lastHeartbeat = 0;

function logToScreen(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    logWindow.appendChild(entry);
    logWindow.scrollTop = logWindow.scrollHeight; // Auto-scroll
}

function startHeartbeat() {
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
        const start = Date.now();
        socket.emit('heartbeat', start);
    }, 2000);
}

socket.on('connect', () => {
    logToScreen('Socket connected successfully', 'success');
    statusEl.textContent = 'Connected';
    statusEl.classList.remove('disconnected');
    statusEl.classList.add('connected');

    // Start sending heartbeats
    startHeartbeat();
});

socket.on('heartbeat-ack', (data) => {
    const latency = Date.now() - (data.clientTime || lastHeartbeat);
    lastHeartbeat = Date.now(); // Reset
});

socket.on('disconnect', (reason) => {
    clearInterval(heartbeatInterval);
    logToScreen(`Socket disconnected: ${reason}`, 'error');
    statusEl.textContent = 'Disconnected';
    statusEl.classList.add('disconnected');
    statusEl.classList.remove('connected');

    if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        socket.connect();
    }
});

socket.on('reconnect_attempt', (val) => {
    logToScreen(`Attempting to reconnect... (${val})`, 'warn');
    statusEl.textContent = `Reconnecting... (Attempt ${val})`;
});

socket.on('reconnect', (attemptNumber) => {
    logToScreen(`Reconnected successfully after ${attemptNumber} attempts`, 'success');
});

socket.on('reconnect_error', (error) => {
    logToScreen(`Reconnection failed: ${error.message}`, 'error');
});

// Motor values display
socket.on('motor-values', (data) => {
    const msg = `M1:${data.motor1} M2:${data.motor2} M3:${data.motor3} M4:${data.motor4}`;
    logToScreen(msg, 'info');
});

// Initial log
logToScreen('Client initialized, waiting for connection...', 'system');


// Joystick Logic
class Joystick {
    constructor(containerId, label, onMove) {
        this.container = document.getElementById(containerId);
        this.stick = this.container.querySelector('.stick');
        this.label = label;
        this.onMove = onMove;

        // State
        this.active = false;
        this.center = { x: 0, y: 0 };
        this.touchId = null; // Track which touch belongs to this joystick
        // Dimensions initialized in updateDimensions()

        // Bind events (Mouse)
        this.container.addEventListener('mousedown', this.handleStart.bind(this));
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));

        // Bind events (Touch) - use passive: false to allow preventDefault
        this.container.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleEnd.bind(this));
        document.addEventListener('touchcancel', this.handleEnd.bind(this));

        // Throttle log
        this.lastLog = 0;

        this.updateDimensions();
    }

    updateDimensions() {
        this.radius = this.container.offsetWidth / 2;
        this.stickRadius = this.stick.offsetWidth / 2;
        // Reduce padding to 0 or small value if user wants it to touch. 
        // Keeping small buffer or removing it based on request "touching the outer boundary"
        this.maxDistance = this.radius - this.stickRadius;
    }

    handleStart(e) {
        // For touch events, only respond if we don't already have an active touch
        if (e.type === 'touchstart') {
            if (this.touchId !== null) return; // Already tracking a touch
            e.preventDefault(); // Prevent scrolling
            this.touchId = e.changedTouches[0].identifier;
        }

        this.active = true;
        this.updateDimensions();

        // Recalculate center on start (handles resizing)
        const rect = this.container.getBoundingClientRect();
        this.center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };

        this.stick.style.transition = 'none'; // Instant movement
        this.handleMove(e);
    }

    handleMove(e) {
        if (!this.active) return;

        let clientX, clientY;

        if (e.type.startsWith('touch')) {
            // For touch events, find the touch that belongs to this joystick
            if (this.touchId === null) return;

            let targetTouch = null;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.touchId) {
                    targetTouch = e.touches[i];
                    break;
                }
            }

            if (!targetTouch) return; // Our touch is not in the current touches

            e.preventDefault(); // Prevent scrolling
            clientX = targetTouch.clientX;
            clientY = targetTouch.clientY;
        } else {
            // Mouse event
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const dx = clientX - this.center.x;
        const dy = clientY - this.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let x = dx;
        let y = dy;

        // Clamp to max distance
        if (distance > this.maxDistance) {
            const ratio = this.maxDistance / distance;
            x = dx * ratio;
            y = dy * ratio;
        }

        // Apply movement - combine centering transform with offset
        this.stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

        // Normalize output (-1.0 to 1.0)
        // Invert Y so up is positive (standard convention for drones usually, but let's keep screen coords for now: up is negative)
        // Usually: Up (-1), Down (1), Left (-1), Right (1)
        const normalizedX = Math.max(-1, Math.min(1, (x / this.maxDistance))).toFixed(2);
        const normalizedY = Math.max(-1, Math.min(1, (y / this.maxDistance))).toFixed(2);

        this.onMove({ x: normalizedX, y: normalizedY });
    }

    handleEnd(e) {
        if (!this.active) return;

        // For touch events, only respond if it's our touch that ended
        if (e.type.startsWith('touch')) {
            let ourTouchEnded = false;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchId) {
                    ourTouchEnded = true;
                    break;
                }
            }
            if (!ourTouchEnded) return;
            this.touchId = null; // Clear the touch ID
        }

        this.active = false;

        // Reset to center
        this.stick.style.transition = 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // Bouncy reset
        this.stick.style.transform = `translate(-50%, -50%)`;

        this.onMove({ x: 0, y: 0 });
    }
}

// Initialize Joysticks
setTimeout(() => {
    const leftStick = new Joystick('joystick-left', 'Left', (data) => {
        socket.emit('control', { type: 'left', ...data });
    });

    const rightStick = new Joystick('joystick-right', 'Right', (data) => {
        socket.emit('control', { type: 'right', ...data });
    });

    logToScreen('Joysticks initialized and ready', 'system');
}, 500); // Small delay to ensure layout is computed

// Fullscreen Logic
const fullscreenBtn = document.getElementById('fullscreen-btn');
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            logToScreen(`Error checking fullscreen: ${err.message}`, 'error');
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
});

// Rotate Button Logic (Portrait Mode)
const rotateBtn = document.getElementById('rotate-btn');
if (rotateBtn) {
    rotateBtn.addEventListener('click', async () => {
        try {
            // First, request fullscreen (required for orientation lock on most browsers)
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }

            // Then try to lock the orientation to landscape
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape').catch(err => {
                    console.log('Orientation lock not supported or failed:', err);
                    // Fallback: just show a message
                    alert('Please manually rotate your device to landscape mode.');
                });
            } else {
                // Screen Orientation API not supported
                alert('Please manually rotate your device to landscape mode.');
            }
        } catch (err) {
            console.error('Error entering fullscreen/landscape:', err);
            alert('Please manually rotate your device to landscape mode and enable fullscreen.');
        }
    });
}

