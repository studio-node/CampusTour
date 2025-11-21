import express from 'express';
import { WebSocketServer } from 'ws';
import GeminiCaller from './gemini_caller.mjs';
import { createClient } from '@supabase/supabase-js';
import { getLocations } from './supabase.mjs';
import { sessionManager } from './tour-sessions.js';

const app = express();
const port = process.env.PORT || 3000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
  console.log(`Express is listening and running now on port ${port}`);
});


const wss = new WebSocketServer({ server });

// Pass the Supabase client into the session manager so handlers can auth and persist
wss.on('connection', ws => sessionManager(ws, supabase, tourSessions));


