const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const { sendMessage, getChatHistory, getSessions, clearChatHistory } = require('../controllers/chat.controller');

router.use(checkJwt, extractUser);

router.post('/', sendMessage);
router.get('/history', getChatHistory);
router.get('/sessions', getSessions);
router.delete('/history', clearChatHistory);

module.exports = router;
