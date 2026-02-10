// admin-dashboard/src/pages/StaffManagement.jsx
import React, { useState, useEffect } from 'react';
import StaffForm from '../components/StaffForm';
import '../styles/staff-management.css';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStaff();
    fetchStats();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/staff');
      const data = await response.json();
      
      if (data.success) {
        setStaff(data.data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/staff/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSeedStaff = async () => {
    if (!window.confirm('This will clear existing staff and add sample data. Continue?')) {
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/staff/seed', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.count} sample staff members added!`);
        fetchStaff();
        fetchStats();
      }
    } catch (error) {
      console.error('Error seeding staff:', error);
      alert('❌ Failed to seed staff');
    }
  };

  const handleSaveStaff = (savedStaff) => {
    if (editingStaff) {
      // Update existing
      setStaff(staff.map(s => s._id === savedStaff._id ? savedStaff : s));
    } else {
      // Add new
      setStaff([savedStaff, ...staff]);
    }
    fetchStats();
  };

  const handleEditStaff = (member) => {
    setEditingStaff(member);
    setShowAddModal(true);
  };

  const handleDeleteStaff = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.firstName} ${member.lastName}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/staff/${member._id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setStaff(staff.filter(s => s._id !== member._id));
        fetchStats();
        alert('✅ Staff member removed');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('❌ Failed to remove staff member');
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingStaff(null);
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: '#ef4444',
      manager: '#f59e0b',
      chef: '#8b5cf6',
      waiter: '#3b82f6',
      cashier: '#10b981'
    };
    return colors[role] || '#6b7280';
  };

  const getRoleIcon = (role) => {
    const icons = {
      admin: '👑',
      manager: '📊',
      chef: '👨‍🍳',
      waiter: '🍽️',
      cashier: '💰'
    };
    return icons[role] || '👤';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#10b981',
      inactive: '#6b7280',
      'on-leave': '#f59e0b',
      terminated: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const filteredStaff = staff.filter(member => {
    if (filter === 'all') return true;
    return member.role === filter;
  });

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="staff-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-page">
      <div className="staff-header">
        <div>
          <h1>👥 Staff Management</h1>
          <p>Manage your restaurant team</p>
        </div>
        <div className="header-actions">
          <button onClick={handleSeedStaff} className="btn-secondary">
            🌱 Add Sample Staff
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            ➕ Add Staff Member
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalStaff}</div>
              <div className="stat-label">Total Staff</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.onShift}</div>
              <div className="stat-label">On Shift Now</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏸️</div>
            <div className="stat-content">
              <div className="stat-value">{stats.inactive}</div>
              <div className="stat-label">Inactive</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👑</div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.byRole.find(r => r._id === 'admin')?.count || 0}
              </div>
              <div className="stat-label">Admins</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Staff ({staff.length})
        </button>
        <button
          className={`filter-tab ${filter === 'admin' ? 'active' : ''}`}
          onClick={() => setFilter('admin')}
        >
          👑 Admins ({staff.filter(s => s.role === 'admin').length})
        </button>
        <button
          className={`filter-tab ${filter === 'manager' ? 'active' : ''}`}
          onClick={() => setFilter('manager')}
        >
          📊 Managers ({staff.filter(s => s.role === 'manager').length})
        </button>
        <button
          className={`filter-tab ${filter === 'chef' ? 'active' : ''}`}
          onClick={() => setFilter('chef')}
        >
          👨‍🍳 Chefs ({staff.filter(s => s.role === 'chef').length})
        </button>
        <button
          className={`filter-tab ${filter === 'waiter' ? 'active' : ''}`}
          onClick={() => setFilter('waiter')}
        >
          🍽️ Waiters ({staff.filter(s => s.role === 'waiter').length})
        </button>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="no-staff">
          <div className="no-staff-icon">👥</div>
          <h3>No staff members yet</h3>
          <p>Add your first staff member to get started!</p>
          <button onClick={handleSeedStaff} className="btn-primary">
            Add Sample Staff
          </button>
        </div>
      ) : (
        <div className="staff-grid">
          {filteredStaff.map(member => (
            <div
              key={member._id}
              className="staff-card"
            >
              <div className="staff-card-header">
                <img
                  src={member.profileImage}
                  alt={`${member.firstName} ${member.lastName}`}
                  className="staff-avatar"
                />
                <div
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(member.status) }}
                  title={member.status}
                />
              </div>

              <div className="staff-card-body">
                <h3 className="staff-name">
                  {member.firstName} {member.lastName}
                </h3>
                <p className="staff-id">{member.employeeId}</p>

                <div
                  className="role-badge"
                  style={{ backgroundColor: getRoleColor(member.role) }}
                >
                  {getRoleIcon(member.role)} {member.role}
                </div>

                <div className="staff-info">
                  <div className="info-row">
                    <span>📧</span>
                    <span>{member.email}</span>
                  </div>
                  <div className="info-row">
                    <span>📱</span>
                    <span>{member.phone}</span>
                  </div>
                  <div className="info-row">
                    <span>🏢</span>
                    <span>{member.department}</span>
                  </div>
                  <div className="info-row">
                    <span>📅</span>
                    <span>Hired {formatDate(member.hireDate)}</span>
                  </div>
                </div>

                {/* Performance Preview */}
                <div className="performance-preview">
                  <div className="perf-item">
                    <span className="perf-value">{member.performance.ordersServed}</span>
                    <span className="perf-label">Orders</span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-value">{member.performance.totalShiftsWorked}</span>
                    <span className="perf-label">Shifts</span>
                  </div>
                  <div className="perf-item">
                    <span className="perf-value">
                      {member.performance.totalHoursWorked.toFixed(0)}h
                    </span>
                    <span className="perf-label">Hours</span>
                  </div>
                </div>
              </div>

              <div className="staff-card-footer">
                <button 
                  className="card-btn"
                  onClick={() => setSelectedStaff(member)}
                >
                  👁️ View
                </button>
                <button 
                  className="card-btn"
                  onClick={() => handleEditStaff(member)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="card-btn danger"
                  onClick={() => handleDeleteStaff(member)}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <StaffForm
                staff={editingStaff}
                onClose={handleCloseModal}
                onSave={handleSaveStaff}
              />
            </div>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {selectedStaff && (
        <div className="modal-overlay" onClick={() => setSelectedStaff(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedStaff.firstName} {selectedStaff.lastName}</h2>
              <button className="close-btn" onClick={() => setSelectedStaff(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                Detailed staff view coming soon!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;