const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws'); // for ESP32

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// WebSocket server for ESP32
const wss = new WebSocket.Server({ port: 8081 });

let espClient = null;

wss.on('connection', (ws) => {
    console.log("ESP32 connected");
    espClient = ws;

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        io.emit('motor-values', data); // send to browser
    });

    ws.on('close', () => {
        espClient = null;
        console.log("ESP32 disconnected");
    });
});

io.on('connection', (socket) => {
    console.log("Browser connected");

    socket.on('control', (data) => {
        if (espClient) {
            espClient.send(JSON.stringify(data));
        }
    });
});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});
