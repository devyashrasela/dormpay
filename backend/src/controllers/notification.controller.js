const { Notification, User } = require('../models');
const { sendEmail } = require('../config/mailer');
const { paymentReceivedTemplate, splitInviteTemplate, splitSettledTemplate } = require('../utils/emailTemplates');

// GET /api/notifications — List user's notifications
const getNotifications = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { page = 1, limit = 30 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: notifications } = await Notification.findAndCountAll({
            where: { user_id: user.id },
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        const unreadCount = await Notification.count({
            where: { user_id: user.id, is_read: false },
        });

        res.json({
            notifications,
            unread_count: unreadCount,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.id);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });

        await notification.update({ is_read: true });
        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('markAsRead error:', error);
        res.status(500).json({ error: 'Failed to mark notification' });
    }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res) => {
    try {
        const user = await User.findOne({ where: { auth0_sub: req.userSub } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        await Notification.update(
            { is_read: true },
            { where: { user_id: user.id, is_read: false } }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('markAllRead error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
};

// ─── Helper: Create notification + send email if user is inactive ───
const createNotification = async ({ userId, type, title, message, referenceId }) => {
    try {
        const user = await User.findByPk(userId);
        if (!user) return null;

        const notification = await Notification.create({
            user_id: userId,
            type,
            title,
            message,
            reference_id: referenceId || null,
            is_read: false,
            email_sent: false,
        });

        // Check if user is inactive → send email
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isInactive = !user.is_active || !user.last_active || user.last_active < fiveMinAgo;

        if (isInactive && user.email) {
            try {
                let html = '';
                if (type === 'payment_received') {
                    html = paymentReceivedTemplate({
                        senderName: 'Someone',
                        amount: message,
                        assetType: 'ALGO',
                        txnId: referenceId || 'N/A',
                    });
                } else if (type === 'split_invite') {
                    html = splitInviteTemplate({
                        creatorName: 'Someone',
                        title: title,
                        shareAmount: message,
                        assetType: 'ALGO',
                    });
                } else if (type === 'split_settled') {
                    html = splitSettledTemplate({
                        billTitle: title,
                        totalSettled: message,
                        assetType: 'ALGO',
                    });
                } else {
                    html = `<h2>${title}</h2><p>${message}</p>`;
                }

                await sendEmail({
                    to: user.email,
                    subject: `CampusWallet: ${title}`,
                    html,
                });

                await notification.update({ email_sent: true });
            } catch (emailError) {
                console.error('Email notification failed:', emailError.message);
            }
        }

        return notification;
    } catch (error) {
        console.error('createNotification error:', error);
        return null;
    }
};

module.exports = { getNotifications, markAsRead, markAllRead, createNotification };
