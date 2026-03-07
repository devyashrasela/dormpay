const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const { getNotifications, markAsRead, markAllRead } = require('../controllers/notification.controller');

router.use(checkJwt, extractUser);

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markAsRead);

module.exports = router;
