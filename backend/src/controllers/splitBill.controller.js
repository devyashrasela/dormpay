const { SplitBill, SplitBillParticipant, SplitBillExpense, User } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('./notification.controller');

// POST /api/split-bills — Create a split bill
const createSplitBill = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { title, description, total_amount, asset_type, participants } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }

        // Create the split bill (total_amount starts at 0, grows with expenses)
        const bill = await SplitBill.create({
            creator_id: user.id,
            title,
            description: description || null,
            total_amount: total_amount || 0,
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
                        share_amount: 0,
                        paid_amount: 0,
                        status: 'pending',
                    });

                    await createNotification({
                        userId: pUser.id,
                        type: 'split_invite',
                        title: 'Split Bill Invite',
                        message: `@${user.username} added you to "${title}"`,
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
                share_amount: 0,
                paid_amount: 0,
                status: 'pending',
            });
            added.push(mUser.username);

            await createNotification({
                userId: mUser.id,
                type: 'split_invite',
                title: 'Split Bill Invite',
                message: `@${user.username} added you to "${bill.title}"`,
                referenceId: String(bill.id),
            });
        }

        const fullBill = await getSplitBillWithDetails(bill.id);
        res.json({ message: `Added ${added.length} members`, added, bill: fullBill });
    } catch (error) {
        console.error('addMembers error:', error);
        res.status(500).json({ error: 'Failed to add members' });
    }
};

// POST /api/split-bills/:id/expenses — Record an expense (Google-style)
const addExpense = async (req, res) => {
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

        const { description, amount, paid_by_user_id, split_among } = req.body;
        if (!description || !amount) {
            return res.status(400).json({ error: 'description and amount are required' });
        }

        // Who paid — default to current user
        const paidByUserId = paid_by_user_id || user.id;

        // Who splits — default to all participants
        let splitUserIds = split_among;
        if (!splitUserIds || !Array.isArray(splitUserIds) || splitUserIds.length === 0) {
            const allParts = await SplitBillParticipant.findAll({
                where: { split_bill_id: bill.id },
                attributes: ['user_id'],
            });
            splitUserIds = allParts.map((p) => p.user_id);
        }

        const expense = await SplitBillExpense.create({
            split_bill_id: bill.id,
            paid_by_user_id: paidByUserId,
            description,
            amount,
            split_among: splitUserIds,
            txn_id: null,
        });

        // Recalculate all participant shares from scratch
        await recalculateShares(bill.id);

        // Update bill total
        const allExpenses = await SplitBillExpense.findAll({ where: { split_bill_id: bill.id } });
        const total = allExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        await bill.update({ total_amount: total });

        const fullBill = await getSplitBillWithDetails(bill.id);
        res.status(201).json({ message: 'Expense recorded', expense, bill: fullBill });
    } catch (error) {
        console.error('addExpense error:', error);
        res.status(500).json({ error: 'Failed to add expense' });
    }
};

// GET /api/split-bills/:id/balances — Calculate who owes whom
const getBalances = async (req, res) => {
    try {
        const bill = await SplitBill.findByPk(req.params.id, {
            include: [
                {
                    model: SplitBillParticipant,
                    as: 'participants',
                    include: [{ model: User, attributes: ['id', 'username', 'display_name'] }],
                },
                { model: SplitBillExpense, as: 'expenses' },
            ],
        });

        if (!bill) return res.status(404).json({ error: 'Split bill not found' });

        const participants = bill.participants;
        const expenses = bill.expenses;

        // Calculate net balance for each participant
        // net > 0 means others owe them, net < 0 means they owe others
        const netBalances = {};
        participants.forEach((p) => { netBalances[p.user_id] = 0; });

        for (const expense of expenses) {
            const paidBy = expense.paid_by_user_id;
            const splitIds = expense.split_among || participants.map((p) => p.user_id);
            const sharePerPerson = parseFloat(expense.amount) / splitIds.length;

            // Person who paid gets credit
            netBalances[paidBy] = (netBalances[paidBy] || 0) + parseFloat(expense.amount);

            // Each person in split_among gets debited
            for (const uid of splitIds) {
                netBalances[uid] = (netBalances[uid] || 0) - sharePerPerson;
            }
        }

        // Generate simplified debts (who owes whom)
        const debtors = []; // people who owe (net < 0)
        const creditors = []; // people who are owed (net > 0)

        for (const [userId, net] of Object.entries(netBalances)) {
            const roundedNet = Math.round(net * 1000000) / 1000000; // avoid floating point issues
            if (roundedNet < -0.0001) {
                debtors.push({ userId: parseInt(userId), amount: Math.abs(roundedNet) });
            } else if (roundedNet > 0.0001) {
                creditors.push({ userId: parseInt(userId), amount: roundedNet });
            }
        }

        // Match debtors to creditors to minimize transactions
        const settlements = [];
        let di = 0, ci = 0;
        const dCopy = debtors.map((d) => ({ ...d }));
        const cCopy = creditors.map((c) => ({ ...c }));

        while (di < dCopy.length && ci < cCopy.length) {
            const settleAmount = Math.min(dCopy[di].amount, cCopy[ci].amount);
            if (settleAmount > 0.0001) {
                const debtorInfo = participants.find((p) => p.user_id === dCopy[di].userId);
                const creditorInfo = participants.find((p) => p.user_id === cCopy[ci].userId);

                settlements.push({
                    from_user_id: dCopy[di].userId,
                    from_username: debtorInfo?.User?.username,
                    from_display_name: debtorInfo?.User?.display_name,
                    to_user_id: cCopy[ci].userId,
                    to_username: creditorInfo?.User?.username,
                    to_display_name: creditorInfo?.User?.display_name,
                    amount: Math.round(settleAmount * 1000000) / 1000000,
                });
            }

            dCopy[di].amount -= settleAmount;
            cCopy[ci].amount -= settleAmount;
            if (dCopy[di].amount < 0.0001) di++;
            if (cCopy[ci].amount < 0.0001) ci++;
        }

        // Per-participant summary
        const summary = participants.map((p) => ({
            user_id: p.user_id,
            username: p.User?.username,
            display_name: p.User?.display_name,
            net_balance: Math.round((netBalances[p.user_id] || 0) * 1000000) / 1000000,
            share_amount: parseFloat(p.share_amount),
            paid_amount: parseFloat(p.paid_amount),
        }));

        res.json({ balances: summary, settlements });
    } catch (error) {
        console.error('getBalances error:', error);
        res.status(500).json({ error: 'Failed to calculate balances' });
    }
};

// POST /api/split-bills/:id/settle — Settle a specific debt
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

        const { txn_id, to_user_id, amount } = req.body;

        // Record settlement as an expense (payer = current user, type = settlement)
        await SplitBillExpense.create({
            split_bill_id: bill.id,
            paid_by_user_id: user.id,
            description: `Settlement payment`,
            amount: amount || 0,
            split_among: to_user_id ? [to_user_id] : [user.id],
            txn_id: txn_id || null,
        });

        // Recalculate shares
        await recalculateShares(bill.id);

        // Check if all debts are settled (all net balances near 0)
        const allExpenses = await SplitBillExpense.findAll({ where: { split_bill_id: bill.id } });
        const allParts = await SplitBillParticipant.findAll({ where: { split_bill_id: bill.id } });
        const netBalances = {};
        allParts.forEach((p) => { netBalances[p.user_id] = 0; });

        for (const exp of allExpenses) {
            const splitIds = exp.split_among || allParts.map((p) => p.user_id);
            const sharePerPerson = parseFloat(exp.amount) / splitIds.length;
            netBalances[exp.paid_by_user_id] = (netBalances[exp.paid_by_user_id] || 0) + parseFloat(exp.amount);
            for (const uid of splitIds) {
                netBalances[uid] = (netBalances[uid] || 0) - sharePerPerson;
            }
        }

        const allSettled = Object.values(netBalances).every((v) => Math.abs(v) < 0.01);
        if (allSettled) {
            await bill.update({ status: 'settled' });
            for (const p of allParts) {
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
            message: 'Settlement recorded',
            settled_amount: amount || 0,
            bill_status: allSettled ? 'settled' : 'active',
            bill: fullBill,
        });
    } catch (error) {
        console.error('settleUserShare error:', error);
        res.status(500).json({ error: 'Failed to settle share' });
    }
};

// Helper: Recalculate all participant shares from expenses
async function recalculateShares(billId) {
    const participants = await SplitBillParticipant.findAll({ where: { split_bill_id: billId } });
    const expenses = await SplitBillExpense.findAll({ where: { split_bill_id: billId } });

    // Reset shares
    const shares = {};
    const paid = {};
    participants.forEach((p) => { shares[p.user_id] = 0; paid[p.user_id] = 0; });

    for (const expense of expenses) {
        const splitIds = expense.split_among || participants.map((p) => p.user_id);
        const sharePerPerson = parseFloat(expense.amount) / splitIds.length;

        // Each person in split_among owes their share
        for (const uid of splitIds) {
            shares[uid] = (shares[uid] || 0) + sharePerPerson;
        }

        // Person who paid has that as paid_amount
        paid[expense.paid_by_user_id] = (paid[expense.paid_by_user_id] || 0) + parseFloat(expense.amount);
    }

    // Update participants
    for (const p of participants) {
        const shareAmount = shares[p.user_id] || 0;
        const paidAmount = paid[p.user_id] || 0;
        let status = 'pending';
        if (paidAmount >= shareAmount && shareAmount > 0) status = 'paid';
        else if (paidAmount > 0) status = 'partial';

        await p.update({ share_amount: shareAmount, paid_amount: paidAmount, status });
    }
}

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
    getBalances,
    settleUserShare,
};
