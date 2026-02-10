// backend/src/utils/receiptGenerator.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a receipt PDF for an order
 */
const generateReceipt = (order, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header - Restaurant Logo/Name
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .text('DineSmart Restaurant', { align: 'center' })
         .moveDown(0.3);

      doc.fontSize(12)
         .font('Helvetica')
         .text('123 Main Street, Nairobi, Kenya', { align: 'center' })
         .text('Tel: +254 712 345 678', { align: 'center' })
         .text('Email: info@dinesmart.co.ke', { align: 'center' })
         .moveDown(1);

      // Line separator
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke()
         .moveDown(1);

      // Receipt Title
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('ORDER RECEIPT', { align: 'center' })
         .moveDown(1);

      // Order Information
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`Order Number: ${order.orderNumber}`, 50)
         .font('Helvetica')
         .text(`Date: ${new Date(order.createdAt).toLocaleString('en-KE')}`)
         .text(`Table: ${order.tableNumber}`)
         .text(`Customer: ${order.customerName}`)
         .text(`Status: ${order.status.toUpperCase()}`)
         .moveDown(1);

      // Line separator
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke()
         .moveDown(1);

      // Order Items Header
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('ORDER ITEMS', 50)
         .moveDown(0.5);

      // Table headers
      const tableTop = doc.y;
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Item', 50, tableTop)
         .text('Qty', 350, tableTop, { width: 50, align: 'center' })
         .text('Price', 420, tableTop, { width: 60, align: 'right' })
         .text('Total', 500, tableTop, { width: 60, align: 'right' });

      // Line under headers
      doc.moveTo(50, doc.y + 5)
         .lineTo(550, doc.y + 5)
         .stroke();

      let yPosition = doc.y + 15;

      // Order Items
      doc.font('Helvetica');
      order.items.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(10)
           .text(item.name, 50, yPosition, { width: 280 })
           .text(item.quantity.toString(), 350, yPosition, { width: 50, align: 'center' })
           .text(`KSh ${item.price.toLocaleString()}`, 420, yPosition, { width: 60, align: 'right' })
           .text(`KSh ${itemTotal.toLocaleString()}`, 500, yPosition, { width: 60, align: 'right' });

        yPosition += 25;
      });

      // Line before totals
      doc.moveTo(50, yPosition)
         .lineTo(550, yPosition)
         .stroke();

      yPosition += 15;

      // Pricing Summary
      doc.fontSize(11)
         .font('Helvetica')
         .text('Subtotal:', 400, yPosition)
         .text(`KSh ${order.subtotal.toLocaleString()}`, 500, yPosition, { width: 60, align: 'right' });

      yPosition += 20;

      doc.text('Tax (16%):', 400, yPosition)
         .text(`KSh ${order.tax.toLocaleString()}`, 500, yPosition, { width: 60, align: 'right' });

      yPosition += 25;

      // Total with background
      doc.rect(380, yPosition - 5, 180, 30)
         .fill('#667eea');

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('white')
         .text('TOTAL:', 400, yPosition)
         .text(`KSh ${order.total.toLocaleString()}`, 500, yPosition, { width: 60, align: 'right' });

      // Reset color
      doc.fillColor('black');
      yPosition += 40;

      // Payment Status
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 50, yPosition);

      yPosition += 30;

      // Footer
      doc.moveDown(2)
         .fontSize(10)
         .font('Helvetica-Italic')
         .text('Thank you for dining with us!', { align: 'center' })
         .moveDown(0.5)
         .fontSize(9)
         .text('Visit us again at DineSmart Restaurant', { align: 'center' })
         .text('www.dinesmart.co.ke', { align: 'center' });

      // QR Code placeholder (you can add actual QR code generation here)
      doc.moveDown(1)
         .fontSize(8)
         .text(`Receipt ID: ${order._id}`, { align: 'center' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate receipt and return as buffer (for sending via API)
 */
const generateReceiptBuffer = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      doc.on('error', reject);

      // Same content as above (copy the content generation code)
      // Header
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .text('DineSmart Restaurant', { align: 'center' })
         .moveDown(0.3);

      doc.fontSize(12)
         .font('Helvetica')
         .text('123 Main Street, Nairobi, Kenya', { align: 'center' })
         .text('Tel: +254 712 345 678', { align: 'center' })
         .text('Email: info@dinesmart.co.ke', { align: 'center' })
         .moveDown(1);

      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1);

      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('ORDER RECEIPT', { align: 'center' })
         .moveDown(1);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`Order Number: ${order.orderNumber}`, 50)
         .font('Helvetica')
         .text(`Date: ${new Date(order.createdAt).toLocaleString('en-KE')}`)
         .text(`Table: ${order.tableNumber}`)
         .text(`Customer: ${order.customerName}`)
         .text(`Status: ${order.status.toUpperCase()}`)
         .moveDown(1);

      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1);

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('ORDER ITEMS', 50)
         .moveDown(0.5);

      const tableTop = doc.y;
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text('Item', 50, tableTop)
         .text('Qty', 350, tableTop, { width: 50, align: 'center' })
         .text('Price', 420, tableTop, { width: 60, align: 'right' })
         .text('Total', 500, tableTop, { width: 60, align: 'right' });

      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();

      let yPosition = doc.y + 15;
      doc.font('Helvetica');

      order.items.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        doc.fontSize(10)
           .text(item.name, 50, yPosition, { width: 280 })
           .text(item.quantity.toString(), 350, yPosition, { width: 50, align: 'center' })
           .text(`KSh ${item.price.toLocaleString()}`, 420, yPosition, { width: 60, align: 'right' })
           .text(`KSh ${itemTotal.toLocaleString()}`, 500, yPosition, { width: 60, align: 'right' });
        yPosition += 25;
      });

      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 15;

      doc.fontSize(11)
         .font('Helvetica')
         .text('Subtotal:', 400, yPosition)
         .text(`KSh ${order.subtotal.toLocaleString()}`, 500, yPosition, { width: 60, align: 'right' });
      yPosition += 20;

      doc.text('Tax (16%):', 400, yPosition)
         .text(`KSh ${order.tax.toLocaleString()}`, 500, yPosition, { width: 60, align: 'right' });
      yPosition += 25;

      doc.rect(380, yPosition - 5, 180, 30).fill('#667eea');
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('white')
         .text('TOTAL:', 400, yPosition)
         .text(`KSh ${order.total.toLocaleString()}`, 500, yPosition, { width: 60, align: 'right' });

      doc.fillColor('black');
      yPosition += 40;

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 50, yPosition);

      doc.moveDown(2)
         .fontSize(10)
         .font('Helvetica-Italic')
         .text('Thank you for dining with us!', { align: 'center' })
         .moveDown(0.5)
         .fontSize(9)
         .text('Visit us again at DineSmart Restaurant', { align: 'center' })
         .text('www.dinesmart.co.ke', { align: 'center' });

      doc.moveDown(1)
         .fontSize(8)
         .text(`Receipt ID: ${order._id}`, { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateReceipt,
  generateReceiptBuffer
};