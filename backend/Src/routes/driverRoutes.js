// backend/src/routes/driverRoutes.js - COMPLETE UPDATED VERSION
const express = require('express');
const router = express.Router();
const {
  getAllDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  updateLocation,
  toggleAvailability,
  findNearbyDrivers,
  getDriverStats,
  driverLogin,
  seedDrivers
} = require('../controllers/driverController');

const Driver = require('../models/Driver');
const { emitDriverLocation } = require('../services/socketService');

// Driver CRUD
router.get('/', getAllDrivers);
router.get('/stats', getDriverStats);
router.get('/nearby', findNearbyDrivers);
router.get('/:id', getDriver);
router.post('/', createDriver);
router.put('/:id', updateDriver);
router.delete('/:id', deleteDriver);

// Driver actions
router.patch('/:id/location', updateLocation);
router.patch('/:id/toggle-availability', toggleAvailability);

// ✨ NEW: Real-time location update for live tracking
router.post('/:id/location/live', async (req, res) => {
  try {
    const { latitude, longitude, orderId } = req.body;
    const { id: driverId } = req.params;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Update driver location in database
    driver.updateLocation(longitude, latitude);
    await driver.save();

    // Emit real-time location via WebSocket
    emitDriverLocation({
      driverId,
      orderId,
      lat: latitude,
      lng: longitude,
      driverName: `${driver.firstName} ${driver.lastName}`
    });

    res.json({
      success: true,
      message: 'Location updated and broadcasted',
      data: {
        latitude,
        longitude,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
});

// Authentication
router.post('/login', driverLogin);

// Development
router.post('/seed', seedDrivers);

module.exports = router;