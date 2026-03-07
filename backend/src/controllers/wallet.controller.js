const algosdk = require('algosdk');
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

// POST /api/wallet/fund-testnet — Send testnet ALGOs from master funder account
const fundFromFaucet = async (req, res) => {
    try {
        const { address } = req.body;
        if (!address || !isValidAddress(address)) {
            return res.status(400).json({ error: 'Valid Algorand address is required' });
        }

        const mnemonic = process.env.FUNDER_MNEMONIC;
        if (!mnemonic) {
            return res.status(503).json({
                error: 'Funder account not configured',
                detail: 'Set FUNDER_MNEMONIC in backend .env',
            });
        }

        // Recover funder account from mnemonic
        const funderAccount = algosdk.mnemonicToSecretKey(mnemonic);
        const funderAddress = funderAccount.addr;

        // Amount to send: 5 ALGO
        const fundAmount = 5_000_000; // microAlgos

        // Get suggested transaction params
        const suggestedParams = await algodClient.getTransactionParams().do();

        // Build payment transaction
        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: funderAddress,
            receiver: address,
            amount: fundAmount,
            suggestedParams,
            note: new Uint8Array(Buffer.from('DormPay auto-fund')),
        });

        // Sign the transaction
        const signedTxn = txn.signTxn(funderAccount.sk);

        // Submit the transaction
        const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

        // Wait for confirmation
        const result = await algosdk.waitForConfirmation(algodClient, txId, 4);

        console.log(`Funded ${address} with 5 ALGO, txId: ${txId}`);

        res.json({
            message: 'Funded with 5 ALGO from funder account',
            txId,
            amount: 5,
            confirmedRound: result?.confirmedRound || result?.['confirmed-round'] || null,
        });
    } catch (error) {
        console.error('fundFromFaucet error:', error);

        // Handle specific errors
        if (error.message?.includes('overspend') || error.message?.includes('underflow')) {
            return res.status(503).json({
                error: 'Funder account has insufficient balance',
                detail: 'The master funder account needs more testnet ALGOs.',
            });
        }

        res.status(500).json({ error: 'Failed to fund wallet' });
    }
};

module.exports = { getBalance, getAssets, fundFromFaucet };
