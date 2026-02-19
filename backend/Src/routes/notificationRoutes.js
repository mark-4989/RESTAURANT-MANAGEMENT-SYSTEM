// server/routes/notificationRoutes.js — COMPLETE FILE
const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');

// ── Notification metadata (emoji + colour per type) ───────────────────────────
const NOTIFICATION_META = {
  ORDER_PLACED:    { emoji: '🧾', color: '#3b82f6', label: 'Order Placed'       },
  ORDER_CONFIRMED: { emoji: '✅', color: '#10b981', label: 'Order Confirmed'     },
  PREPARING:       { emoji: '🔥', color: '#f59e0b', label: 'Being Prepared'      },
  READY:           { emoji: '🍽️', color: '#8b5cf6', label: 'Ready!'             },
  ON_THE_WAY:      { emoji: '🚚', color: '#06b6d4', label: 'On the Way'         },
  DELIVERED:       { emoji: '🏠', color: '#10b981', label: 'Delivered'          },
  PAYMENT_SUCCESS: { emoji: '💳', color: '#10b981', label: 'Payment Confirmed'  },
  PAYMENT_FAILED:  { emoji: '❌', color: '#ef4444', label: 'Payment Failed'     },
  CANCELLED:       { emoji: '🚫', color: '#ef4444', label: 'Order Cancelled'    },
  CHEF_MESSAGE:    { emoji: '👨‍🍳', color: '#dc2626', label: 'Message from Chef'  },
  PROMO:           { emoji: '🎉', color: '#f59e0b', label: 'Special Offer'      },
};

// ── Map order status → notification type ─────────────────────────────────────
const STATUS_TO_TYPE = {
  pending:    'ORDER_PLACED',
  confirmed:  'ORDER_CONFIRMED',
  preparing:  'PREPARING',
  ready:      'READY',
  on_the_way: 'ON_THE_WAY',
  delivered:  'DELIVERED',
  completed:  'DELIVERED',
  cancelled:  'CANCELLED',
};

// ── Warm, order-type-aware message generators ─────────────────────────────────
const STATUS_MESSAGES = {
  pending: (num, orderType) => {
    const map = {
      delivery:  `Your delivery order #${num} is confirmed! 🎉 We're getting everything ready for you.`,
      pickup:    `Your pickup order #${num} is in! 🎉 We'll let you know the moment it's ready to collect.`,
      'dine-in': `Welcome! Your dine-in order #${num} has been placed. Sit back and relax! 🍽️`,
      preorder:  `Your pre-order #${num} is booked! We'll have everything perfect for you. 📅`,
    };
    return map[orderType] || `Your order #${num} has been placed! We're on it. 🧾`;
  },
  confirmed: (num, orderType) => {
    const map = {
      delivery:  `Great news! Your delivery order #${num} has been confirmed and is queued for the kitchen. 🙌`,
      pickup:    `Your pickup order #${num} is confirmed! We'll notify you when it's ready to collect.`,
      'dine-in': `Your dine-in order #${num} is confirmed! Our team is on it — sit tight. 😊`,
      preorder:  `Your pre-order #${num} is confirmed! We'll start preparing it at the right time. ⏰`,
    };
    return map[orderType] || `Your order #${num} has been confirmed and sent to the kitchen! 🙌`;
  },
  preparing: (num) =>
    `Our chef is now preparing your order #${num} with love and care. 🔥 It smells amazing already!`,
  ready: (num, orderType) => {
    const map = {
      delivery:  `Your order #${num} is packed and ready — the driver will pick it up shortly! 🚚`,
      pickup:    `Your order #${num} is hot and ready for pickup! Come grab it while it's fresh. 🍽️`,
      'dine-in': `Your order #${num} is on its way to your table right now! Enjoy every bite. 🍽️`,
      preorder:  `Your pre-order #${num} is ready! Please collect it or it will be delivered shortly. 🎉`,
    };
    return map[orderType] || `Your order #${num} is ready! 🍽️`;
  },
  on_the_way: (num) =>
    `Your order #${num} is on its way — the driver is heading to you right now! 🚚 Track it live on the app.`,
  delivered: (num) =>
    `Your order #${num} has arrived! We hope you enjoy every bite. Bon appétit! 🏠❤️`,
  completed: (num) =>
    `Your order #${num} is complete. Thank you for dining with us — it was a pleasure! ⭐`,
  cancelled: (num) =>
    `Your order #${num} has been cancelled. We're sorry for the inconvenience. Please contact us if you need help. 💙`,
};

// ── Helper: resolve message string ────────────────────────────────────────────
const getMessage = (key, num, orderType) => {
  const fn = STATUS_MESSAGES[key];
  if (!fn) return `Update on your order #${num}`;
  return typeof fn === 'function' ? fn(num, orderType) : fn;
};

// ── Core: save to DB + emit via Socket.IO to specific customer ───────────────
const createAndEmitNotification = async (io, { userId, type, orderId, orderNumber, message, orderType }) => {
  try {
    if (!userId) {
      console.log('[Notif] no userId — skipping');
      return null;
    }

    // Save notification to MongoDB
    const notif = await Notification.create({
      userId,
      type,
      orderId:     orderId     || null,
      orderNumber: orderNumber || null,
      orderType:   orderType   || null,   // ← was missing before — caused silent drop
      message,
    });

    const meta    = NOTIFICATION_META[type] || {};
    const payload = {
      ...notif.toObject(),
      emoji: meta.emoji,
      color: meta.color,
      label: meta.label,
    };

    // Push real-time to the customer's private room
    if (io) {
      io.to(`customer_${userId}`).emit('new_notification', payload);
      console.log(`[Notif] ✅ Emitted → customer_${userId} | ${type} | #${orderNumber}`);
    } else {
      console.warn('[Notif] ⚠️  io is null — saved to DB but not pushed via socket');
    }

    return notif;
  } catch (err) {
    console.error('[Notif] create/emit error:', err.message);
    return null;
  }
};

// =============================================================================
// HTTP ROUTES
// =============================================================================

// GET /api/notifications/:userId
router.get('/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/read-all/:userId
router.patch('/read-all/:userId', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId }, { read: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/clear/:userId
router.delete('/clear/:userId', async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.params.userId });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
});

// POST /api/notifications/chef-message
router.post('/chef-message', async (req, res) => {
  try {
    const { userId, orderId, orderNumber, orderType, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ success: false, message: 'userId and message are required' });
    }
    const io   = req.app.get('io');
    const notif = await createAndEmitNotification(io, {
      userId, type: 'CHEF_MESSAGE', orderId, orderNumber, orderType,
      message: message || `The chef has a message about order #${orderNumber}. 👨‍🍳`,
    });
    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send chef message' });
  }
});

// POST /api/notifications/test/:userId  ← use this to verify end-to-end in browser
router.post('/test/:userId', async (req, res) => {
  try {
    const io = req.app.get('io');
    const { userId } = req.params;
    const payload = {
      _id: 'test_' + Date.now(), userId,
      type: 'ORDER_CONFIRMED',
      message: '🧪 Test notification! Real-time notifications are working.',
      emoji: '🧪', color: '#10b981', label: 'Test',
      read: false, createdAt: new Date().toISOString(),
    };
    if (io) {
      io.to(`customer_${userId}`).emit('new_notification', payload);
      res.json({ success: true, message: `Sent to customer_${userId}` });
    } else {
      res.status(500).json({ success: false, message: 'Socket.IO not available' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = router;
// Named function exports (destructured by orderRoutes.js and orderController.js)
module.exports.createAndEmitNotification = createAndEmitNotification;
module.exports.STATUS_TO_TYPE            = STATUS_TO_TYPE;
module.exports.STATUS_MESSAGES           = STATUS_MESSAGES;
module.exports.getMessage                = getMessage;
module.exports.NOTIFICATION_META         = NOTIFICATION_META;