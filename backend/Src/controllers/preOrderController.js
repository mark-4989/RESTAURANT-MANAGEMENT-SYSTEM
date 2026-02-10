// backend/src/controllers/preOrderController.js
const PreOrder = require('../models/PreOrder');

/**
 * Create a new pre-order
 */
exports.createPreOrder = async (req, res) => {
  try {
    console.log('📥 Creating pre-order:', req.body);
    
    const preOrder = await PreOrder.create(req.body);
    
    console.log('✅ Pre-order created:', preOrder._id);
    
    res.status(201).json({
      success: true,
      message: 'Pre-order scheduled successfully',
      preOrder
    });
  } catch (error) {
    console.error('❌ Error creating pre-order:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all pre-orders
 */
exports.getAllPreOrders = async (req, res) => {
  try {
    const { status, type, date } = req.query;
    let query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }
    
    const preOrders = await PreOrder.find(query)
      .sort({ date: 1, time: 1 })
      .populate('orderItems.menuItem');
    
    res.json({
      success: true,
      count: preOrders.length,
      preOrders
    });
  } catch (error) {
    console.error('❌ Error fetching pre-orders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get a single pre-order by ID
 */
exports.getPreOrder = async (req, res) => {
  try {
    const preOrder = await PreOrder.findById(req.params.id)
      .populate('orderItems.menuItem');
    
    if (!preOrder) {
      return res.status(404).json({
        success: false,
        message: 'Pre-order not found'
      });
    }
    
    res.json({
      success: true,
      preOrder
    });
  } catch (error) {
    console.error('❌ Error fetching pre-order:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update pre-order status
 */
exports.updatePreOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const preOrder = await PreOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!preOrder) {
      return res.status(404).json({
        success: false,
        message: 'Pre-order not found'
      });
    }
    
    console.log(`✅ Pre-order ${id} status updated to: ${status}`);
    
    res.json({
      success: true,
      message: 'Pre-order status updated',
      preOrder
    });
  } catch (error) {
    console.error('❌ Error updating pre-order status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update pre-order (add items, etc.)
 */
exports.updatePreOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const preOrder = await PreOrder.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!preOrder) {
      return res.status(404).json({
        success: false,
        message: 'Pre-order not found'
      });
    }
    
    console.log(`✅ Pre-order ${id} updated`);
    
    res.json({
      success: true,
      message: 'Pre-order updated successfully',
      preOrder
    });
  } catch (error) {
    console.error('❌ Error updating pre-order:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a pre-order
 */
exports.deletePreOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const preOrder = await PreOrder.findByIdAndDelete(id);
    
    if (!preOrder) {
      return res.status(404).json({
        success: false,
        message: 'Pre-order not found'
      });
    }
    
    console.log(`✅ Pre-order ${id} deleted`);
    
    res.json({
      success: true,
      message: 'Pre-order cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting pre-order:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};