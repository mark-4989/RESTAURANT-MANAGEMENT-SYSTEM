// backend/src/controllers/orderController.js
const Order = require('../models/Order');
const { emitNewOrder, emitOrderStatusUpdate, emitOrderDeleted } = require('../services/socketService');

// Map order status → notification type + warm message per order type
const STATUS_NOTIF_MAP = {
  confirmed: {
    type: 'ORDER_CONFIRMED',
    msg: (num, orderType) => {
      const map = {
        delivery:  `Great news! Your delivery order #${num} is confirmed and queued for the kitchen. 🙌`,
        pickup:    `Your pickup order #${num} is confirmed! We'll let you know when it's ready to collect. 🙌`,
        'dine-in': `Your dine-in order #${num} is confirmed! Our team is on it — sit tight. 😊`,
        preorder:  `Your pre-order #${num} is confirmed! We'll start preparing it at the right time. ⏰`,
      };
      return map[orderType] || `Your order #${num} has been confirmed! 🙌`;
    },
  },
  preparing: {
    type: 'PREPARING',
    msg: (num) =>
      `Our chef is now preparing your order #${num} with love and care. 🔥 It smells amazing already!`,
  },
  ready: {
    type: 'READY',
    msg: (num, orderType) => {
      const map = {
        delivery:  `Your order #${num} is packed and ready — the driver will pick it up shortly! 🚚`,
        pickup:    `Your order #${num} is hot and ready for pickup! Come grab it while it's fresh. 🍽️`,
        'dine-in': `Your order #${num} is on its way to your table right now! Enjoy every bite. 🍽️`,
        preorder:  `Your pre-order #${num} is ready! Please collect it or it will be delivered shortly. 🎉`,
      };
      return map[orderType] || `Your order #${num} is ready! 🍽️`;
    },
  },
  completed: {
    type: 'DELIVERED',
    msg: (num) =>
      `Your order #${num} is complete. Thank you for dining with us — it was a pleasure! ⭐ See you again soon.`,
  },
  cancelled: {
    type: 'CANCELLED',
    msg: (num) =>
      `Your order #${num} has been cancelled. We're sorry for the inconvenience. Please contact us if you need help. 💙`,
  },
};

// Core: save notification to DB and push via socket to the specific customer
const sendCustomerNotification = async (app, order, notifType, message) => {
  try {
    // Lazy-load to avoid circular require
    const { createAndEmitNotification } = require('../routes/notificationRoutes');

    const customerId = order.customerId;

    if (!customerId) {
      // This happens for orders placed before customerId was added to the schema.
      // New orders from the customer app will always have it going forward.
      console.log(`[Notif] ⚠️  No customerId on order ${order.orderNumber} — notification skipped.`);
      console.log(`[Notif] ℹ️  Place a fresh order via the customer app to test notifications.`);
      return;
    }

    const io = app ? app.get('io') : null;
    await createAndEmitNotification(io, {
      userId:      customerId,
      type:        notifType,
      orderId:     order._id,
      orderNumber: order.orderNumber,
      orderType:   order.orderType,
      message,
    });

    console.log(`[Notif] ✅ Sent ${notifType} → customer_${customerId} (${order.orderNumber})`);
  } catch (err) {
    console.error(`[Notif] ❌ Failed to send ${notifType}:`, err.message);
  }
};

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

    // Notify customer: ORDER_PLACED
    const placedMsg = (() => {
      const num = order.orderNumber;
      const map = {
        delivery:  `Your delivery order #${num} is in! 🎉 We're getting everything ready for you.`,
        pickup:    `Your pickup order #${num} is in! 🎉 We'll notify you the moment it's ready to collect.`,
        'dine-in': `Welcome! Your dine-in order #${num} has been placed. Sit back and relax! 🍽️`,
        preorder:  `Your pre-order #${num} is booked! We'll have everything perfect for you. 📅`,
      };
      return map[order.orderType] || `Your order #${num} has been placed! We're on it. 🧾`;
    })();
    sendCustomerNotification(req.app, order, 'ORDER_PLACED', placedMsg).catch(() => {});

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

// ── Update order status ───────────────────────────────────────────────────────
// This is called by: KitchenDisplay "Start Cooking" / "Mark Ready" / "Bump"
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const previousStatus = order.status;
    order.status = status;

    // Record timestamps
    if (status === 'confirmed')  order.confirmedAt  = new Date();
    if (status === 'preparing')  order.preparingAt  = new Date();
    if (status === 'ready')      order.readyAt      = new Date();
    if (status === 'completed') {
      order.completedAt   = new Date();
      order.paymentStatus = 'paid';
    }

    await order.save();

    // Emit real-time update to kitchen/admin displays
    emitOrderStatusUpdate(order);

    // ── Fire customer notification if status actually changed ─────────────────
    if (status !== previousStatus) {
      const notifEntry = STATUS_NOTIF_MAP[status];
      if (notifEntry) {
        const message = notifEntry.msg(order.orderNumber, order.orderType);
        // Non-blocking — response returns immediately, notification happens async
        sendCustomerNotification(req.app, order, notifEntry.type, message).catch(() => {});
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