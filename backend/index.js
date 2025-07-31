import express from 'express';
import { WebSocketServer } from 'ws';
import GeminiCaller from './gemini_caller.mjs';
import { createClient } from '@supabase/supabase-js';
import { getLocations } from './supabase.mjs';
import { sessionManager } from './tour-sessions.js';

const app = express();
const port = 3000;

const supabase = createClient(process.env.supabaseUrl, process.env.supabaseAnonKey);

// In-memory store for tour sessions
// Map<tourId, { ambassador: WebSocket, members: Set<WebSocket> }>
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

    console.log("req.body:", req.body);
    if (!req.body) {
        res.status(400).send("No body provided");
        return;
    }

    const schoolId = req.body.school_id;
    const interests =  req.body.interests;

    const locations = await getLocations(schoolId, supabase);
    const locsArray = makeLocationsArrayTourGeneration(locations);

    const tour = await GeminiCaller.generateTour(locsArray, interests);
    console.log("tour:", tour);

    res.json(tour);
});

const server = app.listen(port, () => {
    console.log(`Express is listening at http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', ws =>  sessionManager(ws, tourSessions));
