// backend/src/routes/qrCodeRoutes.js
const express = require('express');
const router = express.Router();
const {
  generateSingleQR,
  generateMultipleQR,
  getPrintableQR,
  downloadAllQRCodes
} = require('../controllers/qrCodeController');

// Generate single table QR code
router.get('/table/:tableNumber', generateSingleQR);

// Generate multiple table QR codes
router.post('/generate-multiple', generateMultipleQR);

// Get printable QR code page
router.get('/print/:tableNumber', getPrintableQR);

// Download all QR codes as ZIP
router.get('/download-all', downloadAllQRCodes);

module.exports = router;