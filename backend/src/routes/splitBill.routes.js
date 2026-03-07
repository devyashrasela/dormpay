const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const {
    createSplitBill,
    listSplitBills,
    getSplitBillDetail,
    addMembers,
    addExpense,
    settleUserShare,
} = require('../controllers/splitBill.controller');

router.use(checkJwt, extractUser);

router.post('/', createSplitBill);
router.get('/', listSplitBills);
router.get('/:id', getSplitBillDetail);
router.post('/:id/members', addMembers);
router.post('/:id/expenses', addExpense);
router.post('/:id/settle', settleUserShare);

module.exports = router;
