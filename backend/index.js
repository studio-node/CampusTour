import express from 'express';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import GeminiCaller from './gemini_caller.mjs';
import { createClient } from '@supabase/supabase-js';
import { getLocations } from './supabase.mjs';
import { sessionManager } from './tour-sessions.js';
import { URL } from 'url';
import http from 'http';

const app = express();
const port = process.env.PORT || 3000;

const supabase = createClient(process.env.supabaseUrl, process.env.supabaseAnonKey);

const tourSessions = new Map();

function makeLocationsArrayTourGeneration(locations) {
    let locationObjects = [];
    for (let location of locations) {
        locationObjects.push({
            id: location.id,
            name: location.name,
            description: location.description,
            interests: location.interests,
        });
    }
    return locationObjects;
}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/keep-alive', (req, res) => {
    res.send('ok');
});

app.post('/generate-tour', express.json(), async (req, res) => {
    if (!req.body) {
        return res.status(400).send("No body provided");
    }
    const { school_id, interests } = req.body;
    const locations = await getLocations(school_id, supabase);
    const locsArray = makeLocationsArrayTourGeneration(locations);
    const tour = await GeminiCaller.generateTour(locsArray, interests);
    res.json(tour);
});

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const token = new URL(request.url, `http://${request.headers.host}`).searchParams.get('token');

    if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }

    jwt.verify(token, process.env.SUPABASE_JWT_SECRET, (err, decoded) => {
        if (err) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            ws.user = decoded;
            wss.emit('connection', ws, request);
        });
    });
});

wss.on('connection', (ws, req) => {
    sessionManager(ws, supabase, tourSessions);
});

server.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
