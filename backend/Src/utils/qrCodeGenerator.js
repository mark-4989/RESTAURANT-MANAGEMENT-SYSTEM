// backend/src/utils/qrCodeGenerator.js
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Generate QR code for a table
 */
const generateTableQRCode = async (tableNumber, customerAppUrl = 'http://localhost:5173') => {
  try {
    // Create ordering URL with table number
    const orderUrl = `${customerAppUrl}?table=${tableNumber}`;

    // QR Code options
    const options = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 2,
      width: 500,
      color: {
        dark: '#667eea',
        light: '#ffffff'
      }
    };

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(orderUrl, options);

    return {
      tableNumber,
      orderUrl,
      qrCodeDataUrl,
      success: true
    };

  } catch (error) {
    console.error('❌ QR Code generation error:', error);
    throw error;
  }
};

/**
 * Generate QR codes for multiple tables
 */
const generateMultipleTableQRCodes = async (startTable, endTable, customerAppUrl) => {
  try {
    const qrCodes = [];

    for (let i = startTable; i <= endTable; i++) {
      const qrCode = await generateTableQRCode(i, customerAppUrl);
      qrCodes.push(qrCode);
    }

    return {
      success: true,
      count: qrCodes.length,
      qrCodes
    };

  } catch (error) {
    console.error('❌ Multiple QR code generation error:', error);
    throw error;
  }
};

/**
 * Save QR code to file
 */
const saveQRCodeToFile = async (tableNumber, outputDir = './qr-codes') => {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const customerAppUrl = process.env.CUSTOMER_APP_URL || 'http://localhost:5173';
    const orderUrl = `${customerAppUrl}?table=${tableNumber}`;

    const options = {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 1,
      margin: 2,
      width: 500,
      color: {
        dark: '#667eea',
        light: '#ffffff'
      }
    };

    const outputPath = path.join(outputDir, `table-${tableNumber}-qr.png`);
    await QRCode.toFile(outputPath, orderUrl, options);

    console.log(`✅ QR code saved: ${outputPath}`);

    return {
      success: true,
      tableNumber,
      filePath: outputPath,
      orderUrl
    };

  } catch (error) {
    console.error('❌ Save QR code error:', error);
    throw error;
  }
};

/**
 * Generate printable QR code page (HTML)
 */
const generatePrintableQRPage = async (tableNumber, customerAppUrl) => {
  try {
    const qrCode = await generateTableQRCode(tableNumber, customerAppUrl);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table ${tableNumber} - QR Code</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }
    .qr-container {
      background: white;
      border-radius: 30px;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 500px;
    }
    .restaurant-name {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 1rem;
    }
    .table-number {
      font-size: 3rem;
      font-weight: bold;
      color: #333;
      margin-bottom: 2rem;
    }
    .qr-code {
      margin: 2rem 0;
      padding: 1rem;
      background: white;
      border-radius: 20px;
      display: inline-block;
    }
    .qr-code img {
      width: 100%;
      max-width: 400px;
      height: auto;
      border-radius: 15px;
    }
    .instructions {
      font-size: 1.2rem;
      color: #666;
      margin-top: 2rem;
      line-height: 1.6;
    }
    .instructions strong {
      color: #667eea;
    }
    .footer {
      margin-top: 2rem;
      font-size: 0.9rem;
      color: #999;
    }
    @media print {
      body {
        background: white;
      }
      .qr-container {
        box-shadow: none;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="qr-container">
    <div class="restaurant-name">🍽️ DineSmart</div>
    <div class="table-number">Table ${tableNumber}</div>
    
    <div class="qr-code">
      <img src="${qrCode.qrCodeDataUrl}" alt="Table ${tableNumber} QR Code" />
    </div>
    
    <div class="instructions">
      <p><strong>📱 Scan to Order!</strong></p>
      <p>Point your camera at this QR code to view our menu and place your order directly from your phone.</p>
    </div>
    
    <div class="footer">
      <p>DineSmart Restaurant • Contactless Ordering</p>
    </div>
  </div>
</body>
</html>
    `;

    return html;

  } catch (error) {
    console.error('❌ Generate printable page error:', error);
    throw error;
  }
};

module.exports = {
  generateTableQRCode,
  generateMultipleTableQRCodes,
  saveQRCodeToFile,
  generatePrintableQRPage
};