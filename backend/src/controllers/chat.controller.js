const { ChatHistory, User } = require('../models');
const { getGeminiModel } = require('../config/gemini');
const { buildUserContext } = require('../utils/contextBuilder');

const SYSTEM_PROMPT = `You are CampusWallet AI, a friendly and helpful financial assistant for a student campus payment app built on Algorand blockchain.

Your capabilities:
- Analyze the user's transaction history and spending patterns
- Answer questions about their wallet balance and activity
- Help with split bill calculations
- Provide insights about their financial behavior
- Suggest optimizations for their spending

Rules:
- Be concise and friendly, use emojis sparingly
- Always base your analysis on the actual user data provided in the context
- If you don't have data to answer, say so honestly
- Currency is ALGO (Algorand cryptocurrency)
- Never make up transaction data
- Format numbers clearly and use proper currency notation`;

// POST /api/chat — Send message to Gemini
const sendMessage = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'message is required' });

        // Save user message
        await ChatHistory.create({
            user_id: user.id,
            role: 'user',
            message,
        });

        // Build context
        const userContext = await buildUserContext(req.userSub);

        // Get recent chat history for conversation continuity
        const recentHistory = await ChatHistory.findAll({
            where: { user_id: user.id },
            order: [['created_at', 'DESC']],
            limit: 20,
        });

        const conversationHistory = recentHistory.reverse().map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.message }],
        }));

        // Build the full prompt
        const model = getGeminiModel();
        const chat = model.startChat({
            history: conversationHistory.slice(0, -1), // exclude last (current) message
            systemInstruction: `${SYSTEM_PROMPT}\n\n--- User's Current Data ---\n${userContext}`,
        });

        const result = await chat.sendMessage(message);
        const aiResponse = result.response.text();

        // Save AI response
        await ChatHistory.create({
            user_id: user.id,
            role: 'assistant',
            message: aiResponse,
        });

        res.json({ response: aiResponse });
    } catch (error) {
        console.error('sendMessage error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
};

// GET /api/chat/history
const getChatHistory = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { limit = 50 } = req.query;

        const history = await ChatHistory.findAll({
            where: { user_id: user.id },
            order: [['created_at', 'ASC']],
            limit: parseInt(limit),
        });

        res.json({ history });
    } catch (error) {
        console.error('getChatHistory error:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
};

// DELETE /api/chat/history
const clearChatHistory = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        await ChatHistory.destroy({ where: { user_id: user.id } });
        res.json({ message: 'Chat history cleared' });
    } catch (error) {
        console.error('clearChatHistory error:', error);
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
};

module.exports = { sendMessage, getChatHistory, clearChatHistory };
