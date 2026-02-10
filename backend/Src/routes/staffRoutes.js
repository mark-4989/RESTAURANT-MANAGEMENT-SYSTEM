// backend/src/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllStaff,
  getStaffMember,
  createStaff,
  updateStaff,
  deleteStaff,
  addShift,
  clockIn,
  clockOut,
  getStaffStats,
  seedStaff
} = require('../controllers/staffController');

// Staff CRUD
router.get('/', getAllStaff);
router.get('/stats', getStaffStats);
router.get('/:id', getStaffMember);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

// Shifts
router.post('/:id/shifts', addShift);
router.post('/:id/clock-in', clockIn);
router.post('/:id/clock-out', clockOut);

// Development
router.post('/seed', seedStaff);

module.exports = router;