// backend/src/routes/deliveryRoutes.js
const express = require('express');
const router = express.Router();
const {
  assignDriver,
  autoAssignDriver,
  acceptDelivery,
  updateDeliveryStatus,
  getActiveDeliveries,
  getDriverDelivery,
  getDeliveryStats
} = require('../controllers/deliveryController');

// Delivery management
router.get('/active', getActiveDeliveries);
router.get('/stats', getDeliveryStats);
router.get('/driver/:driverId', getDriverDelivery);

// Driver assignment
router.post('/:orderId/assign', assignDriver);
router.post('/:orderId/auto-assign', autoAssignDriver);
router.post('/:orderId/accept', acceptDelivery);

// Status updates
router.patch('/:orderId/status', updateDeliveryStatus);

module.exports = router;