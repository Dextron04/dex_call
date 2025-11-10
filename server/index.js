import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let peers = new Map();
let activeCalls = new Map(); // Track active calls: callId -> { caller, callee, startTime }

// Path to call records file
const CALL_RECORDS_PATH = path.join(__dirname, 'call-records.json');

// Load existing call records or create empty array
function loadCallRecords() {
    try {
        if (fs.existsSync(CALL_RECORDS_PATH)) {
            const data = fs.readFileSync(CALL_RECORDS_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading call records:', error);
    }
    return [];
}

// Save call records to file
function saveCallRecords(records) {
    try {
        fs.writeFileSync(CALL_RECORDS_PATH, JSON.stringify(records, null, 2), 'utf8');
        console.log('Call records saved');
    } catch (error) {
        console.error('Error saving call records:', error);
    }
}

// Add a new call record
function addCallRecord(caller, callee, duration) {
    const records = loadCallRecords();
    const record = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        caller,
        callee,
        startTime: new Date().toISOString(),
        duration, // in seconds
        endTime: new Date(Date.now() + duration * 1000).toISOString()
    };
    records.push(record);
    saveCallRecords(records);
    console.log(`Call record saved: ${caller} <-> ${callee}, duration: ${duration}s`);
}

wss.on('connection', ws => {
    ws.on('message', msg => {
        const data = JSON.parse(msg);
        const { type, target, payload, id } = data;

        if (type === 'register') {
            peers.set(payload.id, ws);
            console.log(`Peer registered: ${payload.id}`);
        } else if (type === 'offer') {
            // Track call start
            const callId = `${id}-${target}`;
            activeCalls.set(callId, {
                caller: id,
                callee: target,
                startTime: Date.now()
            });
            console.log(`Call started: ${id} -> ${target}`);

            if (target && peers.has(target)) {
                peers.get(target).send(JSON.stringify({ type, payload, from: id }));
            }
        } else if (type === 'end-call') {
            // Track call end and save record
            const callId1 = `${id}-${target}`;
            const callId2 = `${target}-${id}`;

            const callData = activeCalls.get(callId1) || activeCalls.get(callId2);

            if (callData) {
                const duration = Math.floor((Date.now() - callData.startTime) / 1000);
                addCallRecord(callData.caller, callData.callee, duration);
                activeCalls.delete(callId1);
                activeCalls.delete(callId2);
            }

            if (target && peers.has(target)) {
                peers.get(target).send(JSON.stringify({ type, payload, from: id }));
            }
        } else if (target && peers.has(target)) {
            // Forward the message with the sender's ID
            peers.get(target).send(JSON.stringify({ type, payload, from: id }));
        }
    });

    ws.on('close', () => {
        for (const [id, socket] of peers) if (socket === ws) {
            // Clean up any active calls for this peer
            for (const [callId, callData] of activeCalls.entries()) {
                if (callData.caller === id || callData.callee === id) {
                    const duration = Math.floor((Date.now() - callData.startTime) / 1000);
                    addCallRecord(callData.caller, callData.callee, duration);
                    activeCalls.delete(callId);
                }
            }

            peers.delete(id);
            console.log(`Peer disconnected: ${id}`);
            break;
        }
    });
});

server.listen(8080, () => {
    console.log('Signaling server is running on ws://localhost:8080');
});