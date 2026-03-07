const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getGeminiModel = (modelName = 'gemini-3-flash-preview') => {
    return genAI.getGenerativeModel({ model: modelName });
};

module.exports = { genAI, getGeminiModel };
