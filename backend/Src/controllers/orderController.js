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

    // NOTE: Customer ORDER_PLACED notification is handled by the res.json
    // interceptor in orderRoutes.js — no call needed here.

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

    // NOTE: Customer status notification is handled by the res.json interceptor
    // in orderRoutes.js — no call needed here.

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