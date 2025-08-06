import express from 'express';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import GeminiCaller from './gemini_caller.mjs';
import { createClient } from '@supabase/supabase-js';
import { getLocations } from './supabase.mjs';
import { sessionManager } from './tour-sessions.js';
import { URL } from 'url';

const app = express();
const port = 3000;

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

const server = app.listen(port, () => {
    console.log(`Express is listening at http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');

    if (!token) {
        ws.close(1008, 'Token required');
        return;
    }

    jwt.verify(token, process.env.SUPABASE_JWT_SECRET, (err, decoded) => {
        if (err) {
            ws.close(1008, 'Invalid token');
            return;
        }
        
        ws.user = decoded;
        sessionManager(ws, supabase, tourSessions);
    });
});
