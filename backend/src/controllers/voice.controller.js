const { VoiceProfile, User } = require('../models');
const { elevenlabs } = require('../config/elevenlabs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for voice uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.VERCEL
            ? '/tmp/uploads/voice'
            : path.join(__dirname, '..', '..', 'uploads', 'voice');
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

        const voiceName = req.body.voice_name || `Voice ${Date.now()}`;

        // Send to ElevenLabs for cloning
        const elName = `campuswallet_${user.username}_${Date.now()}`;
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype || 'audio/mpeg' });
        fileBlob.name = req.file.originalname || 'voice_sample.mp3';

        const voice = await elevenlabs.voices.add({
            name: elName,
            files: [fileBlob],
            description: `CampusWallet voice clone "${voiceName}" for @${user.username}`,
        });

        // Save profile
        const profile = await VoiceProfile.create({
            user_id: user.id,
            voice_name: voiceName,
            elevenlabs_voice_id: voice.voice_id,
            sample_url: `/uploads/voice/${req.file.filename}`,
            use_for_outgoing: false,
            use_for_incoming: false,
            is_active: true,
        });

        res.status(201).json({ message: 'Voice cloned successfully', profile });
    } catch (error) {
        console.error('cloneVoice error:', error);
        const detail = error.body?.detail || error.message || 'Failed to clone voice';
        res.status(500).json({ error: 'Failed to clone voice', detail });
    }
};

// GET /api/voice/profiles — Get all voice profiles for the user
const getVoiceProfiles = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const profiles = await VoiceProfile.findAll({
            where: { user_id: user.id },
            order: [['created_at', 'DESC']],
        });
        res.json({ profiles });
    } catch (error) {
        console.error('getVoiceProfiles error:', error);
        res.status(500).json({ error: 'Failed to fetch voice profiles' });
    }
};

// POST /api/voice/generate — Generate TTS audio
const generateTTS = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { text, voice_id, direction } = req.body;
        // direction: 'outgoing' | 'incoming' | undefined

        let voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // Default: George
        let ttsText = text || 'Payment processed';

        if (voice_id) {
            // Use specific voice by profile ID (for test button)
            const profile = await VoiceProfile.findOne({ where: { id: voice_id, user_id: user.id } });
            if (profile) voiceId = profile.elevenlabs_voice_id;
        } else if (direction === 'incoming') {
            // Find voice set for incoming
            const profile = await VoiceProfile.findOne({
                where: { user_id: user.id, use_for_incoming: true, is_active: true },
            });
            if (!profile) return res.status(404).json({ error: 'No incoming voice configured' });
            voiceId = profile.elevenlabs_voice_id;
            ttsText = profile.incoming_message || ttsText;
        } else {
            // Default: use outgoing voice
            const profile = await VoiceProfile.findOne({
                where: { user_id: user.id, use_for_outgoing: true, is_active: true },
            });
            if (!profile) return res.status(404).json({ error: 'No outgoing voice configured' });
            voiceId = profile.elevenlabs_voice_id;
            ttsText = profile.outgoing_message || ttsText;
        }

        const audio = await elevenlabs.textToSpeech.convert(voiceId, {
            text: ttsText,
            model_id: 'eleven_multilingual_v2',
            output_format: 'mp3_44100_128',
        });

        // Stream audio response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'inline; filename="voice.mp3"');

        if (audio instanceof Buffer) {
            res.send(audio);
        } else if (audio && typeof audio.pipe === 'function') {
            audio.pipe(res);
        } else {
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

// DELETE /api/voice/profile/:id — Delete a specific voice profile
const deleteVoiceProfile = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const profile = await VoiceProfile.findOne({ where: { id: req.params.id, user_id: user.id } });
        if (!profile) return res.status(404).json({ error: 'Voice profile not found' });

        // Delete from ElevenLabs
        try {
            await elevenlabs.voices.delete(profile.elevenlabs_voice_id);
        } catch (e) {
            console.warn('ElevenLabs voice deletion failed:', e.message);
        }

        // Delete local sample file
        if (profile.sample_url) {
            const filePath = process.env.VERCEL
                ? path.join('/tmp', profile.sample_url)
                : path.join(__dirname, '..', '..', profile.sample_url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await profile.destroy();
        res.json({ message: 'Voice profile deleted' });
    } catch (error) {
        console.error('deleteVoiceProfile error:', error);
        res.status(500).json({ error: 'Failed to delete voice profile' });
    }
};

// PUT /api/voice/toggle/:id — Toggle settings for a specific voice
const toggleVoice = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const profile = await VoiceProfile.findOne({ where: { id: req.params.id, user_id: user.id } });
        if (!profile) return res.status(404).json({ error: 'Voice profile not found' });

        const { use_for_outgoing, use_for_incoming, is_active } = req.body;

        // If setting this voice as outgoing, unset all others for this user
        if (use_for_outgoing === true) {
            await VoiceProfile.update(
                { use_for_outgoing: false },
                { where: { user_id: user.id, id: { [require('sequelize').Op.ne]: profile.id } } }
            );
        }

        // If setting this voice as incoming, unset all others for this user
        if (use_for_incoming === true) {
            await VoiceProfile.update(
                { use_for_incoming: false },
                { where: { user_id: user.id, id: { [require('sequelize').Op.ne]: profile.id } } }
            );
        }

        const { outgoing_message, incoming_message } = req.body;

        await profile.update({
            use_for_outgoing: use_for_outgoing !== undefined ? use_for_outgoing : profile.use_for_outgoing,
            use_for_incoming: use_for_incoming !== undefined ? use_for_incoming : profile.use_for_incoming,
            is_active: is_active !== undefined ? is_active : profile.is_active,
            outgoing_message: outgoing_message !== undefined ? outgoing_message : profile.outgoing_message,
            incoming_message: incoming_message !== undefined ? incoming_message : profile.incoming_message,
        });

        // Return all profiles so frontend stays in sync
        const profiles = await VoiceProfile.findAll({
            where: { user_id: user.id },
            order: [['created_at', 'DESC']],
        });

        res.json({ message: 'Voice settings updated', profiles });
    } catch (error) {
        console.error('toggleVoice error:', error);
        res.status(500).json({ error: 'Failed to update voice settings' });
    }
};

module.exports = { upload, cloneVoice, getVoiceProfiles, generateTTS, deleteVoiceProfile, toggleVoice };
