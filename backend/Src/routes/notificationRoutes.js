// backend/src/routes/notificationRoutes.js — COMPLETE FILE
const express = require('express');
const router  = express.Router();
const Notification = require('../models/Notification');
const { getIo } = require('../services/socketService');

// ── Status → notification type map ────────────────────────────────────────────
const STATUS_TO_TYPE = {
  pending:   'ORDER_PLACED',
  confirmed: 'ORDER_CONFIRMED',
  preparing: 'PREPARING',
  ready:     'READY',
  completed: 'DELIVERED',
  cancelled: 'CANCELLED',
};

// ── Warm, context-aware messages per status and order type ────────────────────
const getMessage = (status, orderNumber, orderType = 'pickup') => {
  const n = orderNumber;
  const map = {
    pending: {
      delivery:  `Your delivery order #${n} is in! 🎉 We're getting everything ready for you.`,
      pickup:    `Your pickup order #${n} is in! 🎉 We'll notify you the moment it's ready to collect.`,
      'dine-in': `Welcome! Your dine-in order #${n} has been placed. Sit back and relax! 🍽️`,
      preorder:  `Your pre-order #${n} is booked! We'll have everything perfect for you. 📅`,
      default:   `Your order #${n} has been placed! We're on it. 🧾`,
    },
    confirmed: {
      delivery:  `Great news! Your delivery order #${n} is confirmed and queued for the kitchen. 🙌`,
      pickup:    `Your pickup order #${n} is confirmed! We'll let you know when it's ready to collect. 🙌`,
      'dine-in': `Your dine-in order #${n} is confirmed! Our team is on it — sit tight. 😊`,
      preorder:  `Your pre-order #${n} is confirmed! We'll start preparing it at the right time. ⏰`,
      default:   `Your order #${n} has been confirmed! 🙌`,
    },
    preparing: {
      default: `Our chef is now preparing your order #${n} with love and care. 🔥 It smells amazing already!`,
    },
    ready: {
      delivery:  `Your order #${n} is packed and ready — the driver will pick it up shortly! 🚚`,
      pickup:    `Your order #${n} is hot and ready for pickup! Come grab it while it's fresh. 🍽️`,
      'dine-in': `Your order #${n} is on its way to your table right now! Enjoy every bite. 🍽️`,
      preorder:  `Your pre-order #${n} is ready! Please collect it or it will be delivered shortly. 🎉`,
      default:   `Your order #${n} is ready! 🍽️`,
    },
    completed: {
      default: `Your order #${n} is complete. Thank you for dining with us — it was a pleasure! ⭐ See you again soon.`,
    },
    cancelled: {
      default: `Your order #${n} has been cancelled. We're sorry for the inconvenience. Please contact us if you need help. 💙`,
    },
  };

  const entry = map[status];
  if (!entry) return `Update on your order #${n}`;
  return entry[orderType] || entry.default || `Update on your order #${n}`;
};

// ── Core helper: save to DB + emit via socket ─────────────────────────────────
const createAndEmitNotification = async (io, { userId, type, orderId, orderNumber, orderType, message }) => {
  // Save to DB — orderType was missing before which caused incomplete records
  const notif = await Notification.create({
    userId,
    type,
    orderId,
    orderNumber,
    orderType,
    message,
    read: false,
  });

  // Use passed io, or fall back to the shared instance from socketService
  const _io = io || getIo();

  if (_io) {
    _io.to(`customer_${userId}`).emit('new_notification', notif.toObject());
    console.log(`[Notif] ✅ Emitted ${type} → customer_${userId} (${orderNumber})`);
  } else {
    console.warn('[Notif] ⚠️  io not available — notification saved to DB but not pushed via socket');
  }

  return notif;
};

// ── GET /api/notifications/:userId ────────────────────────────────────────────
router.get('/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('[Notif] GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────
router.patch('/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

// ── PATCH /api/notifications/read-all/:userId ─────────────────────────────────
router.patch('/read-all/:userId', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

// ── DELETE /api/notifications/clear/:userId ───────────────────────────────────
router.delete('/clear/:userId', async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.params.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
});

// ── POST /api/notifications/test/:userId ─────────────────────────────────────
router.post('/test/:userId', async (req, res) => {
  try {
    const io = req.app.get('io');
    const notif = await createAndEmitNotification(io, {
      userId:      req.params.userId,
      type:        'ORDER_PLACED',
      orderId:     null,          // ← was 'test_order_id' which failed ObjectId cast
      orderNumber: 'ORD-TEST',
      orderType:   'pickup',
      message:     '🧪 Test notification! If you see this, the full socket pipeline is working.',
    });
    res.json({ success: true, message: 'Test notification sent', data: notif });
  } catch (err) {
    console.error('[Notif] Test error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.createAndEmitNotification = createAndEmitNotification;
module.exports.STATUS_TO_TYPE  = STATUS_TO_TYPE;
module.exports.getMessage      = getMessage;