const { Transaction, User, SplitBill, SplitBillParticipant } = require('../models');
const { fn, col, Op } = require('sequelize');

/**
 * Build a context string with user's data for Gemini AI prompts
 */
const buildUserContext = async (auth0Sub) => {
    const user = await User.findOne({ where: { auth0_sub: auth0Sub } });
    if (!user) return 'No user data available.';

    const parts = [];

    // Basic info
    parts.push(`User: @${user.username} (${user.display_name || 'No display name'})`);
    parts.push(`Wallet: ${user.wallet_address || 'Not connected'}`);

    // Recent transactions (last 50)
    const recentTxns = await Transaction.findAll({
        where: {
            [Op.or]: [{ sender_user_id: user.id }, { receiver_user_id: user.id }],
            status: { [Op.in]: ['confirmed', 'pending'] },
        },
        include: [
            { model: User, as: 'sender', attributes: ['username'] },
            { model: User, as: 'receiver', attributes: ['username'] },
        ],
        order: [['created_at', 'DESC']],
        limit: 50,
    });

    if (recentTxns.length > 0) {
        parts.push(`\nRecent Transactions (${recentTxns.length}):`);
        recentTxns.forEach((txn) => {
            const direction = txn.sender_user_id === user.id ? 'SENT' : 'RECEIVED';
            const otherUser = direction === 'SENT'
                ? txn.receiver?.username || txn.receiver_address
                : txn.sender?.username || txn.sender_address;
            const dateStr = txn.created_at ? new Date(txn.created_at).toISOString().split('T')[0] : 'unknown date';
            parts.push(`  ${direction} ${txn.amount} ${txn.asset_type} ${direction === 'SENT' ? 'to' : 'from'} @${otherUser} on ${dateStr}${txn.note ? ` — "${txn.note}"` : ''}`);
        });
    }

    // Summary stats
    const [sentStats] = await Transaction.findAll({
        where: { sender_user_id: user.id, status: { [Op.in]: ['confirmed', 'pending'] } },
        attributes: [
            [fn('COUNT', col('id')), 'count'],
            [fn('SUM', col('amount')), 'total'],
        ],
        raw: true,
    });

    const [recvStats] = await Transaction.findAll({
        where: { receiver_user_id: user.id, status: { [Op.in]: ['confirmed', 'pending'] } },
        attributes: [
            [fn('COUNT', col('id')), 'count'],
            [fn('SUM', col('amount')), 'total'],
        ],
        raw: true,
    });

    parts.push(`\nSummary: Sent ${sentStats.total || 0} ALGO (${sentStats.count || 0} txns), Received ${recvStats.total || 0} ALGO (${recvStats.count || 0} txns)`);

    // Active split bills
    try {
        const participantBills = await SplitBillParticipant.findAll({
            where: { user_id: user.id },
            include: [{
                model: SplitBill,
                where: { status: 'active' },
                attributes: ['title', 'total_amount', 'asset_type'],
            }],
        });

        if (participantBills.length > 0) {
            parts.push(`\nActive Split Bills (${participantBills.length}):`);
            participantBills.forEach((p) => {
                const outstanding = parseFloat(p.share_amount || 0) - parseFloat(p.paid_amount || 0);
                parts.push(`  "${p.SplitBill.title}" — Your share: ${p.share_amount || 0}, Paid: ${p.paid_amount || 0}, Outstanding: ${outstanding}`);
            });
        }
    } catch (e) {
        // Split bills may not be set up yet, ignore
    }

    return parts.join('\n');
};

module.exports = { buildUserContext };
