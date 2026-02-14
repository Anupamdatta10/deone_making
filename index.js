const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const WebSocket = require('ws');   // FIXED

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    pingInterval: 2500,
    pingTimeout: 5000
});

// ---------- STATIC FILES ----------
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'controller.html'));
});

app.get('/simulator', (req, res) => {
    res.sendFile(path.join(__dirname, 'simulator.html'));
});

// ---------- JOYSTICK STATE ----------
let leftStick = { x: 0, y: 0 };
let rightStick = { x: 0, y: 0 };

function calculateMotorValues(left, right) {

    const throttle = -left.y;
    const yaw = left.x;
    const pitch = -right.y;
    const roll = right.x;

    let motor1 = throttle - pitch + roll - yaw;
    let motor2 = throttle + pitch + roll + yaw;
    let motor3 = throttle + pitch - roll - yaw;
    let motor4 = throttle - pitch - roll + yaw;

    motor1 = Math.max(-1, Math.min(1, motor1));
    motor2 = Math.max(-1, Math.min(1, motor2));
    motor3 = Math.max(-1, Math.min(1, motor3));
    motor4 = Math.max(-1, Math.min(1, motor4));

    return {
        motor1: Math.round((motor1 + 1) * 127.5),
        motor2: Math.round((motor2 + 1) * 127.5),
        motor3: Math.round((motor3 + 1) * 127.5),
        motor4: Math.round((motor4 + 1) * 127.5)
    };
}

// ---------- SOCKET.IO (BROWSER) ----------
io.on('connection', (socket) => {

    console.log('Browser connected');

    socket.emit('motor-values', calculateMotorValues(leftStick, rightStick));

    socket.on('heartbeat', (clientTime) => {
        socket.emit('heartbeat-ack', {
            serverTime: Date.now(),
            clientTime: clientTime
        });
    });

    socket.on('control', (data) => {

        if (data.type === 'left') {
            leftStick = { x: parseFloat(data.x), y: parseFloat(data.y) };
        } else if (data.type === 'right') {
            rightStick = { x: parseFloat(data.x), y: parseFloat(data.y) };
        }

        const motorValues = calculateMotorValues(leftStick, rightStick);

        // Send to browser
        io.emit('motor-values', motorValues);

        // Send to ESP32
        if (espClient && espClient.readyState === WebSocket.OPEN) {
            espClient.send(JSON.stringify(motorValues));
        }
    });

    socket.on('disconnect', () => {
        console.log('Browser disconnected');
    });
});

// ---------- RAW WEBSOCKET (ESP32) ----------
const wss = new WebSocket.Server({ port: 8081 });

let espClient = null;

wss.on('connection', (ws) => {

    console.log("ESP32 connected");
    espClient = ws;

    ws.on('close', () => {
        console.log("ESP32 disconnected");
        espClient = null;
    });

    ws.on('message', (msg) => {
        console.log("From ESP32:", msg.toString());
    });
});

// ---------- START SERVER ----------
const os = require('os');
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {

    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIp = iface.address;
                break;
            }
        }
    }

    console.log(`Server running!`);
    console.log(`Browser:  http://${localIp}:${PORT}`);
    console.log(`ESP32 WS: ws://${localIp}:8081`);
});

