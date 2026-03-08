const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const { upload, cloneVoice, getVoiceProfiles, generateTTS, deleteVoiceProfile, toggleVoice } = require('../controllers/voice.controller');

router.use(checkJwt, extractUser);

router.post('/clone', upload.single('voice_sample'), cloneVoice);
router.get('/profiles', getVoiceProfiles);
router.post('/generate', generateTTS);
router.delete('/profile/:id', deleteVoiceProfile);
router.put('/toggle/:id', toggleVoice);

module.exports = router;
