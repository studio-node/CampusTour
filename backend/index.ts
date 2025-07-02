import express from 'express';
import GeminiCaller from './gemini_caller.js';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, async () => {

    const locations = `
    `

    const interests = `
    `

    const tour = await GeminiCaller.generateTour(locations, interests);

    return console.log(`Express is listening at http://localhost:${port}`);
});