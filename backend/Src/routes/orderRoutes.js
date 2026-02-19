// backend/src/routes/orderRoutes.js — COMPLETE FILE
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

// Notification helpers
const {
  createAndEmitNotification,
  STATUS_TO_TYPE,
  getMessage,
} = require('./notificationRoutes');

// ── Existing order routes ─────────────────────────────────────────────────────
router.get('/',        getAllOrders);
router.get('/stats',   getOrderStats);
router.get('/:id',     getOrder);
router.delete('/:id',  deleteOrder);

// ── POST / — create order ─────────────────────────────────────────────────────
// Wraps the original createOrder controller, then fires ORDER_PLACED notification
router.post('/', async (req, res, next) => {
  const originalJson = res.json.bind(res);
  let intercepted = false;

  res.json = (body) => {
    intercepted = true;

    if (body?.success && body?.data?._id) {
      const order       = body.data;
      const recipientId = order.customerId;

      if (recipientId) {
        const io = req.app.get('io');
        createAndEmitNotification(io, {
          userId:      recipientId,
          type:        'ORDER_PLACED',
          orderId:     order._id,
          orderNumber: order.orderNumber,
          orderType:   order.orderType,
          message:     getMessage('pending', order.orderNumber, order.orderType),
        }).catch(err => console.error('[Notif] ORDER_PLACED error:', err.message));
      } else {
        console.log('[Notif] ORDER_PLACED skipped — no customerId on order:', order.orderNumber);
      }
    }

    return originalJson(body);
  };

  await createOrder(req, res, next);
});

// ── PATCH /:id/status — update status ────────────────────────────────────────
// Wraps the original updateOrderStatus controller, then fires status notification
router.patch('/:id/status', async (req, res, next) => {
  const Order = require('../models/Order');

  // Read the order BEFORE the controller changes it so we know previousStatus
  let previousStatus  = null;
  let cachedOrderType = null;
  try {
    const existing = await Order.findById(req.params.id).select('status customerId orderNumber orderType');
    if (existing) {
      previousStatus  = existing.status;
      cachedOrderType = existing.orderType;
    }
  } catch (_) {}

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (body?.success && body?.data) {
      const order       = body.data;
      const newStatus   = order.status;
      const recipientId = order.customerId;
      const orderType   = order.orderType || cachedOrderType;

      if (newStatus !== previousStatus) {
        const notifType = STATUS_TO_TYPE[newStatus];

        if (notifType && recipientId) {
          const io = req.app.get('io');
          createAndEmitNotification(io, {
            userId:      recipientId,
            type:        notifType,
            orderId:     order._id,
            orderNumber: order.orderNumber,
            orderType,
            message:     getMessage(newStatus, order.orderNumber, orderType),
          }).catch(err => console.error('[Notif] status emit error:', err.message));

          console.log(`[Notif] ✅ Sent ${notifType} to customer_${recipientId} (${orderType})`);
        } else {
          console.log('[Notif] Skipped status notification:', {
            newStatus,
            notifType,
            recipientId,
            hasMessage: !!getMessage,
          });
        }
      }
    }

    return originalJson(body);
  };

  await updateOrderStatus(req, res, next);
});

// ── PUT /:id/assign-driver ────────────────────────────────────────────────────
router.put('/:id/assign-driver', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const { driverId, deliveryStatus, driverName, driverPhone } = req.body;
    
    const updateData = { updatedAt: new Date() };

    if (driverId) {
      updateData.driver = driverId;
      if (driverName)  updateData.driverName  = driverName;
      if (driverPhone) updateData.driverPhone = driverPhone;
    }

    if (deliveryStatus) {
      updateData.deliveryStatus = deliveryStatus;
      if (deliveryStatus === 'delivered') {
        updateData.deliveredAt = new Date();
        updateData.status      = 'completed';
      }
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Notify customer when driver is assigned, on the way, or delivered
    if (deliveryStatus && order.customerId) {
      const notifMap = {
        'assigned': {
          type: 'ON_THE_WAY',
          msg:  `A driver has been assigned to your order #${order.orderNumber} and will pick it up shortly. 🚗`,
        },
        'on-the-way': {
          type: 'ON_THE_WAY',
          msg:  `Your order #${order.orderNumber} is on its way — the driver is heading to you now! 🚚 Track it live on the app.`,
        },
        'delivered': {
          type: 'DELIVERED',
          msg:  `Your order #${order.orderNumber} has arrived! We hope you enjoy every bite. Bon appétit! 🏠❤️`,
        },
      };
      const notif = notifMap[deliveryStatus];
      if (notif) {
        const io = req.app.get('io');
        createAndEmitNotification(io, {
          userId:      order.customerId,
          type:        notif.type,
          orderId:     order._id,
          orderNumber: order.orderNumber,
          orderType:   order.orderType,
          message:     notif.msg,
        }).catch(err => console.error('[Notif] driver status error:', err.message));
      }
    }

    res.json({
      success: true,
      message: deliveryStatus ? `Order ${deliveryStatus}` : 'Driver assigned successfully',
      data: order,
    });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({ success: false, message: 'Error assigning driver', error: error.message });
  }
});

// ── POST /:id/broadcast ───────────────────────────────────────────────────────
router.post('/:id/broadcast', async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { broadcast: true, deliveryStatus: 'pending', updatedAt: new Date() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // TODO: Emit WebSocket event to all drivers
    // if (req.app.get('io')) {
    //   req.app.get('io').emit('order:broadcast', order);
    // }

    res.json({ success: true, message: 'Order broadcasted to all drivers', data: order });
  } catch (error) {
    console.error('Broadcast order error:', error);
    res.status(500).json({ success: false, message: 'Error broadcasting order', error: error.message });
  }
});

// ── PATCH /:id/update-location ────────────────────────────────────────────────
router.patch('/:id/update-location', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const { lat, lng } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 'driver.currentLocation': { lat, lng }, updatedAt: new Date() },
      { new: true }
    ).populate('driver');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Location updated', data: order });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, message: 'Error updating location', error: error.message });
  }
});

module.exports = router;