const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

router.use(checkJwt, extractUser);

router.post('/sync', userController.syncUser);
router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.get('/search', userController.searchUsers);
router.get('/lookup/:username', userController.lookupUser);
router.put('/setup/complete', userController.completeSetup);

module.exports = router;
