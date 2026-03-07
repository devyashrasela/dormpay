const { ChatHistory, User } = require('../models');
const { buildUserContext } = require('../utils/contextBuilder');
const crypto = require('crypto');

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

        const { message, session_id } = req.body;
        if (!message) return res.status(400).json({ error: 'message is required' });

        // Use provided session_id or generate a new one
        const sessionId = session_id || crypto.randomUUID();

        // Save user message
        await ChatHistory.create({
            user_id: user.id,
            role: 'user',
            message,
            session_id: sessionId,
        });

        // Build context (with safety)
        let userContext = '';
        try {
            userContext = await buildUserContext(req.userSub);
        } catch (ctxErr) {
            console.error('Context build error:', ctxErr.message);
            userContext = 'Could not load user data.';
        }

        // Get chat history for THIS session only
        const sessionHistory = await ChatHistory.findAll({
            where: { user_id: user.id, session_id: sessionId },
            order: [['created_at', 'ASC']],
        });

        // Build conversation history — Gemini requires alternating user/model roles
        const rawHistory = sessionHistory.map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            text: h.message,
        }));

        // Deduplicate consecutive same-role messages
        const cleanHistory = [];
        for (const entry of rawHistory) {
            if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === entry.role) {
                cleanHistory[cleanHistory.length - 1].text += '\n' + entry.text;
            } else {
                cleanHistory.push({ ...entry });
            }
        }

        // Convert to Gemini format and exclude the last user message
        const geminiHistory = cleanHistory.slice(0, -1).map((h) => ({
            role: h.role,
            parts: [{ text: h.text }],
        }));

        // Ensure history starts with 'user' role
        while (geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
            geminiHistory.shift();
        }

        // Call Gemini API
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            systemInstruction: `${SYSTEM_PROMPT}\n\n--- User's Current Data ---\n${userContext}`,
        });

        let aiResponse;
        try {
            const chat = model.startChat({ history: geminiHistory });
            const result = await chat.sendMessage(message);
            aiResponse = result.response.text();
        } catch (chatErr) {
            console.error('Gemini startChat failed:', chatErr.message);
            try {
                const fullPrompt = `${SYSTEM_PROMPT}\n\n--- User's Current Data ---\n${userContext}\n\nUser message: ${message}`;
                const result = await model.generateContent(fullPrompt);
                aiResponse = result.response.text();
            } catch (genErr) {
                console.error('Gemini generateContent also failed:', genErr.message);
                aiResponse = "I'm having trouble connecting to the AI service right now. Please try again in a moment.";
            }
        }

        // Save AI response
        await ChatHistory.create({
            user_id: user.id,
            role: 'assistant',
            message: aiResponse,
            session_id: sessionId,
        });

        res.json({ response: aiResponse, session_id: sessionId });
    } catch (error) {
        console.error('sendMessage error:', error.message || error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
};

// GET /api/chat/history?session_id=xxx
const getChatHistory = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { session_id, limit = 50 } = req.query;
        const where = { user_id: user.id };
        if (session_id) where.session_id = session_id;

        const history = await ChatHistory.findAll({
            where,
            order: [['created_at', 'ASC']],
            limit: parseInt(limit),
        });

        res.json({ history });
    } catch (error) {
        console.error('getChatHistory error:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
};

// GET /api/chat/sessions — List past chat sessions
const getSessions = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Get all sessions with their first user message as preview
        const { sequelize } = require('../models');
        const [sessions] = await sequelize.query(`
            SELECT 
                ch.session_id,
                MIN(CASE WHEN ch.role = 'user' THEN ch.message END) AS preview,
                MIN(ch.created_at) AS started_at,
                COUNT(*) AS message_count
            FROM chat_histories ch
            WHERE ch.user_id = :userId AND ch.session_id IS NOT NULL
            GROUP BY ch.session_id
            ORDER BY started_at DESC
            LIMIT 20
        `, {
            replacements: { userId: user.id },
            type: sequelize.QueryTypes ? sequelize.QueryTypes.SELECT : undefined,
        });

        const formatted = (Array.isArray(sessions) ? sessions : []).map(s => ({
            session_id: s.session_id,
            preview: s.preview ? (s.preview.length > 60 ? s.preview.slice(0, 60) + '...' : s.preview) : 'Chat session',
            started_at: s.started_at,
            message_count: s.message_count,
        }));

        res.json({ sessions: formatted });
    } catch (error) {
        console.error('getSessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
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

module.exports = { sendMessage, getChatHistory, getSessions, clearChatHistory };
