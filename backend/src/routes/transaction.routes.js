const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const { saveTransaction, getHistory, getTransactionStatus } = require('../controllers/transaction.controller');

router.use(checkJwt, extractUser);

router.post('/', saveTransaction);
router.get('/history', getHistory);
router.get('/:txnId/status', getTransactionStatus);

module.exports = router;
