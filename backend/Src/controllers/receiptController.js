// backend/src/controllers/receiptController.js
const Order = require('../models/Order');
const { generateReceiptBuffer } = require('../utils/receiptGenerator');

/**
 * Generate and download receipt for an order
 */
exports.generateReceipt = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('📄 Generating receipt for order:', order.orderNumber);

    // Generate PDF buffer
    const pdfBuffer = await generateReceiptBuffer(order);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${order.orderNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

    console.log('✅ Receipt generated successfully');

  } catch (error) {
    console.error('❌ Generate receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt',
      error: error.message
    });
  }
};

/**
 * Email receipt to customer (placeholder for future)
 */
exports.emailReceipt = async (req, res) => {
  try {
    const { orderId, email } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // TODO: Implement email sending with Nodemailer
    console.log(`📧 Would send receipt to: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Receipt email functionality coming soon!',
      data: { orderId, email }
    });

  } catch (error) {
    console.error('❌ Email receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to email receipt'
    });
  }
};