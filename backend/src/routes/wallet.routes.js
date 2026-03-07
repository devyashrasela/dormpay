const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const { getBalance, getAssets } = require('../controllers/wallet.controller');

router.use(checkJwt, extractUser);

router.get('/balance/:address', getBalance);
router.get('/assets/:address', getAssets);

module.exports = router;
