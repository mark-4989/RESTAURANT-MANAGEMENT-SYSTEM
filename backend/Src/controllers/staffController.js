// backend/src/controllers/staffController.js
const Staff = require('../models/Staff');
const bcrypt = require('bcryptjs');

/**
 * Get all staff members
 */
exports.getAllStaff = async (req, res) => {
  try {
    const { status, role, department } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (role) query.role = role;
    if (department) query.department = department;

    const staff = await Staff.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    console.error('❌ Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff members'
    });
  }
};

/**
 * Get single staff member
 */
exports.getStaffMember = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).select('-password');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    res.status(200).json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('❌ Get staff member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff member'
    });
  }
};

/**
 * Create new staff member
 */
exports.createStaff = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      department,
      password,
      hourlyRate,
      address,
      emergencyContact
    } = req.body;

    // Check if email already exists
    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate employee ID
    const count = await Staff.countDocuments();
    const employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;

    // Generate profile image with initials
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
    const profileImage = `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&size=150&bold=true`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create staff member
    const staff = await Staff.create({
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      role,
      department,
      password: hashedPassword,
      hourlyRate,
      address,
      emergencyContact,
      hireDate: new Date()
    });

    // Remove password from response
    const staffData = staff.toObject();
    delete staffData.password;

    console.log('✅ Staff member created:', staff.employeeId);

    res.status(201).json({
      success: true,
      data: staffData,
      message: `Staff member ${staff.employeeId} created successfully`
    });
  } catch (error) {
    console.error('❌ Create staff error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create staff member'
    });
  }
};

/**
 * Update staff member
 */
exports.updateStaff = async (req, res) => {
  try {
    const updates = { ...req.body };

    // If password is being updated, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    console.log('✅ Staff member updated:', staff.employeeId);

    res.status(200).json({
      success: true,
      data: staff,
      message: 'Staff member updated successfully'
    });
  } catch (error) {
    console.error('❌ Update staff error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update staff member'
    });
  }
};

/**
 * Delete staff member
 */
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Instead of deleting, mark as terminated
    staff.status = 'terminated';
    await staff.save();

    console.log('✅ Staff member terminated:', staff.employeeId);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Staff member terminated successfully'
    });
  } catch (error) {
    console.error('❌ Delete staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff member'
    });
  }
};

/**
 * Add shift to staff member
 */
exports.addShift = async (req, res) => {
  try {
    const { date, startTime, endTime, notes } = req.body;

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    staff.shifts.push({
      date,
      startTime,
      endTime,
      notes,
      status: 'scheduled'
    });

    await staff.save();

    console.log('✅ Shift added for:', staff.employeeId);

    res.status(200).json({
      success: true,
      data: staff,
      message: 'Shift added successfully'
    });
  } catch (error) {
    console.error('❌ Add shift error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to add shift'
    });
  }
};

/**
 * Clock in
 */
exports.clockIn = async (req, res) => {
  try {
    const { shiftId } = req.body;

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    const shift = staff.shifts.id(shiftId);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    shift.clockIn = new Date();
    shift.status = 'in-progress';

    await staff.save();

    console.log('✅ Clocked in:', staff.employeeId);

    res.status(200).json({
      success: true,
      data: staff,
      message: 'Clocked in successfully'
    });
  } catch (error) {
    console.error('❌ Clock in error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to clock in'
    });
  }
};

/**
 * Clock out
 */
exports.clockOut = async (req, res) => {
  try {
    const { shiftId } = req.body;

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    const shift = staff.shifts.id(shiftId);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    shift.clockOut = new Date();
    shift.status = 'completed';

    // Calculate hours worked
    const hoursWorked = (shift.clockOut - shift.clockIn) / (1000 * 60 * 60);
    staff.performance.totalHoursWorked += hoursWorked;
    staff.performance.totalShiftsWorked += 1;

    await staff.save();

    console.log('✅ Clocked out:', staff.employeeId);

    res.status(200).json({
      success: true,
      data: staff,
      message: 'Clocked out successfully'
    });
  } catch (error) {
    console.error('❌ Clock out error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to clock out'
    });
  }
};

/**
 * Get staff statistics
 */
exports.getStaffStats = async (req, res) => {
  try {
    const totalStaff = await Staff.countDocuments({ status: 'active' });
    const byRole = await Staff.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const onShift = await Staff.countDocuments({
      status: 'active',
      'shifts.status': 'in-progress'
    });

    res.status(200).json({
      success: true,
      data: {
        totalStaff,
        onShift,
        byRole,
        inactive: await Staff.countDocuments({ status: 'inactive' })
      }
    });
  } catch (error) {
    console.error('❌ Get staff stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff statistics'
    });
  }
};

/**
 * Seed sample staff (for testing)
 */
exports.seedStaff = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const sampleStaff = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.admin@dinesmart.com',
        phone: '+254712345678',
        role: 'admin',
        department: 'management',
        password: hashedPassword,
        hourlyRate: 1000
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.manager@dinesmart.com',
        phone: '+254723456789',
        role: 'manager',
        department: 'management',
        password: hashedPassword,
        hourlyRate: 800
      },
      {
        firstName: 'Mike',
        lastName: 'Chef',
        email: 'mike.chef@dinesmart.com',
        phone: '+254734567890',
        role: 'chef',
        department: 'kitchen',
        password: hashedPassword,
        hourlyRate: 600
      },
      {
        firstName: 'Sarah',
        lastName: 'Waiter',
        email: 'sarah.waiter@dinesmart.com',
        phone: '+254745678901',
        role: 'waiter',
        department: 'service',
        password: hashedPassword,
        hourlyRate: 400
      }
    ];

    await Staff.deleteMany({}); // Clear existing
    const staff = await Staff.insertMany(sampleStaff);

    console.log('✅ Sample staff created:', staff.length);

    res.status(201).json({
      success: true,
      count: staff.length,
      data: staff.map(s => ({ ...s.toObject(), password: undefined })),
      message: `${staff.length} sample staff members created`
    });
  } catch (error) {
    console.error('❌ Seed staff error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to seed staff'
    });
  }
};