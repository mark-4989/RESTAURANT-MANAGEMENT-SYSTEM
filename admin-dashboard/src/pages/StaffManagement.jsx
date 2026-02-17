// admin-dashboard/src/pages/StaffManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Sprout,
  CheckCircle2,
  Pause,
  Crown,
  Mail,
  Phone,
  Building2,
  Calendar,
  Eye,
  Edit,
  Trash2,
  X,
  ChefHat,
  Utensils,
  DollarSign,
  BarChart3,
  Truck,
  Star,
  MapPin,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from 'lucide-react';
import StaffForm from '../components/StaffForm';
import '../styles/staff-management.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://restaurant-management-system-1-7v0m.onrender.com/api';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// ─── Drivers Sub-panel ────────────────────────────────────────────────────────

const DriversPanel = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverFilter, setDriverFilter] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/drivers`);
      const data = await res.json();
      if (data.success) setDrivers(data.data);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (driver) => {
    try {
      const res = await fetch(`${API_URL}/drivers/${driver._id}/toggle-availability`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        setDrivers(drivers.map(d => d._id === driver._id ? data.data : d));
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDeleteDriver = async (driver) => {
    if (!window.confirm(`Remove ${driver.firstName} ${driver.lastName} from the system?`)) return;
    try {
      const res = await fetch(`${API_URL}/drivers/${driver._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setDrivers(drivers.filter(d => d._id !== driver._id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleSeedDrivers = async () => {
    if (!window.confirm('This will clear existing drivers and add sample data. Continue?')) return;
    try {
      const res = await fetch(`${API_URL}/drivers/seed`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.count} sample drivers added!`);
        fetchDrivers();
      }
    } catch (err) {
      alert('❌ Failed to seed drivers');
    }
  };

  const statusColor = (status, isAvailable) => {
    if (status === 'on-delivery') return '#3b82f6';
    if (isAvailable && status === 'active') return '#10b981';
    if (status === 'offline') return '#6b7280';
    return '#f59e0b';
  };

  const statusLabel = (driver) => {
    if (driver.status === 'on-delivery') return 'On Delivery';
    if (driver.isAvailable) return 'Available';
    if (driver.status === 'offline') return 'Offline';
    return driver.status;
  };

  const vehicleEmoji = (type) => ({ motorcycle: '🏍️', bicycle: '🚲', car: '🚗', scooter: '🛵' }[type] || '🚗');

  const filtered = drivers.filter(d => {
    if (driverFilter === 'all') return true;
    if (driverFilter === 'available') return d.isAvailable && d.status === 'active';
    if (driverFilter === 'on-delivery') return d.status === 'on-delivery';
    if (driverFilter === 'offline') return d.status === 'offline';
    return d.vehicleType === driverFilter;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading drivers...</p>
      </div>
    );
  }

  return (
    <>
      {/* Driver Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { icon: <Truck size={40} />, value: drivers.length, label: 'Total Drivers' },
          { icon: <CheckCircle2 size={40} />, value: drivers.filter(d => d.isAvailable).length, label: 'Available Now' },
          { icon: <MapPin size={40} />, value: drivers.filter(d => d.status === 'on-delivery').length, label: 'On Delivery' },
          { icon: <Pause size={40} />, value: drivers.filter(d => d.status === 'offline').length, label: 'Offline' }
        ].map(({ icon, value, label }, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-content">
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs" style={{ marginBottom: '1.5rem' }}>
        {[
          { key: 'all', label: `All (${drivers.length})` },
          { key: 'available', label: `✅ Available (${drivers.filter(d => d.isAvailable).length})` },
          { key: 'on-delivery', label: `📦 On Delivery (${drivers.filter(d => d.status === 'on-delivery').length})` },
          { key: 'offline', label: `⚫ Offline (${drivers.filter(d => d.status === 'offline').length})` },
          { key: 'motorcycle', label: `🏍️ Motorcycles` },
          { key: 'car', label: `🚗 Cars` }
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`filter-tab ${driverFilter === key ? 'active' : ''}`}
            onClick={() => setDriverFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Header actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', gap: '1rem' }}>
        <button onClick={handleSeedDrivers} className="btn-secondary">
          <Sprout size={18} style={{ marginRight: '0.5rem' }} />
          Add Sample Drivers
        </button>
      </div>

      {/* Drivers grid */}
      {filtered.length === 0 ? (
        <div className="no-staff">
          <div className="no-staff-icon"><Truck size={96} /></div>
          <h3>No drivers found</h3>
          <p>Drivers who sign up via the Driver App appear here automatically.</p>
          <button onClick={handleSeedDrivers} className="btn-primary" style={{ marginTop: '1rem' }}>
            <Sprout size={20} style={{ marginRight: '0.5rem' }} /> Add Sample Drivers
          </button>
        </div>
      ) : (
        <div className="staff-grid">
          {filtered.map(driver => {
            const sColor = statusColor(driver.status, driver.isAvailable);
            return (
              <div key={driver._id} className="staff-card">
                <div className="staff-card-header">
                  <img
                    src={driver.profileImage || `https://ui-avatars.com/api/?name=${driver.firstName}+${driver.lastName}&background=10b981&color=fff&size=150`}
                    alt={`${driver.firstName} ${driver.lastName}`}
                    className="staff-avatar"
                    style={{ borderColor: sColor }}
                  />
                  <div
                    className="status-indicator"
                    style={{ backgroundColor: sColor }}
                    title={statusLabel(driver)}
                  />
                </div>

                <div className="staff-card-body">
                  <h3 className="staff-name">{driver.firstName} {driver.lastName}</h3>
                  <p className="staff-id">{driver.driverId}</p>

                  {/* Status badge */}
                  <div className="role-badge" style={{ backgroundColor: sColor, marginBottom: '0.75rem' }}>
                    {vehicleEmoji(driver.vehicleType)} {statusLabel(driver)}
                  </div>

                  <div className="staff-info">
                    <div className="info-row">
                      <Phone size={16} />
                      <span>{driver.phone}</span>
                    </div>
                    <div className="info-row">
                      <Mail size={16} />
                      <span>{driver.email}</span>
                    </div>
                    <div className="info-row">
                      <Truck size={16} />
                      <span>{driver.vehicleModel || driver.vehicleType} • {driver.vehicleRegistration}</span>
                    </div>
                    <div className="info-row">
                      <Star size={16} />
                      <span>{driver.performance?.averageRating?.toFixed(1) || '—'} rating • {driver.performance?.totalDeliveries || 0} deliveries</span>
                    </div>
                  </div>

                  {/* Performance preview */}
                  <div className="performance-preview">
                    <div className="perf-item">
                      <span className="perf-value">{driver.performance?.completedDeliveries || 0}</span>
                      <span className="perf-label">Completed</span>
                    </div>
                    <div className="perf-item">
                      <span className="perf-value">{driver.performance?.onTimeDeliveries || 0}</span>
                      <span className="perf-label">On-time</span>
                    </div>
                    <div className="perf-item">
                      <span className="perf-value">KSh {((driver.performance?.totalEarnings || 0) / 1000).toFixed(1)}k</span>
                      <span className="perf-label">Earnings</span>
                    </div>
                  </div>
                </div>

                <div className="staff-card-footer">
                  <button className="card-btn" onClick={() => setSelectedDriver(driver)}>
                    <Eye size={16} /> View
                  </button>
                  <button
                    className="card-btn"
                    style={{ color: driver.isAvailable ? '#10b981' : '#6b7280' }}
                    onClick={() => handleToggleAvailability(driver)}
                    title={driver.isAvailable ? 'Set Offline' : 'Set Available'}
                  >
                    {driver.isAvailable
                      ? <><ToggleRight size={16} /> Available</>
                      : <><ToggleLeft size={16} /> Offline</>
                    }
                  </button>
                  <button className="card-btn danger" onClick={() => handleDeleteDriver(driver)}>
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Driver Detail Modal */}
      {selectedDriver && (
        <div className="modal-overlay" onClick={() => setSelectedDriver(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDriver.firstName} {selectedDriver.lastName}</h2>
              <button className="close-btn" onClick={() => setSelectedDriver(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  ['Driver ID', selectedDriver.driverId],
                  ['Status', statusLabel(selectedDriver)],
                  ['Phone', selectedDriver.phone],
                  ['Email', selectedDriver.email],
                  ['License', selectedDriver.licenseNumber],
                  ['Vehicle Type', selectedDriver.vehicleType],
                  ['Registration', selectedDriver.vehicleRegistration],
                  ['Model', selectedDriver.vehicleModel || '—'],
                  ['Color', selectedDriver.vehicleColor || '—'],
                  ['Verified', selectedDriver.isVerified ? '✅ Yes' : '❌ No'],
                  ['Total Deliveries', selectedDriver.performance?.totalDeliveries || 0],
                  ['Completed', selectedDriver.performance?.completedDeliveries || 0],
                  ['Rating', selectedDriver.performance?.averageRating?.toFixed(2) || '—'],
                  ['Total Earnings', `KSh ${(selectedDriver.performance?.totalEarnings || 0).toLocaleString()}`]
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: '0.75rem', background: 'rgba(79,124,172,0.08)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>

              {!selectedDriver.isVerified && (
                <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertCircle size={18} style={{ color: '#f59e0b' }} />
                  <span style={{ color: '#f59e0b', fontSize: '0.9rem' }}>This driver has not been verified yet. Consider reviewing their documents.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Main Staff Management ────────────────────────────────────────────────────

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeSection, setActiveSection] = useState('staff'); // 'staff' | 'drivers'
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
      const response = await fetch(`${API_URL}/staff`);
      const data = await response.json();
      if (data.success) setStaff(data.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/staff/stats`);
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSeedStaff = async () => {
    if (!window.confirm('This will clear existing staff and add sample data. Continue?')) return;
    try {
      const response = await fetch(`${API_URL}/staff/seed`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.count} sample staff members added!`);
        fetchStaff();
        fetchStats();
      }
    } catch (error) {
      alert('❌ Failed to seed staff');
    }
  };

  const handleSaveStaff = (savedStaff) => {
    if (editingStaff) {
      setStaff(staff.map(s => s._id === savedStaff._id ? savedStaff : s));
    } else {
      setStaff([savedStaff, ...staff]);
    }
    fetchStats();
  };

  const handleEditStaff = (member) => {
    setEditingStaff(member);
    setShowAddModal(true);
  };

  const handleDeleteStaff = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.firstName} ${member.lastName}?`)) return;
    try {
      const response = await fetch(`${API_URL}/staff/${member._id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setStaff(staff.filter(s => s._id !== member._id));
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingStaff(null);
  };

  const getRoleColor = (role) => ({
    admin: '#ef4444', manager: '#f59e0b', chef: '#8b5cf6', waiter: '#3b82f6', cashier: '#10b981'
  }[role] || '#6b7280');

  const getRoleIcon = (role) => {
    const icons = { admin: Crown, manager: BarChart3, chef: ChefHat, waiter: Utensils, cashier: DollarSign };
    const Icon = icons[role] || Users;
    return <Icon size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />;
  };

  const getStatusColor = (status) => ({
    active: '#10b981', inactive: '#6b7280', 'on-leave': '#f59e0b', terminated: '#ef4444'
  }[status] || '#6b7280');

  const filteredStaff = staff.filter(m => filter === 'all' || m.role === filter);

  const sectionTabStyle = (section) => ({
    padding: '0.85rem 2rem',
    background: 'none',
    border: 'none',
    borderBottom: activeSection === section ? '3px solid var(--brand-primary)' : '3px solid transparent',
    color: activeSection === section ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  });

  if (loading && activeSection === 'staff') {
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
      {/* Page Header */}
      <div className="staff-header">
        <div>
          <h1>
            <Users size={36} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            People Management
          </h1>
          <p>Manage your restaurant team and delivery drivers</p>
        </div>
        {activeSection === 'staff' && (
          <div className="header-actions">
            <button onClick={handleSeedStaff} className="btn-secondary">
              <Sprout size={20} style={{ marginRight: '0.5rem' }} />
              Add Sample Staff
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <UserPlus size={20} style={{ marginRight: '0.5rem' }} />
              Add Staff Member
            </button>
          </div>
        )}
      </div>

      {/* Section Switcher — Staff vs Drivers */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--border-primary)',
        marginBottom: '2rem',
        gap: '0'
      }}>
        <button style={sectionTabStyle('staff')} onClick={() => setActiveSection('staff')}>
          <Users size={20} /> Staff ({staff.length})
        </button>
        <button style={sectionTabStyle('drivers')} onClick={() => setActiveSection('drivers')}>
          <Truck size={20} /> Drivers
        </button>
      </div>

      {/* ── STAFF SECTION ── */}
      {activeSection === 'staff' && (
        <>
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><Users size={48} /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalStaff}</div>
                  <div className="stat-label">Total Staff</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><CheckCircle2 size={48} /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.onShift}</div>
                  <div className="stat-label">On Shift Now</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Pause size={48} /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.inactive}</div>
                  <div className="stat-label">Inactive</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Crown size={48} /></div>
                <div className="stat-content">
                  <div className="stat-value">{stats.byRole?.find(r => r._id === 'admin')?.count || 0}</div>
                  <div className="stat-label">Admins</div>
                </div>
              </div>
            </div>
          )}

          {/* Role filter tabs */}
          <div className="filter-tabs">
            {[
              { key: 'all', label: `All Staff (${staff.length})` },
              { key: 'admin', label: 'Admins', icon: <Crown size={14} /> },
              { key: 'manager', label: 'Managers', icon: <BarChart3 size={14} /> },
              { key: 'chef', label: 'Chefs', icon: <ChefHat size={14} /> },
              { key: 'waiter', label: 'Waiters', icon: <Utensils size={14} /> },
              { key: 'cashier', label: 'Cashiers', icon: <DollarSign size={14} /> }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                className={`filter-tab ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {icon && <span style={{ marginRight: '0.4rem' }}>{icon}</span>}
                {label}
                {key !== 'all' && ` (${staff.filter(s => s.role === key).length})`}
              </button>
            ))}
          </div>

          {filteredStaff.length === 0 ? (
            <div className="no-staff">
              <div className="no-staff-icon"><Users size={96} /></div>
              <h3>No staff members yet</h3>
              <p>Add your first staff member to get started!</p>
              <button onClick={handleSeedStaff} className="btn-primary" style={{ marginTop: '1rem' }}>
                <Sprout size={20} style={{ marginRight: '0.5rem' }} /> Add Sample Staff
              </button>
            </div>
          ) : (
            <div className="staff-grid">
              {filteredStaff.map(member => (
                <div key={member._id} className="staff-card">
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
                    <h3 className="staff-name">{member.firstName} {member.lastName}</h3>
                    <p className="staff-id">{member.employeeId}</p>

                    <div className="role-badge" style={{ backgroundColor: getRoleColor(member.role) }}>
                      {getRoleIcon(member.role)} {member.role}
                    </div>

                    <div className="staff-info">
                      <div className="info-row"><Mail size={16} /><span>{member.email}</span></div>
                      <div className="info-row"><Phone size={16} /><span>{member.phone}</span></div>
                      <div className="info-row"><Building2 size={16} /><span>{member.department}</span></div>
                      <div className="info-row"><Calendar size={16} /><span>Hired {formatDate(member.hireDate)}</span></div>
                    </div>

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
                        <span className="perf-value">{member.performance.totalHoursWorked.toFixed(0)}h</span>
                        <span className="perf-label">Hours</span>
                      </div>
                    </div>
                  </div>

                  <div className="staff-card-footer">
                    <button className="card-btn" onClick={() => setSelectedStaff(member)}>
                      <Eye size={16} /> View
                    </button>
                    <button className="card-btn" onClick={() => handleEditStaff(member)}>
                      <Edit size={16} /> Edit
                    </button>
                    <button className="card-btn danger" onClick={() => handleDeleteStaff(member)}>
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── DRIVERS SECTION ── */}
      {activeSection === 'drivers' && <DriversPanel />}

      {/* Add / Edit Staff Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
              <button className="close-btn" onClick={handleCloseModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <StaffForm staff={editingStaff} onClose={handleCloseModal} onSave={handleSaveStaff} />
            </div>
          </div>
        </div>
      )}

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <div className="modal-overlay" onClick={() => setSelectedStaff(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedStaff.firstName} {selectedStaff.lastName}</h2>
              <button className="close-btn" onClick={() => setSelectedStaff(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
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