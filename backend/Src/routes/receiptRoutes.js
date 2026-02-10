// backend/src/routes/receiptRoutes.js
const express = require('express');
const router = express.Router();
const { generateReceipt, emailReceipt } = require('../controllers/receiptController');

// Generate and download receipt
router.get('/:orderId', generateReceipt);

// Email receipt
router.post('/email', emailReceipt);

module.exports = router;