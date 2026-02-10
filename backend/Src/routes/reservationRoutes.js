// backend/src/routes/reservationRoutes.js
const express = require('express');
const router = express.Router();
const {
  createReservation,
  getAllReservations,
  getReservation,
  getReservationByCode,
  getReservationStats,
  updateReservationStatus,
  updateReservation,
  deleteReservation
} = require('../controllers/reservationController');

// Get reservation statistics
router.get('/stats', getReservationStats);

// Create new reservation
router.post('/', createReservation);

// Get all reservations (with optional filters)
router.get('/', getAllReservations);

// Get reservation by confirmation code
router.get('/code/:code', getReservationByCode);

// Get single reservation by ID
router.get('/:id', getReservation);

// Update reservation status
router.put('/:id/status', updateReservationStatus);

// Update reservation details
router.put('/:id', updateReservation);

// Cancel/Delete reservation
router.delete('/:id', deleteReservation);

module.exports = router;