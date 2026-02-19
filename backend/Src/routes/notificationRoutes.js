// server/routes/notificationRoutes.js
const express = require('express');
const router  = express.Router();
const Notification = require('../models/Notification');

// ── Metadata per notification type ────────────────────────────────────────────
const NOTIFICATION_META = {
  ORDER_PLACED:    { label: 'Order Placed',      emoji: '🧾', color: '#3b82f6' },
  ORDER_CONFIRMED: { label: 'Order Confirmed',   emoji: '✅', color: '#10b981' },
  PREPARING:       { label: 'Being Prepared',    emoji: '🔥', color: '#f59e0b' },
  READY:           { label: 'Ready!',            emoji: '🍽️', color: '#8b5cf6' },
  ON_THE_WAY:      { label: 'On the Way',        emoji: '🚚', color: '#06b6d4' },
  DELIVERED:       { label: 'Delivered',         emoji: '🏠', color: '#10b981' },
  PAYMENT_SUCCESS: { label: 'Payment Confirmed', emoji: '💳', color: '#10b981' },
  PAYMENT_FAILED:  { label: 'Payment Failed',    emoji: '❌', color: '#ef4444' },
  CANCELLED:       { label: 'Order Cancelled',   emoji: '🚫', color: '#ef4444' },
  CHEF_MESSAGE:    { label: 'Message from Chef', emoji: '👨‍🍳', color: '#dc2626' },
  PROMO:           { label: 'Special Offer',     emoji: '🎉', color: '#f59e0b' },
};

// Order status → notification type
const STATUS_TO_TYPE = {
  confirmed:  'ORDER_CONFIRMED',
  preparing:  'PREPARING',
  ready:      'READY',
  on_the_way: 'ON_THE_WAY',
  delivered:  'DELIVERED',
  completed:  'DELIVERED',
  cancelled:  'CANCELLED',
};

// Order status → customer-facing message
const STATUS_MESSAGES = {
  pending:    (num) => `Your order #${num} has been placed! We'll confirm it shortly.`,
  confirmed:  (num) => `Your order #${num} has been confirmed and is queued for the kitchen!`,
  preparing:  (num) => `🔥 The chef is preparing your order #${num}. Hang tight!`,
  ready:      (num) => `Your order #${num} is ready! Come pick it up 🍽️`,
  on_the_way: (num) => `Your order #${num} is on its way — the driver is heading to you 🚚`,
  delivered:  (num) => `Your order #${num} has been delivered. Enjoy your meal! 🏠`,
  completed:  (num) => `Your order #${num} is complete. Thanks for dining with DineSmart! ⭐`,
  cancelled:  (num) => `Your order #${num} was cancelled. Contact us if you need help.`,
};

// ── Core: save to DB + emit via Socket.IO ─────────────────────────────────────
const createAndEmitNotification = async (io, { userId, type, orderId, orderNumber, message }) => {
  try {
    const notif = await Notification.create({
      userId,
      type,
      orderId:     orderId     || null,
      orderNumber: orderNumber || null,
      message,
    });

    const meta = NOTIFICATION_META[type] || {};
    const payload = { ...notif.toObject(), ...meta };

    // Push to the specific customer's socket room
    if (io) {
      io.to(`customer_${userId}`).emit('new_notification', payload);
    }

    return notif;
  } catch (err) {
    console.error('[Notification] create/emit error:', err.message);
    return null;
  }
};

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/notifications/:userId
 * All notifications for a customer, newest first
 */
router.get('/:userId', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const skip  = Number(req.query.skip)  || 0;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.params.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId: req.params.userId, read: false }),
    ]);

    // Attach emoji + color for the frontend
    const enriched = notifications.map(n => ({
      ...n.toObject(),
      ...(NOTIFICATION_META[n.type] || {}),
    }));

    res.json({ success: true, data: enriched, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/notifications/read-all/:userId
 * Mark ALL notifications read  (must come BEFORE /:notifId/read to avoid conflict)
 */
router.patch('/read-all/:userId', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/notifications/:notifId/read
 * Mark a single notification read
 */
router.patch('/:notifId/read', async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.notifId,
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/notifications/clear/:userId
 * Clear all notifications for a user
 */
router.delete('/clear/:userId', async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.params.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/chef-message
 * Chef sends a manual message to a customer
 * Body: { orderId, message }
 */
router.post('/chef-message', async (req, res) => {
  try {
    const { orderId, message } = req.body;
    if (!orderId || !message) {
      return res.status(400).json({ success: false, error: 'orderId and message are required' });
    }

    const Order = require('../models/Order');
    const order = await Order.findById(orderId);
    if (!order)             return res.status(404).json({ success: false, error: 'Order not found' });
    if (!order.customerId)  return res.status(400).json({ success: false, error: 'Order has no customerId' });

    const io   = req.app.get('io');
    const notif = await createAndEmitNotification(io, {
      userId:      order.customerId,
      type:        'CHEF_MESSAGE',
      orderId:     order._id,
      orderNumber: order.orderNumber,
      message,
    });

    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export route + helpers (used by orderRoutes)
module.exports = router;
module.exports.createAndEmitNotification = createAndEmitNotification;
module.exports.STATUS_TO_TYPE   = STATUS_TO_TYPE;
module.exports.STATUS_MESSAGES  = STATUS_MESSAGES;
module.exports.NOTIFICATION_META = NOTIFICATION_META;