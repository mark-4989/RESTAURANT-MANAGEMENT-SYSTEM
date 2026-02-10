// admin-dashboard/src/components/StaffForm.jsx
import React, { useState, useEffect } from 'react';
import '../styles/staff-form.css';

const StaffForm = ({ staff, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'waiter',
    department: 'service',
    password: '',
    hourlyRate: 400,
    address: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (staff) {
      setFormData({
        firstName: staff.firstName || '',
        lastName: staff.lastName || '',
        email: staff.email || '',
        phone: staff.phone || '',
        role: staff.role || 'waiter',
        department: staff.department || 'service',
        password: '', // Don't pre-fill password for security
        hourlyRate: staff.hourlyRate || 400,
        address: staff.address || '',
        emergencyContact: staff.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
  }, [staff]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    
    if (!staff && !formData.password) {
      newErrors.password = 'Password is required for new staff';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('⚠️ Please fill in all required fields correctly');
      return;
    }

    setLoading(true);

    try {
      const url = staff 
        ? `http://localhost:5000/api/staff/${staff._id}`
        : 'http://localhost:5000/api/staff';
      
      const method = staff ? 'PUT' : 'POST';

      // Don't send password if it's empty (for updates)
      const dataToSend = { ...formData };
      if (staff && !dataToSend.password) {
        delete dataToSend.password;
      }

      console.log('📤 Sending staff data:', dataToSend);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      const data = await response.json();
      
      console.log('📥 Response:', data);

      if (data.success) {
        alert(`✅ Staff member ${staff ? 'updated' : 'added'} successfully!`);
        onSave(data.data);
        onClose();
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('❌ Error saving staff:', error);
      alert(`❌ Failed to save staff member: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-form-container">
      <form onSubmit={handleSubmit} className="staff-form">
        <h2>{staff ? '✏️ Edit Staff Member' : '➕ Add New Staff Member'}</h2>

        {/* Personal Information */}
        <div className="form-section">
          <h3>👤 Personal Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={errors.firstName ? 'error' : ''}
                placeholder="John"
              />
              {errors.firstName && <span className="error-text">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={errors.lastName ? 'error' : ''}
                placeholder="Doe"
              />
              {errors.lastName && <span className="error-text">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="john.doe@dinesmart.com"
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? 'error' : ''}
                placeholder="+254712345678"
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main Street, Nairobi"
            />
          </div>
        </div>

        {/* Employment Details */}
        <div className="form-section">
          <h3>💼 Employment Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="waiter">🍽️ Waiter</option>
                <option value="chef">👨‍🍳 Chef</option>
                <option value="cashier">💰 Cashier</option>
                <option value="manager">📊 Manager</option>
                <option value="admin">👑 Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label>Department *</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="service">Service</option>
                <option value="kitchen">Kitchen</option>
                <option value="cashier">Cashier</option>
                <option value="management">Management</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Hourly Rate (KSh)</label>
            <input
              type="number"
              name="hourlyRate"
              value={formData.hourlyRate}
              onChange={handleChange}
              min="0"
              step="50"
              placeholder="400"
            />
          </div>

          {!staff && (
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="Enter initial password"
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
              <small>Staff can change this after first login</small>
            </div>
          )}

          {staff && (
            <div className="form-group">
              <label>New Password (leave blank to keep current)</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter new password to change"
              />
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="form-section">
          <h3>🚨 Emergency Contact</h3>
          
          <div className="form-group">
            <label>Contact Name</label>
            <input
              type="text"
              name="emergencyContact.name"
              value={formData.emergencyContact.name}
              onChange={handleChange}
              placeholder="Jane Doe"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="tel"
                name="emergencyContact.phone"
                value={formData.emergencyContact.phone}
                onChange={handleChange}
                placeholder="+254712345678"
              />
            </div>

            <div className="form-group">
              <label>Relationship</label>
              <input
                type="text"
                name="emergencyContact.relationship"
                value={formData.emergencyContact.relationship}
                onChange={handleChange}
                placeholder="Spouse, Parent, Sibling"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn-cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-save"
            disabled={loading}
          >
            {loading ? 'Saving...' : (staff ? 'Update Staff' : 'Add Staff')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffForm;