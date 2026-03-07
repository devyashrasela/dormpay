const { ElevenLabsClient } = require('elevenlabs');

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

module.exports = { elevenlabs };
