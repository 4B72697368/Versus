const express = require('express');
const Groq = require('groq-sdk');
const path = require('path');
const serveFavicon = require('serve-favicon');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(serveFavicon(path.join(__dirname, 'favicon.png')));

const groq = new Groq({
    apiKey: process.env.GROQAPIKEY
});

const speeches = [
    "Affirmative Constructive",
    "Cross-Ex, Negative asks questions to Affirmative",
    "Cross-Ex, Affirmative answers questions to Negative",
    "Negative Constructive",
    "Cross-Ex, Affirmative asks questions to Negative",
    "Cross-Ex, Negative answers questions to Affirmative",
    "Affirmative First Rebuttal",
    "Negative Rebuttal",
    "Affirmative Second Rebuttal"
];

let debateHistory = [];

async function turn(topic, side, speech, context=debateHistory) {
    let completion = await groq.chat.completions.create({
        messages: [
            { role: "system", content: `You are participating in a formal academic debate about "${topic}". As a ${side} debater, engage with the topic professionally.` },
            ...context,
            { role: "user", content: `You are arguing for the ${side}, it is the ${speech}` }
        ],
        model: "mixtral-8x7b-32768",
        temperature: 0.7,
        max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content;
}

app.post('/api/start', async (req, res) => {
    try {
        debateHistory = [];
        res.json({ status: 'started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/next', async (req, res) => {
    try {
        const { topic, currentRound } = req.body;

        if (currentRound >= speeches.length) {
            return res.json({ finished: true });
        }

        const side = currentRound % 2 === 0 ? "AFF" : "NEG";
        const speech = speeches[currentRound];
        
        const response = await turn(topic, side, speech);
        debateHistory.push({ role: "user", content: `${side} Says: ${response}` });
        
        res.json({
            speech: response,
            side,
            roundType: speech
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.use('/favicon.png', express.static(path.join(__dirname, 'favicon.png')));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});