const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const { syncUser, getMe, updateMe, lookupUser } = require('../controllers/user.controller');

router.use(checkJwt, extractUser);

router.post('/sync', syncUser);
router.get('/me', getMe);
router.put('/me', updateMe);
router.get('/lookup/:username', lookupUser);

module.exports = router;
