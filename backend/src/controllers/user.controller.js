const { User } = require('../models');

// POST /api/users/sync — Create or update user profile after Auth0 login
const syncUser = async (req, res) => {
    try {
        const auth0Sub = req.userSub;
        const { username, wallet_address, email, display_name, avatar_url } = req.body;

        if (!auth0Sub) {
            return res.status(401).json({ error: 'Missing auth0 sub claim' });
        }

        if (!username || !email) {
            return res.status(400).json({ error: 'username and email are required' });
        }

        const [user, created] = await User.findOrCreate({
            where: { auth0_sub: auth0Sub },
            defaults: {
                username,
                wallet_address: wallet_address || null,
                email,
                display_name: display_name || username,
                avatar_url: avatar_url || null,
                is_active: true,
                last_active: new Date(),
            },
        });

        if (!created) {
            // Update existing user
            await user.update({
                wallet_address: wallet_address || user.wallet_address,
                email: email || user.email,
                display_name: display_name || user.display_name,
                avatar_url: avatar_url || user.avatar_url,
                is_active: true,
                last_active: new Date(),
            });
        }

        res.status(created ? 201 : 200).json({
            message: created ? 'User created' : 'User synced',
            user,
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Username or wallet address already taken' });
        }
        console.error('syncUser error:', error);
        res.status(500).json({ error: 'Failed to sync user' });
    }
};

// GET /api/users/me
const getMe = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Update activity
        await user.update({ is_active: true, last_active: new Date() });

        res.json({ user });
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

// PUT /api/users/me
const updateMe = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { display_name, avatar_url, wallet_address } = req.body;

        await user.update({
            display_name: display_name !== undefined ? display_name : user.display_name,
            avatar_url: avatar_url !== undefined ? avatar_url : user.avatar_url,
            wallet_address: wallet_address !== undefined ? wallet_address : user.wallet_address,
            last_active: new Date(),
        });

        res.json({ message: 'Profile updated', user });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Wallet address already taken' });
        }
        console.error('updateMe error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

// GET /api/users/lookup/:username
const lookupUser = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({
            where: { username },
            attributes: ['id', 'username', 'wallet_address', 'display_name', 'avatar_url'],
        });

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!user.wallet_address) return res.status(400).json({ error: 'User has no wallet connected' });

        res.json({ user });
    } catch (error) {
        console.error('lookupUser error:', error);
        res.status(500).json({ error: 'Failed to lookup user' });
    }
};

module.exports = { syncUser, getMe, updateMe, lookupUser };
