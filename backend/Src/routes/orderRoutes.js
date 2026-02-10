// backend/src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
} = require('../controllers/orderController');

// Existing order routes
router.get('/', getAllOrders);
router.get('/stats', getOrderStats);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.patch('/:id/status', updateOrderStatus);
router.delete('/:id', deleteOrder);

// ✅ NEW: Driver assignment and delivery management routes
router.put('/:id/assign-driver', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const { driverId, deliveryStatus, driverName, driverPhone } = req.body;
    
    const updateData = {
      updatedAt: new Date()
    };

    // If driverId is provided, assign driver
    if (driverId) {
      updateData.driver = driverId;
      if (driverName) updateData.driverName = driverName;
      if (driverPhone) updateData.driverPhone = driverPhone;
    }

    // If deliveryStatus is provided, update it
    if (deliveryStatus) {
      updateData.deliveryStatus = deliveryStatus;
      
      // Track when delivered
      if (deliveryStatus === 'delivered') {
        updateData.deliveredAt = new Date();
        updateData.status = 'completed';
      }
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: deliveryStatus ? `Order ${deliveryStatus}` : 'Driver assigned successfully',
      data: order
    });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning driver',
      error: error.message
    });
  }
});

// ✅ NEW: Broadcast order to all available drivers
router.post('/:id/broadcast', async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        broadcast: true,
        deliveryStatus: 'pending',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // TODO: Emit WebSocket event to all drivers
    // if (req.app.get('io')) {
    //   req.app.get('io').emit('order:broadcast', order);
    // }

    res.json({
      success: true,
      message: 'Order broadcasted to all drivers',
      data: order
    });
  } catch (error) {
    console.error('Broadcast order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error broadcasting order',
      error: error.message
    });
  }
});

// ✅ NEW: Update delivery location (driver's current location)
router.patch('/:id/update-location', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const { lat, lng } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        'driver.currentLocation': { lat, lng },
        updatedAt: new Date()
      },
      { new: true }
    ).populate('driver');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Location updated',
      data: order
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
});

module.exports = router;