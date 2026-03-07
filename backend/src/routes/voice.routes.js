const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const { upload, cloneVoice, getVoiceProfile, generateTTS, deleteVoiceProfile, toggleVoice } = require('../controllers/voice.controller');

router.use(checkJwt, extractUser);

router.post('/clone', upload.single('voice_sample'), cloneVoice);
router.get('/profile', getVoiceProfile);
router.post('/generate', generateTTS);
router.delete('/profile', deleteVoiceProfile);
router.put('/toggle', toggleVoice);

module.exports = router;
