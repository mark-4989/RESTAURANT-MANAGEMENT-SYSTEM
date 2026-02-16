// admin-dashboard/src/pages/ReservationManagement.jsx (FIXED)
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  Calendar,
  ClipboardList,
  Clock,
  CheckCircle2,
  Users,
  Eye,
  Check,
  Armchair,
  Trash2,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  FileText
} from 'lucide-react';
import '../styles/reservation-management.css';

const ReservationManagement = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    totalReservations: 0,
    todayReservations: 0,
    upcomingReservations: 0,
    completedReservations: 0
  });

  useEffect(() => {
    fetchReservations();
    fetchStats();
  }, [filter]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:5000/api/reservations';
      
      if (filter === 'today') {
        url += '/today';
      } else if (filter === 'upcoming') {
        url += '?upcoming=true';
      } else if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setReservations(data.data || []); // FIX: Ensure it's always an array
      } else {
        setReservations([]); // FIX: Set empty array on failure
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load reservations');
      setReservations([]); // FIX: Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reservations/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data || stats); // FIX: Keep default stats if undefined
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep default stats on error
    }
  };

  const updateStatus = async (reservationId, status) => {
    try {
      const response = await fetch(`http://localhost:5000/api/reservations/${reservationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Reservation ${status}!`);
        fetchReservations();
        fetchStats();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update reservation');
    }
  };

  const handleDelete = async (reservationId) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/reservations/${reservationId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Reservation deleted successfully');
        fetchReservations();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error('Failed to delete reservation');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      seated: '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444',
      'no-show': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    return timeStr;
  };

  if (loading) {
    return (
      <div className="reservation-management">
        <div className="loading">Loading reservations...</div>
      </div>
    );
  }

  return (
    <div className="reservation-management">
      <div className="page-header">
        <div>
          <h1>
            <Calendar size={36} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Reservation Management
          </h1>
          <p>Manage customer table reservations</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">
            <Calendar size={48} />
          </div>
          <div>
            <div className="stat-value">{stats.totalReservations}</div>
            <div className="stat-label">Total Reservations</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">
            <ClipboardList size={48} />
          </div>
          <div>
            <div className="stat-value">{stats.todayReservations}</div>
            <div className="stat-label">Today</div>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">
            <Clock size={48} />
          </div>
          <div>
            <div className="stat-value">{stats.upcomingReservations}</div>
            <div className="stat-label">Upcoming</div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">
            <CheckCircle2 size={48} />
          </div>
          <div>
            <div className="stat-value">{stats.completedReservations}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'today' ? 'active' : ''}`}
          onClick={() => setFilter('today')}
        >
          Today
        </button>
        <button
          className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          className={`filter-tab ${filter === 'confirmed' ? 'active' : ''}`}
          onClick={() => setFilter('confirmed')}
        >
          Confirmed
        </button>
        <button
          className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      {/* Reservations Table */}
      {reservations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Calendar size={96} />
          </div>
          <h3>No Reservations Found</h3>
          <p>There are no reservations matching your filter criteria</p>
        </div>
      ) : (
        <div className="reservations-table-container">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Confirmation Code</th>
                <th>Customer</th>
                <th>Date & Time</th>
                <th>Guests</th>
                <th>Table</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation._id}>
                  <td className="reservation-number">
                    {reservation.confirmationCode || 'N/A'}
                  </td>
                  <td>
                    <div className="customer-info">
                      <strong>{reservation.customerName}</strong>
                      <small>{reservation.phoneNumber || 'No phone'}</small>
                    </div>
                  </td>
                  <td>
                    <div className="datetime-info">
                      <strong>{formatDate(reservation.date)}</strong>
                      <small>{formatTime(reservation.time)}</small>
                    </div>
                  </td>
                  <td>
                    <span className="guests-badge">
                      <Users size={16} style={{ marginRight: '0.25rem', display: 'inline' }} />
                      {reservation.partySize || 0}
                    </span>
                  </td>
                  <td>
                    {reservation.assignedTable || reservation.tablePreference || 'Any available'}
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(reservation.status) }}
                    >
                      {reservation.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-view"
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setShowModal(true);
                        }}
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      {reservation.status === 'pending' && (
                        <button
                          className="btn-confirm"
                          onClick={() => updateStatus(reservation._id, 'confirmed')}
                          title="Confirm"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      {reservation.status === 'confirmed' && (
                        <button
                          className="btn-seat"
                          onClick={() => updateStatus(reservation._id, 'seated')}
                          title="Mark as Seated"
                        >
                          <Armchair size={18} />
                        </button>
                      )}
                      {reservation.status === 'seated' && (
                        <button
                          className="btn-complete"
                          onClick={() => updateStatus(reservation._id, 'completed')}
                          title="Complete"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(reservation._id)}
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reservation Detail Modal */}
      {showModal && selectedReservation && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reservation Details - {selectedReservation.confirmationCode}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>
                  <User size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Customer Information
                </h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span>{selectedReservation.customerName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone:</span>
                    <span>{selectedReservation.phoneNumber || 'Not provided'}</span>
                  </div>
                  {selectedReservation.customerEmail && (
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span>{selectedReservation.customerEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3>
                  <Calendar size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Reservation Details
                </h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Date:</span>
                    <span>{formatDate(selectedReservation.date)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Time:</span>
                    <span>{formatTime(selectedReservation.time)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Guests:</span>
                    <span>
                      <Users size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {selectedReservation.partySize}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedReservation.status) }}
                    >
                      {selectedReservation.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Table Preference:</span>
                    <span>{selectedReservation.tablePreference || 'Any'}</span>
                  </div>
                  {selectedReservation.assignedTable && (
                    <div className="detail-item">
                      <span className="detail-label">Assigned Table:</span>
                      <span>{selectedReservation.assignedTable}</span>
                    </div>
                  )}
                  {selectedReservation.occasionType && (
                    <div className="detail-item">
                      <span className="detail-label">Occasion:</span>
                      <span>{selectedReservation.occasionType}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedReservation.specialRequests && (
                <div className="detail-section">
                  <h3>
                    <FileText size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Special Requests
                  </h3>
                  <p className="special-requests">
                    {selectedReservation.specialRequests}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {selectedReservation.status === 'pending' && (
                <button
                  className="btn-confirm-modal"
                  onClick={() => updateStatus(selectedReservation._id, 'confirmed')}
                >
                  <Check size={18} style={{ marginRight: '0.5rem' }} />
                  Confirm Reservation
                </button>
              )}
              {selectedReservation.status === 'confirmed' && (
                <button
                  className="btn-seat-modal"
                  onClick={() => updateStatus(selectedReservation._id, 'seated')}
                >
                  <Armchair size={18} style={{ marginRight: '0.5rem' }} />
                  Mark as Seated
                </button>
              )}
              {selectedReservation.status === 'seated' && (
                <button
                  className="btn-complete-modal"
                  onClick={() => updateStatus(selectedReservation._id, 'completed')}
                >
                  <CheckCircle2 size={18} style={{ marginRight: '0.5rem' }} />
                  Complete
                </button>
              )}
              <button
                className="btn-cancel-modal"
                onClick={() => updateStatus(selectedReservation._id, 'cancelled')}
              >
                <X size={18} style={{ marginRight: '0.5rem' }} />
                Cancel Reservation
              </button>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationManagement;