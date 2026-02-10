// server/routes/menuRoutes.js
const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const {
  getAllMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  seedMenuItems,
} = require('../controllers/menuController');

// Public routes
router.get('/', getAllMenuItems);
router.get('/:id', getMenuItem);

// Admin routes with image upload support
// 'image' is the field name expected in the form-data
router.post('/', upload.single('image'), createMenuItem);
router.put('/:id', upload.single('image'), updateMenuItem);
router.delete('/:id', deleteMenuItem);

// Toggle availability route
router.patch('/:id/toggle-availability', toggleAvailability);

// Development route - seed database
router.post('/seed', seedMenuItems);

module.exports = router;