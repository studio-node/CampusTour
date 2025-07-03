import express from 'express';
import GeminiCaller from './gemini_caller.js';
import { supabaseUrl, supabaseAnonKey } from './secrets.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getLocations } from './supabase.js';

// const app = express();
// const port = 3000;

// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });

// app.listen(port, () => {
//     return console.log(`Express is listening at http://localhost:${port}`);
// });





async function main() {

    const supabase = createClient(supabaseUrl, supabaseAnonKey);


    const locations = await getLocations("e5a9dfd2-0c88-419e-b891-0a62283b8abd", supabase);

    const interests = ["Arts", "Student Life", "Sports", "Clubs", "Academic", "Campus Activities"];


    const tour = await GeminiCaller.generateTour(locations, interests);
    console.log("tour:", tour);
}


main();
