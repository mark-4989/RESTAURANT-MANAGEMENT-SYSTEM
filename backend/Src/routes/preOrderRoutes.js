// backend/src/routes/preOrderRoutes.js
const express = require('express');
const router = express.Router();
const {
  createPreOrder,
  getAllPreOrders,
  getPreOrder,
  updatePreOrderStatus,
  updatePreOrder,
  deletePreOrder
} = require('../controllers/preOrderController');

// Create new pre-order
router.post('/', createPreOrder);

// Get all pre-orders (with optional filters)
router.get('/', getAllPreOrders);

// Get single pre-order by ID
router.get('/:id', getPreOrder);

// Update pre-order status
router.put('/:id/status', updatePreOrderStatus);

// Update pre-order (add items, change details)
router.put('/:id', updatePreOrder);

// Cancel/Delete pre-order
router.delete('/:id', deletePreOrder);

module.exports = router;