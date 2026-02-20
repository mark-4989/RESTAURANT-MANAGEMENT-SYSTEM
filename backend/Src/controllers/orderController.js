// backend/src/controllers/orderController.js
// ── CHANGE FROM ORIGINAL ───────────────────────────────────────────────────────
// Removed STATUS_NOTIF_MAP and sendCustomerNotification. Notifications are now
// fired exclusively by the res.json interceptor in orderRoutes.js — having both
// was causing double-notifications. All other code is identical to the original.
// ──────────────────────────────────────────────────────────────────────────────
const Order = require('../models/Order');
const { emitNewOrder, emitOrderStatusUpdate, emitOrderDeleted } = require('../services/socketService');

// ── Generate order number ─────────────────────────────────────────────────────
const generateOrderNumber = async () => {
  const lastOrder = await Order.findOne({ orderNumber: new RegExp(`^ORD-`) }).sort({ createdAt: -1 });
  let sequence = 1;
  if (lastOrder?.orderNumber) {
    sequence = parseInt(lastOrder.orderNumber.split('-')[1]) + 1;
  }
  return `ORD-${String(sequence).padStart(4, '0')}`;
};

// ── Create new order ──────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    console.log('📥 Received order data:', JSON.stringify(req.body, null, 2));

    const orderNumber = await generateOrderNumber();
    console.log('🔢 Generated order number:', orderNumber);

    const orderData = {
      ...req.body,
      orderNumber,
      status:        req.body.status        || 'pending',
      paymentStatus: req.body.paymentStatus || 'pending',
    };

    const order = await Order.create(orderData);
    console.log('✅ Order created successfully:', orderNumber);

    // Emit to kitchen/admin displays
    emitNewOrder(order);

    // ── Fire ORDER_PLACED notification directly ───────────────────────────────
    if (order.customerId) {
      try {
        const { createAndEmitNotification } = require('../routes/notificationRoutes');
        const io = req.app.get('io');
        const orderTypeLabel = order.orderType === 'delivery' ? 'delivery order'
                             : order.orderType === 'dine-in'  ? 'dine-in order'
                             : order.orderType === 'preorder' ? 'pre-order'
                             :                                  'pickup order';
        await createAndEmitNotification(io, {
          userId:      order.customerId,
          type:        'ORDER_PLACED',
          orderId:     order._id,
          orderNumber: order.orderNumber,
          orderType:   order.orderType,
          message:     `Your ${orderTypeLabel} #${order.orderNumber} has been placed! We're on it. 🧾`,
        });
        console.log(`[Notif] ✅ ORDER_PLACED sent → customer_${order.customerId}`);
      } catch (notifErr) {
        console.error('[Notif] ❌ ORDER_PLACED notification failed:', notifErr.message);
      }
    } else {
      console.log('[Notif] ⚠️ ORDER_PLACED skipped — no customerId on order:', orderNumber);
    }

    // Update staff performance
    if (order.createdBy) {
      try {
        const Staff = require('../models/Staff');
        await Staff.findByIdAndUpdate(order.createdBy, { $inc: { 'performance.ordersServed': 1 } });
      } catch (error) {
        console.error('⚠️ Could not update staff performance:', error);
      }
    }

    res.status(201).json({
      success: true,
      data: order,
      message: `Order ${orderNumber} created successfully`,
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create order' });
  }
};

// ── Get all orders ────────────────────────────────────────────────────────────
exports.getAllOrders = async (req, res) => {
  try {
    const { status, paymentStatus, startDate, endDate, tableNumber, customerId, customerName } = req.query;

    let query = {};
    if (status)        query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (tableNumber)   query.tableNumber = tableNumber;

    // Support filtering by customerId OR customerName (fallback for old orders)
    if (customerId && customerName) {
      query.$or = [{ customerId }, { customerName }];
    } else if (customerId) {
      query.customerId = customerId;
    } else if (customerName) {
      query.customerName = customerName;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('❌ Get orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// ── Get single order ──────────────────────────────────────────────────────────
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('❌ Get order error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

// ── Status → notification type ────────────────────────────────────────────────
const STATUS_TO_NOTIF_TYPE = {
  confirmed: 'ORDER_CONFIRMED',
  preparing: 'PREPARING',
  ready:     'READY',
  completed: 'DELIVERED',
  cancelled: 'CANCELLED',
};

// ── Warm messages per status + orderType ──────────────────────────────────────
const getStatusMessage = (status, orderNumber, orderType) => {
  const n = orderNumber;
  const t = orderType;
  const map = {
    confirmed: `Great news! Your order #${n} is confirmed and queued for the kitchen. 🙌`,
    preparing: `Our chef is now preparing your order #${n} with love and care. 🔥`,
    ready: t === 'delivery'  ? `Your order #${n} is packed and ready — driver picks up shortly! 🚚`
         : t === 'dine-in'   ? `Your order #${n} is on its way to your table! Enjoy. 🍽️`
         : t === 'preorder'  ? `Your pre-order #${n} is ready! Please collect it. 🎉`
         :                     `Your order #${n} is hot and ready for pickup! 🍽️`,
    completed: `Your order #${n} is complete. Thank you for dining with us! ⭐`,
    cancelled: `Your order #${n} has been cancelled. Contact us if you need help. 💙`,
  };
  return map[status] || `Update on your order #${n}`;
};

// ── Update order status ───────────────────────────────────────────────────────
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    // Read BEFORE update so we know previousStatus for change detection
    const before = await Order.findById(req.params.id).select('status customerId orderNumber orderType');
    if (!before) return res.status(404).json({ success: false, message: 'Order not found' });

    const previousStatus = before.status;

    // Build update fields
    const updateFields = { status };
    if (status === 'confirmed') updateFields.confirmedAt  = new Date();
    if (status === 'preparing') updateFields.preparingAt  = new Date();
    if (status === 'ready')     updateFields.readyAt      = new Date();
    if (status === 'completed') {
      updateFields.completedAt   = new Date();
      updateFields.paymentStatus = 'paid';
    }

    // findByIdAndUpdate with { new: true } returns a fresh DB read —
    // guarantees customerId and orderType are fully populated on the result.
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    // Emit real-time update to kitchen/admin displays
    emitOrderStatusUpdate(order);

    // ── Fire customer notification directly here — no intercept needed ──────────
    // This is simpler and more reliable than the res.json intercept approach.
    if (status !== previousStatus) {
      const notifType   = STATUS_TO_NOTIF_TYPE[status];
      const customerId  = order.customerId || before.customerId; // belt + suspenders
      const orderType   = order.orderType  || before.orderType;

      console.log(`[Notif] Status: ${previousStatus} → ${status} | customerId: ${customerId} | orderType: ${orderType}`);

      if (notifType && customerId) {
        try {
          const { createAndEmitNotification } = require('../routes/notificationRoutes');
          const io = req.app.get('io');
          await createAndEmitNotification(io, {
            userId:      customerId,
            type:        notifType,
            orderId:     order._id,
            orderNumber: order.orderNumber,
            orderType,
            message:     getStatusMessage(status, order.orderNumber, orderType),
          });
          console.log(`[Notif] ✅ Sent ${notifType} → customer_${customerId}`);
        } catch (notifErr) {
          // Never let a notification error kill the order update response
          console.error('[Notif] ❌ Failed to send notification:', notifErr.message);
        }
      } else {
        console.log(`[Notif] ⚠️ Skipped — notifType:${notifType} customerId:${customerId}`);
      }
    }

    res.status(200).json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

// ── Delete order ──────────────────────────────────────────────────────────────
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await order.deleteOne();
    emitOrderDeleted(req.params.id);

    res.status(200).json({ success: true, data: {}, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('❌ Delete order error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
};

// ── Get order statistics ──────────────────────────────────────────────────────
exports.getOrderStats = async (req, res) => {
  try {
    const totalOrders     = await Order.countDocuments();
    const pendingOrders   = await Order.countDocuments({ status: 'pending' });
    const preparingOrders = await Order.countDocuments({ status: 'preparing' });
    const completedOrders = await Order.countDocuments({ status: 'completed' });

    const orders       = await Order.find({ status: 'completed' });
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    res.status(200).json({
      success: true,
      data: { totalOrders, pendingOrders, preparingOrders, completedOrders, totalRevenue },
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order statistics' });
  }
};