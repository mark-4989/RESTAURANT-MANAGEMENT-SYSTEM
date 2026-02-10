// backend/src/controllers/deliveryController.js
const Order = require('../models/Order');
const Driver = require('../models/Driver');
const { emitDeliveryUpdate } = require('../services/socketService');

// Assign driver to order
exports.assignDriver = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;
    
    const order = await Order.findById(orderId);
    const driver = await Driver.findById(driverId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (!driver.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Driver is not available'
      });
    }

    // Update order
    order.driver = driverId;
    order.driverAssignedAt = new Date();
    order.deliveryStatus = 'assigned';
    
    // Calculate estimated delivery time (30 mins default)
    order.estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000);
    
    await order.save();

    // Update driver
    driver.currentDelivery = orderId;
    driver.status = 'on-delivery';
    driver.isAvailable = false;
    driver.performance.totalDeliveries += 1;
    await driver.save();

    // Emit WebSocket event
    emitDeliveryUpdate({
      orderId: order._id,
      orderNumber: order.orderNumber,
      driverId: driver._id,
      driverName: driver.fullName,
      status: 'assigned'
    });

    res.status(200).json({
      success: true,
      data: { order, driver },
      message: `Driver ${driver.fullName} assigned to order ${order.orderNumber}`
    });
  } catch (error) {
    console.error('❌ Assign driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign driver'
    });
  }
};

// Auto-assign nearest available driver
exports.autoAssignDriver = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.orderType !== 'delivery') {
      return res.status(400).json({
        success: false,
        message: 'Order is not a delivery order'
      });
    }

    const [longitude, latitude] = order.deliveryAddress.coordinates.coordinates;
    
    // Find nearest available driver
    const nearbyDrivers = await Driver.findNearby(longitude, latitude, 10000); // 10km radius
    
    if (nearbyDrivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No available drivers nearby'
      });
    }

    const driver = nearbyDrivers[0]; // Get closest driver

    // Assign driver
    order.driver = driver._id;
    order.driverAssignedAt = new Date();
    order.deliveryStatus = 'assigned';
    order.estimatedDeliveryTime = new Date(Date.now() + 30 * 60 * 1000);
    await order.save();

    driver.currentDelivery = orderId;
    driver.status = 'on-delivery';
    driver.isAvailable = false;
    driver.performance.totalDeliveries += 1;
    await driver.save();

    // Emit WebSocket event
    emitDeliveryUpdate({
      orderId: order._id,
      orderNumber: order.orderNumber,
      driverId: driver._id,
      driverName: driver.fullName,
      status: 'assigned'
    });

    res.status(200).json({
      success: true,
      data: { order, driver },
      message: `Nearest driver ${driver.fullName} assigned automatically`
    });
  } catch (error) {
    console.error('❌ Auto-assign driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-assign driver'
    });
  }
};

// Driver accepts delivery
exports.acceptDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;
    
    const order = await Order.findById(orderId);
    const driver = await Driver.findById(driverId);
    
    if (!order || !driver) {
      return res.status(404).json({
        success: false,
        message: 'Order or driver not found'
      });
    }

    order.driverAcceptedAt = new Date();
    order.deliveryStatus = 'assigned';
    await order.save();

    res.status(200).json({
      success: true,
      data: order,
      message: 'Delivery accepted'
    });
  } catch (error) {
    console.error('❌ Accept delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept delivery'
    });
  }
};

// Update delivery status
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, driverId } = req.body;
    
    const order = await Order.findById(orderId).populate('driver');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const validStatuses = ['assigned', 'picked-up', 'on-the-way', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery status'
      });
    }

    order.updateDeliveryStatus(status);
    await order.save();

    // Update driver status if delivered
    if (status === 'delivered' && order.driver) {
      const driver = await Driver.findById(order.driver);
      if (driver) {
        driver.currentDelivery = null;
        driver.status = 'active';
        driver.isAvailable = true;
        driver.performance.completedDeliveries += 1;
        
        // Check if on time (within 5 mins of estimated time)
        const deliveryTime = new Date();
        const estimatedTime = new Date(order.estimatedDeliveryTime);
        const timeDiff = Math.abs(deliveryTime - estimatedTime) / 60000; // minutes
        
        if (timeDiff <= 5) {
          driver.performance.onTimeDeliveries += 1;
        }
        
        await driver.save();
      }
    }

    // Emit WebSocket event
    emitDeliveryUpdate({
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: status,
      driverLocation: order.driver?.currentLocation
    });

    res.status(200).json({
      success: true,
      data: order,
      message: `Delivery status updated to ${status}`
    });
  } catch (error) {
    console.error('❌ Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery status'
    });
  }
};

// Get active deliveries
exports.getActiveDeliveries = async (req, res) => {
  try {
    const deliveries = await Order.find({
      orderType: 'delivery',
      deliveryStatus: { $in: ['assigned', 'picked-up', 'on-the-way'] }
    })
    .populate('driver')
    .sort({ driverAssignedAt: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    console.error('❌ Get active deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active deliveries'
    });
  }
};

// Get driver's current delivery
exports.getDriverDelivery = async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const driver = await Driver.findById(driverId).populate('currentDelivery');
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      data: driver.currentDelivery
    });
  } catch (error) {
    console.error('❌ Get driver delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver delivery'
    });
  }
};

// Get delivery statistics
exports.getDeliveryStats = async (req, res) => {
  try {
    const totalDeliveries = await Order.countDocuments({ orderType: 'delivery' });
    const activeDeliveries = await Order.countDocuments({
      orderType: 'delivery',
      deliveryStatus: { $in: ['assigned', 'picked-up', 'on-the-way'] }
    });
    const completedDeliveries = await Order.countDocuments({
      orderType: 'delivery',
      deliveryStatus: 'delivered'
    });
    const cancelledDeliveries = await Order.countDocuments({
      orderType: 'delivery',
      deliveryStatus: 'cancelled'
    });

    // Calculate total delivery revenue
    const deliveryOrders = await Order.find({
      orderType: 'delivery',
      deliveryStatus: 'delivered'
    });
    
    const totalRevenue = deliveryOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalDeliveryFees = deliveryOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalDeliveries,
        activeDeliveries,
        completedDeliveries,
        cancelledDeliveries,
        totalRevenue,
        totalDeliveryFees
      }
    });
  } catch (error) {
    console.error('❌ Get delivery stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery statistics'
    });
  }
};