const express = require('express');
const router = express.Router();
const { checkJwt, extractUser } = require('../middleware/auth.middleware');
const { getSummary, getMonthly } = require('../controllers/analytics.controller');

router.use(checkJwt, extractUser);

router.get('/summary', getSummary);
router.get('/monthly', getMonthly);

module.exports = router;
