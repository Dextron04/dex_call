import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let peers = new Map();

wss.on('connection', ws => {
    ws.on('message', msg => {
        const data = JSON.parse(msg);
        const { type, target, payload } = data;

        if (type === 'register') {
            peers.set(payload.id, ws);
            console.log(`Peer registered: ${payload.id}`);
        } else if (target && peers.has(target)) {
            peers.get(target).send(JSON.stringify({ type, payload, from: payload.id }));
        }
    });

    ws.on('close', () => {
        for (const [id, socket] of peers) if (socket === ws) {
            peers.delete(id);
            console.log(`Peer disconnected: ${id}`);
            break;
        }
    });
});

server.listen(8080, () => {
    console.log('Signaling server is running on ws://localhost:8080');
});