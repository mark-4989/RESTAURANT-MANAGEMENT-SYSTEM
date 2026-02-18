// backend/src/controllers/qrCodeController.js
const {
  generateTableQRCode,
  generateMultipleTableQRCodes,
  generatePrintableQRPage
} = require('../utils/qrCodeGenerator');

const CUSTOMER_APP_URL = process.env.QR_CODE_BASE_URL || 'https://restaurant-management-system-zeta-ivory.vercel.app';

/**
 * Generate QR code for a single table
 */
exports.generateSingleQR = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    console.log('📱 Generating QR code for table:', tableNumber);

    const qrCode = await generateTableQRCode(tableNumber, CUSTOMER_APP_URL);

    res.status(200).json({
      success: true,
      data: qrCode,
      message: `QR code generated for table ${tableNumber}`
    });

  } catch (error) {
    console.error('❌ Generate single QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error.message
    });
  }
};

/**
 * Generate QR codes for multiple tables
 */
exports.generateMultipleQR = async (req, res) => {
  try {
    const { startTable, endTable } = req.body;

    if (!startTable || !endTable) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startTable and endTable'
      });
    }

    if (parseInt(endTable) < parseInt(startTable)) {
      return res.status(400).json({
        success: false,
        message: 'endTable must be greater than or equal to startTable'
      });
    }

    console.log(`📱 Generating QR codes for tables ${startTable} to ${endTable}`);

    const result = await generateMultipleTableQRCodes(
      parseInt(startTable),
      parseInt(endTable),
      CUSTOMER_APP_URL
    );

    res.status(200).json({
      success: true,
      data: result,
      message: `Generated ${result.count} QR codes`
    });

  } catch (error) {
    console.error('❌ Generate multiple QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR codes',
      error: error.message
    });
  }
};

/**
 * Generate printable QR code page
 */
exports.getPrintableQR = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    console.log('🖨️ Generating printable QR page for table:', tableNumber);

    const html = await generatePrintableQRPage(tableNumber, CUSTOMER_APP_URL);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('❌ Generate printable QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate printable QR page',
      error: error.message
    });
  }
};

/**
 * Download all table QR codes as ZIP (placeholder)
 */
exports.downloadAllQRCodes = async (req, res) => {
  try {
    // TODO: Implement ZIP generation with archiver or jszip
    res.status(200).json({
      success: true,
      message: 'ZIP download functionality coming soon!'
    });

  } catch (error) {
    console.error('❌ Download QR codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download QR codes'
    });
  }
};