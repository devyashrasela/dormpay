const { algodClient } = require('../config/algorand');
const { isValidAddress } = require('../utils/algorand.util');

// GET /api/wallet/balance/:address
const getBalance = async (req, res) => {
    try {
        const { address } = req.params;

        if (!isValidAddress(address)) {
            return res.status(400).json({ error: 'Invalid Algorand address' });
        }

        const accountInfo = await algodClient.accountInformation(address).do();

        // algosdk v3 returns camelCase properties
        const balance = {
            algo: Number(accountInfo.amount) / 1_000_000,
            algo_microalgos: Number(accountInfo.amount),
            min_balance: Number(accountInfo.minBalance || accountInfo['min-balance'] || 0) / 1_000_000,
            pending_rewards: Number(accountInfo.pendingRewards || accountInfo['pending-rewards'] || 0) / 1_000_000,
        };

        res.json({ address, balance });
    } catch (error) {
        console.error('getBalance error:', error);
        if (error.message?.includes('no accounts found') || error.status === 404) {
            return res.status(404).json({ error: 'Account not found on Algorand TestNet' });
        }
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
};

// GET /api/wallet/assets/:address
const getAssets = async (req, res) => {
    try {
        const { address } = req.params;

        if (!isValidAddress(address)) {
            return res.status(400).json({ error: 'Invalid Algorand address' });
        }

        const accountInfo = await algodClient.accountInformation(address).do();

        // algosdk v3 uses camelCase: assetId, amount, isFrozen
        const rawAssets = accountInfo.assets || [];
        const assets = rawAssets.map((asset) => ({
            asset_id: asset.assetId ?? asset['asset-id'],
            amount: asset.amount,
            is_frozen: asset.isFrozen ?? asset['is-frozen'],
        }));

        res.json({ address, assets });
    } catch (error) {
        console.error('getAssets error:', error);
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
};

module.exports = { getBalance, getAssets };
