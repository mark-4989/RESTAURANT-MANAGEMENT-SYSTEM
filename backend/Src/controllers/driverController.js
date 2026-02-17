// backend/src/controllers/driverController.js
const Driver = require('../models/Driver');
const bcrypt = require('bcryptjs');

// Get all drivers
exports.getAllDrivers = async (req, res) => {
  try {
    const { status, available } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (available !== undefined) query.isAvailable = available === 'true';
    
    const drivers = await Driver.find(query)
      .populate('currentDelivery')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    console.error('❌ Get drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drivers'
    });
  }
};

// Get single driver
exports.getDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('currentDelivery');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('❌ Get driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver'
    });
  }
};

// Create new driver
exports.createDriver = async (req, res) => {
  try {
    const { password, ...driverData } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const driver = await Driver.create({
      ...driverData,
      password: hashedPassword
    });

    // Remove password from response
    const driverObj = driver.toObject();
    delete driverObj.password;

    res.status(201).json({
      success: true,
      data: driverObj,
      message: `Driver ${driver.driverId} created successfully`
    });
  } catch (error) {
    console.error('❌ Create driver error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create driver'
    });
  }
};

// Update driver
exports.updateDriver = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      driver[key] = updateData[key];
    });

    // Update password if provided
    if (password) {
      driver.password = await bcrypt.hash(password, 10);
    }

    await driver.save();

    // Remove password from response
    const driverObj = driver.toObject();
    delete driverObj.password;

    res.status(200).json({
      success: true,
      data: driverObj,
      message: 'Driver updated successfully'
    });
  } catch (error) {
    console.error('❌ Update driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver'
    });
  }
};

// Delete driver
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    await driver.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Driver deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete driver'
    });
  }
};

// Update driver location
exports.updateLocation = async (req, res) => {
  try {
    const { longitude, latitude } = req.body;
    
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    driver.updateLocation(longitude, latitude);
    await driver.save();

    res.status(200).json({
      success: true,
      data: driver,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('❌ Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
};

// Toggle driver availability
exports.toggleAvailability = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    driver.isAvailable = !driver.isAvailable;
    driver.status = driver.isAvailable ? 'active' : 'offline';
    driver.lastActive = new Date();
    
    await driver.save();

    res.status(200).json({
      success: true,
      data: driver,
      message: `Driver is now ${driver.isAvailable ? 'available' : 'unavailable'}`
    });
  } catch (error) {
    console.error('❌ Toggle availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability'
    });
  }
};

// Find nearby drivers
exports.findNearbyDrivers = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance } = req.query;
    
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }

    const drivers = await Driver.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      maxDistance ? parseInt(maxDistance) : 5000
    );

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    console.error('❌ Find nearby drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby drivers'
    });
  }
};

// Get driver statistics
exports.getDriverStats = async (req, res) => {
  try {
    const totalDrivers = await Driver.countDocuments();
    const activeDrivers = await Driver.countDocuments({ status: 'active', isAvailable: true });
    const onDelivery = await Driver.countDocuments({ status: 'on-delivery' });
    const offlineDrivers = await Driver.countDocuments({ status: 'offline' });

    res.status(200).json({
      success: true,
      data: {
        totalDrivers,
        activeDrivers,
        onDelivery,
        offlineDrivers
      }
    });
  } catch (error) {
    console.error('❌ Get driver stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver statistics'
    });
  }
};

// Driver login — accepts phone OR email
exports.driverLogin = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    if (!password || (!phone && !email)) {
      return res.status(400).json({
        success: false,
        message: 'Phone/email and password are required'
      });
    }

    // Look up by phone first, then fall back to email
    const query = phone ? { phone } : { email: email.toLowerCase() };
    const driver = await Driver.findOne(query).select('+password');
    
    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, driver.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    driver.lastLogin = new Date();
    driver.lastActive = new Date();
    await driver.save();

    // Remove password from response
    const driverObj = driver.toObject();
    delete driverObj.password;

    res.status(200).json({
      success: true,
      data: driverObj,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('❌ Driver login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// Seed sample drivers
exports.seedDrivers = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const sampleDrivers = [
      {
        firstName: 'John',
        lastName: 'Mwangi',
        email: 'john.mwangi@dinesmart.com',
        phone: '+254712345678',
        password: hashedPassword,
        licenseNumber: 'DL123456',
        vehicleType: 'motorcycle',
        vehicleRegistration: 'KAA 123B',
        vehicleModel: 'Honda CB150',
        vehicleColor: 'Red',
        status: 'active',
        isAvailable: true,
        currentLocation: {
          type: 'Point',
          coordinates: [36.8219, -1.2921] // Nairobi
        }
      },
      {
        firstName: 'Mary',
        lastName: 'Kamau',
        email: 'mary.kamau@dinesmart.com',
        phone: '+254723456789',
        password: hashedPassword,
        licenseNumber: 'DL234567',
        vehicleType: 'car',
        vehicleRegistration: 'KBB 234C',
        vehicleModel: 'Toyota Vitz',
        vehicleColor: 'Blue',
        status: 'active',
        isAvailable: true,
        currentLocation: {
          type: 'Point',
          coordinates: [36.8300, -1.2800]
        }
      },
      {
        firstName: 'Peter',
        lastName: 'Ochieng',
        email: 'peter.ochieng@dinesmart.com',
        phone: '+254734567890',
        password: hashedPassword,
        licenseNumber: 'DL345678',
        vehicleType: 'motorcycle',
        vehicleRegistration: 'KCC 345D',
        vehicleModel: 'Yamaha YBR',
        vehicleColor: 'Black',
        status: 'offline',
        isAvailable: false,
        currentLocation: {
          type: 'Point',
          coordinates: [36.8100, -1.3000]
        }
      }
    ];

    await Driver.deleteMany({});
    const drivers = await Driver.insertMany(sampleDrivers);

    res.status(201).json({
      success: true,
      count: drivers.length,
      data: drivers,
      message: 'Sample drivers created successfully'
    });
  } catch (error) {
    console.error('❌ Seed drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed drivers'
    });
  }
};