// backend/src/controllers/reservationController.js
const Reservation = require('../models/Reservation');

/**
 * Create a new reservation
 */
exports.createReservation = async (req, res) => {
  try {
    console.log('📥 Creating reservation:', req.body);
    
    const reservation = await Reservation.create(req.body);
    
    console.log('✅ Reservation created:', reservation._id);
    console.log('🎫 Confirmation Code:', reservation.confirmationCode);
    
    res.status(201).json({
      success: true,
      message: 'Reservation request submitted successfully',
      reservation
    });
  } catch (error) {
    console.error('❌ Error creating reservation:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all reservations
 */
exports.getAllReservations = async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = {};
    
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }
    
    const reservations = await Reservation.find(query)
      .sort({ date: 1, time: 1 });
    
    res.json({
      success: true,
      count: reservations.length,
      reservations
    });
  } catch (error) {
    console.error('❌ Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get reservation statistics
 */
exports.getReservationStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get counts by status
    const pending = await Reservation.countDocuments({ status: 'pending' });
    const confirmed = await Reservation.countDocuments({ status: 'confirmed' });
    const seated = await Reservation.countDocuments({ status: 'seated' });
    const completed = await Reservation.countDocuments({ status: 'completed' });
    
    // Get today's reservations
    const todayReservations = await Reservation.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });
    
    // Get total reservations
    const total = await Reservation.countDocuments();
    
    res.json({
      success: true,
      stats: {
        total,
        pending,
        confirmed,
        seated,
        completed,
        todayReservations
      }
    });
  } catch (error) {
    console.error('❌ Error fetching reservation stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get a single reservation by ID
 */
exports.getReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    res.json({
      success: true,
      reservation
    });
  } catch (error) {
    console.error('❌ Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get reservation by confirmation code
 */
exports.getReservationByCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    const reservation = await Reservation.findOne({ confirmationCode: code });
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    res.json({
      success: true,
      reservation
    });
  } catch (error) {
    console.error('❌ Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update reservation status
 */
exports.updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTable } = req.body;
    
    const updateData = { status };
    if (assignedTable) updateData.assignedTable = assignedTable;
    
    const reservation = await Reservation.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    console.log(`✅ Reservation ${id} status updated to: ${status}`);
    
    res.json({
      success: true,
      message: 'Reservation status updated',
      reservation
    });
  } catch (error) {
    console.error('❌ Error updating reservation status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update reservation details
 */
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await Reservation.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    console.log(`✅ Reservation ${id} updated`);
    
    res.json({
      success: true,
      message: 'Reservation updated successfully',
      reservation
    });
  } catch (error) {
    console.error('❌ Error updating reservation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Cancel/Delete a reservation
 */
exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await Reservation.findByIdAndDelete(id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    console.log(`✅ Reservation ${id} cancelled`);
    
    res.json({
      success: true,
      message: 'Reservation cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting reservation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};