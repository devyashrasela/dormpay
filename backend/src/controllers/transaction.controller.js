const { Transaction, User } = require('../models');
const { indexerClient, algodClient } = require('../config/algorand');
const { isValidAddress } = require('../utils/algorand.util');
const { createNotification } = require('./notification.controller');

// POST /api/transactions — Save transaction metadata after on-chain submit
const saveTransaction = async (req, res) => {
    try {
        const { txn_id, receiver_address, amount, asset_type, asset_id, note } = req.body;
        const senderUser = await User.findOne({ where: { auth0_sub: req.userSub } });

        if (!senderUser) return res.status(404).json({ error: 'Sender user not found' });
        if (!txn_id || !receiver_address || !amount) {
            return res.status(400).json({ error: 'txn_id, receiver_address, and amount are required' });
        }

        // Look up receiver user if they exist in our system
        const receiverUser = await User.findOne({ where: { wallet_address: receiver_address } });

        const transaction = await Transaction.create({
            txn_id,
            sender_user_id: senderUser.id,
            receiver_user_id: receiverUser?.id || null,
            sender_address: senderUser.wallet_address,
            receiver_address,
            amount,
            asset_type: asset_type || 'ALGO',
            asset_id: asset_id || 0,
            note: note || null,
            status: 'confirmed',
        });

        // Create notification for recipient if they're a known user
        if (receiverUser) {
            await createNotification({
                userId: receiverUser.id,
                type: 'payment_received',
                title: 'Payment Received',
                message: `@${senderUser.username} sent you ${amount} ${asset_type || 'ALGO'}`,
                referenceId: txn_id,
            });
        }

        res.status(201).json({ message: 'Transaction saved', transaction });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Transaction already recorded' });
        }
        console.error('saveTransaction error:', error);
        res.status(500).json({ error: 'Failed to save transaction' });
    }
};

// GET /api/transactions/history
const getHistory = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { page = 1, limit = 20, filter = 'all' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        const { Op } = require('sequelize');

        if (filter === 'sent') {
            where.sender_user_id = user.id;
        } else if (filter === 'received') {
            where.receiver_user_id = user.id;
        } else {
            where[Op.or] = [
                { sender_user_id: user.id },
                { receiver_user_id: user.id },
            ];
        }

        const { count, rows: transactions } = await Transaction.findAndCountAll({
            where,
            include: [
                { model: User, as: 'sender', attributes: ['id', 'username', 'display_name', 'wallet_address'] },
                { model: User, as: 'receiver', attributes: ['id', 'username', 'display_name', 'wallet_address'] },
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            transactions,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('getHistory error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

// GET /api/transactions/:txnId/status
const getTransactionStatus = async (req, res) => {
    try {
        const { txnId } = req.params;

        // Check local DB first
        const localTxn = await Transaction.findOne({ where: { txn_id: txnId } });

        // Check on-chain status
        try {
            const pendingInfo = await algodClient.pendingTransactionInformation(txnId).do();

            if (pendingInfo['confirmed-round'] && pendingInfo['confirmed-round'] > 0) {
                // Update local record if exists
                if (localTxn && localTxn.status !== 'confirmed') {
                    await localTxn.update({
                        status: 'confirmed',
                        block_round: pendingInfo['confirmed-round'],
                    });
                }

                return res.json({
                    txn_id: txnId,
                    status: 'confirmed',
                    block_round: pendingInfo['confirmed-round'],
                });
            }

            return res.json({
                txn_id: txnId,
                status: 'pending',
                block_round: null,
            });
        } catch (chainError) {
            // Transaction not found in pending — check indexer
            try {
                const indexerResult = await indexerClient.lookupTransactionByID(txnId).do();
                if (indexerResult.transaction) {
                    if (localTxn && localTxn.status !== 'confirmed') {
                        await localTxn.update({
                            status: 'confirmed',
                            block_round: indexerResult.transaction['confirmed-round'],
                        });
                    }

                    return res.json({
                        txn_id: txnId,
                        status: 'confirmed',
                        block_round: indexerResult.transaction['confirmed-round'],
                    });
                }
            } catch {
                // Not found anywhere
            }

            return res.json({
                txn_id: txnId,
                status: localTxn?.status || 'unknown',
                block_round: localTxn?.block_round || null,
            });
        }
    } catch (error) {
        console.error('getTransactionStatus error:', error);
        res.status(500).json({ error: 'Failed to check transaction status' });
    }
};

module.exports = { saveTransaction, getHistory, getTransactionStatus };
