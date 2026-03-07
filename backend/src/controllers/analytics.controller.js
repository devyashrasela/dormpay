const { Transaction, User } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

// GET /api/analytics/summary
const getSummary = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const [sentStats] = await Transaction.findAll({
            where: { sender_user_id: user.id, status: { [Op.in]: ['confirmed', 'pending'] } },
            attributes: [
                [fn('COUNT', col('id')), 'count'],
                [fn('SUM', col('amount')), 'total'],
                [fn('AVG', col('amount')), 'avg'],
            ],
            raw: true,
        });

        const [receivedStats] = await Transaction.findAll({
            where: { receiver_user_id: user.id, status: { [Op.in]: ['confirmed', 'pending'] } },
            attributes: [
                [fn('COUNT', col('id')), 'count'],
                [fn('SUM', col('amount')), 'total'],
                [fn('AVG', col('amount')), 'avg'],
            ],
            raw: true,
        });

        res.json({
            sent: {
                count: parseInt(sentStats.count) || 0,
                total: parseFloat(sentStats.total) || 0,
                avg: parseFloat(sentStats.avg) || 0,
            },
            received: {
                count: parseInt(receivedStats.count) || 0,
                total: parseFloat(receivedStats.total) || 0,
                avg: parseFloat(receivedStats.avg) || 0,
            },
            net: (parseFloat(receivedStats.total) || 0) - (parseFloat(sentStats.total) || 0),
        });
    } catch (error) {
        console.error('getSummary error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
};

// GET /api/analytics/monthly
const getMonthly = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { months = 6 } = req.query;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        const sentMonthly = await Transaction.findAll({
            where: {
                sender_user_id: user.id,
                status: { [Op.in]: ['confirmed', 'pending'] },
                created_at: { [Op.gte]: startDate },
            },
            attributes: [
                [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
                [fn('SUM', col('amount')), 'total'],
                [fn('COUNT', col('id')), 'count'],
            ],
            group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m')],
            order: [[fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'ASC']],
            raw: true,
        });

        const receivedMonthly = await Transaction.findAll({
            where: {
                receiver_user_id: user.id,
                status: { [Op.in]: ['confirmed', 'pending'] },
                created_at: { [Op.gte]: startDate },
            },
            attributes: [
                [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
                [fn('SUM', col('amount')), 'total'],
                [fn('COUNT', col('id')), 'count'],
            ],
            group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m')],
            order: [[fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'ASC']],
            raw: true,
        });

        res.json({
            sent: sentMonthly.map((r) => ({
                month: r.month,
                total: parseFloat(r.total) || 0,
                count: parseInt(r.count) || 0,
            })),
            received: receivedMonthly.map((r) => ({
                month: r.month,
                total: parseFloat(r.total) || 0,
                count: parseInt(r.count) || 0,
            })),
        });
    } catch (error) {
        console.error('getMonthly error:', error);
        res.status(500).json({ error: 'Failed to fetch monthly analytics' });
    }
};

module.exports = { getSummary, getMonthly };
