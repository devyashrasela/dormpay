const { VoiceProfile, User } = require('../models');
const { elevenlabs } = require('../config/elevenlabs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for voice uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'voice');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `voice_${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    },
});

// POST /api/voice/clone — Upload voice sample and create clone
const cloneVoice = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!req.file) return res.status(400).json({ error: 'Voice sample file is required' });

        // Check if user already has a voice profile
        const existing = await VoiceProfile.findOne({ where: { user_id: user.id } });
        if (existing) {
            return res.status(409).json({ error: 'Voice profile already exists. Delete it first to clone a new one.' });
        }

        // Send to ElevenLabs for cloning
        const voiceName = `campuswallet_${user.username}_${Date.now()}`;
        const fileBuffer = fs.readFileSync(req.file.path);

        const voice = await elevenlabs.voices.add({
            name: voiceName,
            files: [fileBuffer],
            description: `CampusWallet voice clone for @${user.username}`,
        });

        // Save profile
        const profile = await VoiceProfile.create({
            user_id: user.id,
            elevenlabs_voice_id: voice.voice_id,
            sample_url: `/uploads/voice/${req.file.filename}`,
            voice_on_send: true,
            voice_on_pay: true,
        });

        res.status(201).json({ message: 'Voice cloned successfully', profile });
    } catch (error) {
        console.error('cloneVoice error:', error);
        res.status(500).json({ error: 'Failed to clone voice' });
    }
};

// GET /api/voice/profile
const getVoiceProfile = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const profile = await VoiceProfile.findOne({ where: { user_id: user.id } });
        res.json({ profile: profile || null });
    } catch (error) {
        console.error('getVoiceProfile error:', error);
        res.status(500).json({ error: 'Failed to fetch voice profile' });
    }
};

// POST /api/voice/generate — Generate TTS audio
const generateTTS = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'text is required' });

        const profile = await VoiceProfile.findOne({ where: { user_id: user.id } });

        // Use cloned voice or default
        const voiceId = profile?.elevenlabs_voice_id || 'JBFqnCBsd6RMkjVDRZzb'; // Default: George

        const audio = await elevenlabs.textToSpeech.convert(voiceId, {
            text,
            model_id: 'eleven_multilingual_v2',
            output_format: 'mp3_44100_128',
        });

        // Stream audio response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'inline; filename="voice.mp3"');

        // Handle both ReadableStream and Buffer
        if (audio instanceof Buffer) {
            res.send(audio);
        } else if (audio && typeof audio.pipe === 'function') {
            audio.pipe(res);
        } else {
            // Convert async iterable to buffer
            const chunks = [];
            for await (const chunk of audio) {
                chunks.push(chunk);
            }
            res.send(Buffer.concat(chunks));
        }
    } catch (error) {
        console.error('generateTTS error:', error);
        res.status(500).json({ error: 'Failed to generate voice' });
    }
};

// DELETE /api/voice/profile
const deleteVoiceProfile = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const profile = await VoiceProfile.findOne({ where: { user_id: user.id } });
        if (!profile) return res.status(404).json({ error: 'No voice profile found' });

        // Delete from ElevenLabs
        try {
            await elevenlabs.voices.delete(profile.elevenlabs_voice_id);
        } catch (e) {
            console.warn('ElevenLabs voice deletion failed:', e.message);
        }

        // Delete local sample file
        if (profile.sample_url) {
            const filePath = path.join(__dirname, '..', '..', profile.sample_url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await profile.destroy();
        res.json({ message: 'Voice profile deleted' });
    } catch (error) {
        console.error('deleteVoiceProfile error:', error);
        res.status(500).json({ error: 'Failed to delete voice profile' });
    }
};

// PUT /api/voice/toggle
const toggleVoice = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const profile = await VoiceProfile.findOne({ where: { user_id: user.id } });
        if (!profile) return res.status(404).json({ error: 'No voice profile found' });

        const { voice_on_send, voice_on_pay } = req.body;

        await profile.update({
            voice_on_send: voice_on_send !== undefined ? voice_on_send : profile.voice_on_send,
            voice_on_pay: voice_on_pay !== undefined ? voice_on_pay : profile.voice_on_pay,
        });

        res.json({ message: 'Voice settings updated', profile });
    } catch (error) {
        console.error('toggleVoice error:', error);
        res.status(500).json({ error: 'Failed to update voice settings' });
    }
};

module.exports = { upload, cloneVoice, getVoiceProfile, generateTTS, deleteVoiceProfile, toggleVoice };
