const { SplitBill, SplitBillParticipant, SplitBillExpense, User } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('./notification.controller');

// POST /api/split-bills — Create a split bill
const createSplitBill = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { title, description, total_amount, asset_type, participants } = req.body;

        if (!title || !total_amount) {
            return res.status(400).json({ error: 'title and total_amount are required' });
        }

        // Create the split bill
        const bill = await SplitBill.create({
            creator_id: user.id,
            title,
            description: description || null,
            total_amount,
            asset_type: asset_type || 'ALGO',
            status: 'active',
        });

        // Add creator as admin participant
        await SplitBillParticipant.create({
            split_bill_id: bill.id,
            user_id: user.id,
            is_admin: true,
            share_amount: 0,
            paid_amount: 0,
            status: 'pending',
        });

        // Add other participants by username
        if (participants && Array.isArray(participants)) {
            for (const p of participants) {
                const pUser = await User.findOne({ where: { username: p.username } });
                if (pUser && pUser.id !== user.id) {
                    await SplitBillParticipant.create({
                        split_bill_id: bill.id,
                        user_id: pUser.id,
                        is_admin: false,
                        share_amount: p.share_amount || 0,
                        paid_amount: 0,
                        status: 'pending',
                    });
                }
            }
        }

        // Notify participants about the split invite
        if (participants && Array.isArray(participants)) {
            for (const p of participants) {
                const pUser = await User.findOne({ where: { username: p.username } });
                if (pUser && pUser.id !== user.id) {
                    await createNotification({
                        userId: pUser.id,
                        type: 'split_invite',
                        title: 'Split Bill Invite',
                        message: `@${user.username} added you to "${title}" — Your share: ${p.share_amount || 0} ${asset_type || 'ALGO'}`,
                        referenceId: String(bill.id),
                    });
                }
            }
        }

        const fullBill = await getSplitBillWithDetails(bill.id);
        res.status(201).json({ message: 'Split bill created', bill: fullBill });
    } catch (error) {
        console.error('createSplitBill error:', error);
        res.status(500).json({ error: 'Failed to create split bill' });
    }
};

// GET /api/split-bills — List user's split bills
const listSplitBills = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Find bills where user is creator or participant
        const participantBillIds = await SplitBillParticipant.findAll({
            where: { user_id: user.id },
            attributes: ['split_bill_id'],
        });

        const billIds = participantBillIds.map((p) => p.split_bill_id);

        const bills = await SplitBill.findAll({
            where: { id: { [Op.in]: billIds } },
            include: [
                { model: User, as: 'creator', attributes: ['id', 'username', 'display_name'] },
                {
                    model: SplitBillParticipant,
                    as: 'participants',
                    include: [{ model: User, attributes: ['id', 'username', 'display_name'] }],
                },
            ],
            order: [['created_at', 'DESC']],
        });

        res.json({ bills });
    } catch (error) {
        console.error('listSplitBills error:', error);
        res.status(500).json({ error: 'Failed to list split bills' });
    }
};

// GET /api/split-bills/:id — Full detail
const getSplitBillDetail = async (req, res) => {
    try {
        const bill = await getSplitBillWithDetails(req.params.id);
        if (!bill) return res.status(404).json({ error: 'Split bill not found' });
        res.json({ bill });
    } catch (error) {
        console.error('getSplitBillDetail error:', error);
        res.status(500).json({ error: 'Failed to fetch split bill' });
    }
};

// POST /api/split-bills/:id/members — Add members
const addMembers = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const bill = await SplitBill.findByPk(req.params.id);
        if (!bill) return res.status(404).json({ error: 'Split bill not found' });
        if (bill.status !== 'active') return res.status(400).json({ error: 'Bill is not active' });

        // Check if user is admin
        const participant = await SplitBillParticipant.findOne({
            where: { split_bill_id: bill.id, user_id: user.id, is_admin: true },
        });
        if (!participant) return res.status(403).json({ error: 'Only admins can add members' });

        const { members } = req.body;
        if (!members || !Array.isArray(members)) {
            return res.status(400).json({ error: 'members array is required' });
        }

        const added = [];
        for (const m of members) {
            const mUser = await User.findOne({ where: { username: m.username } });
            if (!mUser) continue;

            const exists = await SplitBillParticipant.findOne({
                where: { split_bill_id: bill.id, user_id: mUser.id },
            });
            if (exists) continue;

            await SplitBillParticipant.create({
                split_bill_id: bill.id,
                user_id: mUser.id,
                is_admin: m.is_admin || false,
                share_amount: m.share_amount || 0,
                paid_amount: 0,
                status: 'pending',
            });
            added.push(mUser.username);
        }

        // Notify newly added members
        for (const username of added) {
            const addedUser = await User.findOne({ where: { username } });
            if (addedUser) {
                await createNotification({
                    userId: addedUser.id,
                    type: 'split_invite',
                    title: 'Split Bill Invite',
                    message: `@${user.username} added you to "${bill.title}"`,
                    referenceId: String(bill.id),
                });
            }
        }

        const fullBill = await getSplitBillWithDetails(bill.id);
        res.json({ message: `Added ${added.length} members`, added, bill: fullBill });
    } catch (error) {
        console.error('addMembers error:', error);
        res.status(500).json({ error: 'Failed to add members' });
    }
};

// POST /api/split-bills/:id/expenses — Record an expense
const addExpense = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const bill = await SplitBill.findByPk(req.params.id);
        if (!bill) return res.status(404).json({ error: 'Split bill not found' });
        if (bill.status !== 'active') return res.status(400).json({ error: 'Bill is not active' });

        // Check if user is a participant
        const participant = await SplitBillParticipant.findOne({
            where: { split_bill_id: bill.id, user_id: user.id },
        });
        if (!participant) return res.status(403).json({ error: 'You are not a participant' });

        const { description, amount, txn_id, paid_by_username } = req.body;
        if (!description || !amount) {
            return res.status(400).json({ error: 'description and amount are required' });
        }

        // Determine who paid — default to current user
        let paidByUserId = user.id;
        if (paid_by_username) {
            const paidByUser = await User.findOne({ where: { username: paid_by_username } });
            if (paidByUser) paidByUserId = paidByUser.id;
        }

        const expense = await SplitBillExpense.create({
            split_bill_id: bill.id,
            paid_by_user_id: paidByUserId,
            description,
            amount,
            txn_id: txn_id || null,
        });

        // Update participant's paid_amount
        const paidParticipant = await SplitBillParticipant.findOne({
            where: { split_bill_id: bill.id, user_id: paidByUserId },
        });
        if (paidParticipant) {
            const newPaidAmount = parseFloat(paidParticipant.paid_amount) + parseFloat(amount);
            let status = 'pending';
            if (newPaidAmount >= parseFloat(paidParticipant.share_amount)) {
                status = 'paid';
            } else if (newPaidAmount > 0) {
                status = 'partial';
            }
            await paidParticipant.update({ paid_amount: newPaidAmount, status });
        }

        const fullBill = await getSplitBillWithDetails(bill.id);
        res.status(201).json({ message: 'Expense recorded', expense, bill: fullBill });
    } catch (error) {
        console.error('addExpense error:', error);
        res.status(500).json({ error: 'Failed to add expense' });
    }
};

// POST /api/split-bills/:id/settle — Settle user's outstanding shares
const settleUserShare = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const bill = await SplitBill.findByPk(req.params.id);
        if (!bill) return res.status(404).json({ error: 'Split bill not found' });
        if (bill.status !== 'active') return res.status(400).json({ error: 'Bill is not active' });

        const participant = await SplitBillParticipant.findOne({
            where: { split_bill_id: bill.id, user_id: user.id },
        });
        if (!participant) return res.status(403).json({ error: 'You are not a participant' });

        const { txn_ids } = req.body; // Array of Algorand txn IDs from batch payment
        const outstanding = parseFloat(participant.share_amount) - parseFloat(participant.paid_amount);

        if (outstanding <= 0) {
            return res.status(400).json({ error: 'No outstanding balance to settle' });
        }

        // Mark participant as paid
        await participant.update({
            paid_amount: participant.share_amount,
            status: 'paid',
        });

        // Record as expense(s)
        if (txn_ids && Array.isArray(txn_ids)) {
            for (const txnId of txn_ids) {
                await SplitBillExpense.create({
                    split_bill_id: bill.id,
                    paid_by_user_id: user.id,
                    description: `Settlement payment`,
                    amount: outstanding / txn_ids.length,
                    txn_id: txnId,
                });
            }
        }

        // Check if all participants are settled
        const allParticipants = await SplitBillParticipant.findAll({
            where: { split_bill_id: bill.id },
        });
        const allSettled = allParticipants.every((p) => p.status === 'paid' || parseFloat(p.share_amount) === 0);

        if (allSettled) {
            await bill.update({ status: 'settled' });

            // Notify all participants that the bill is settled
            for (const p of allParticipants) {
                if (p.user_id !== user.id) {
                    await createNotification({
                        userId: p.user_id,
                        type: 'split_settled',
                        title: 'Split Bill Settled',
                        message: `"${bill.title}" has been fully settled!`,
                        referenceId: String(bill.id),
                    });
                }
            }
        }

        const fullBill = await getSplitBillWithDetails(bill.id);
        res.json({
            message: 'Share settled',
            settled_amount: outstanding,
            bill_status: allSettled ? 'settled' : 'active',
            bill: fullBill,
        });
    } catch (error) {
        console.error('settleUserShare error:', error);
        res.status(500).json({ error: 'Failed to settle share' });
    }
};

// Helper: Get split bill with all details
async function getSplitBillWithDetails(billId) {
    return SplitBill.findByPk(billId, {
        include: [
            { model: User, as: 'creator', attributes: ['id', 'username', 'display_name', 'wallet_address'] },
            {
                model: SplitBillParticipant,
                as: 'participants',
                include: [{ model: User, attributes: ['id', 'username', 'display_name', 'wallet_address'] }],
            },
            {
                model: SplitBillExpense,
                as: 'expenses',
                include: [{ model: User, as: 'paidBy', attributes: ['id', 'username', 'display_name'] }],
                order: [['created_at', 'DESC']],
            },
        ],
    });
}

module.exports = {
    createSplitBill,
    listSplitBills,
    getSplitBillDetail,
    addMembers,
    addExpense,
    settleUserShare,
};
