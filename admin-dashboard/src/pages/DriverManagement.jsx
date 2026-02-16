// admin-dashboard/src/pages/DeliveryManagement.jsx - COMPLETE FINAL VERSION WITH LIVE TRACKING
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle2, 
  Users, 
  Phone, 
  MapPin, 
  Radio, 
  AlertCircle,
  X 
} from 'lucide-react';
import '../styles/delivery-management.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const DeliveryManagement = () => {
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [liveDriverLocations, setLiveDriverLocations] = useState({});
  
  const socketRef = useRef(null);

  useEffect(() => {
    fetchDeliveryOrders();
    fetchDrivers();
    
    // Initialize Socket.IO connection
    socketRef.current = io(BACKEND_URL);

    socketRef.current.on('connect', () => {
      console.log('📡 Admin connected to live tracking server');
      socketRef.current.emit('subscribe-admin');
    });

    socketRef.current.on('admin-driver-location', (data) => {
      console.log('📍 Received driver location update:', data);
      setLiveDriverLocations(prev => ({
        ...prev,
        [data.driverId]: {
          location: data.location,
          orderId: data.orderId,
          driverName: data.driverName,
          timestamp: data.timestamp
        }
      }));
    });

    socketRef.current.on('admin-delivery-update', (data) => {
      console.log('📦 Delivery status update received:', data);
      fetchDeliveryOrders();
    });

    socketRef.current.on('admin-order-update', () => {
      console.log('🔔 Order update received');
      fetchDeliveryOrders();
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from tracking server');
    });

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchDeliveryOrders();
      fetchDrivers();
    }, 30000);
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearInterval(interval);
    };
  }, []);

  const fetchDeliveryOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders?orderType=delivery`);
      const data = await response.json();
      
      if (data.success) {
        setDeliveryOrders(data.data || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching delivery orders:', error);
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${API_URL}/drivers`);
      const data = await response.json();
      
      if (data.success) {
        setDrivers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const assignDriver = async (orderId, driverId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, deliveryStatus: 'assigned' })
      });

      if (response.ok) {
        toast.success('Driver assigned successfully!');
        fetchDeliveryOrders();
        fetchDrivers();
        setShowAssignModal(false);
        setSelectedOrder(null);
        setSelectedDriver('');
      } else {
        toast.error('Failed to assign driver');
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error('Failed to assign driver');
    }
  };

  const broadcastOrder = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcast: true })
      });

      if (response.ok) {
        toast.success('Order broadcasted to all available drivers!');
        fetchDeliveryOrders();
      } else {
        toast.error('Failed to broadcast order');
      }
    } catch (error) {
      console.error('Error broadcasting order:', error);
      toast.error('Failed to broadcast order');
    }
  };

  const calculateTimeSince = (date) => {
    const minutes = Math.floor((new Date() - new Date(date)) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      assigned: '#3b82f6',
      'picked-up': '#8b5cf6',
      'on-the-way': '#10b981',
      delivered: '#22c55e',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getUrgency = (orderTime) => {
    const minutes = Math.floor((new Date() - new Date(orderTime)) / 60000);
    if (minutes > 30) return { label: 'URGENT', color: '#ef4444' };
    if (minutes > 15) return { label: 'HIGH', color: '#f59e0b' };
    return { label: 'NORMAL', color: '#10b981' };
  };

  const formatPrice = (price) => {
    return `KSh ${price?.toLocaleString() || 0}`;
  };

  // Separate orders by delivery status
  const pendingOrders = deliveryOrders.filter(o => o.deliveryStatus === 'pending' || !o.deliveryStatus);
  const assignedOrders = deliveryOrders.filter(o => o.deliveryStatus === 'assigned');
  const activeOrders = deliveryOrders.filter(o => ['picked-up', 'on-the-way'].includes(o.deliveryStatus));
  const completedOrders = deliveryOrders.filter(o => o.deliveryStatus === 'delivered');

  // Available drivers
  const availableDrivers = drivers.filter(d => d.status === 'available' || d.isAvailable);

  if (loading) {
    return (
      <div className="delivery-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading delivery orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-management">
      <div className="page-header">
        <div>
          <h1>
            <Truck size={36} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Delivery Management
          </h1>
          <p>Manage and dispatch delivery orders to drivers with live tracking</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card orange">
          <div className="stat-icon">
            <Clock size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{pendingOrders.length}</div>
            <div className="stat-label">Pending Assignment</div>
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon">
            <Package size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{assignedOrders.length}</div>
            <div className="stat-label">Assigned</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">
            <Truck size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{activeOrders.length}</div>
            <div className="stat-label">Active Deliveries</div>
          </div>
        </div>

        <div className="stat-card gray">
          <div className="stat-icon">
            <CheckCircle2 size={48} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{completedOrders.length}</div>
            <div className="stat-label">Completed Today</div>
          </div>
        </div>
      </div>

      {/* Pending Orders - Need Assignment */}
      {pendingOrders.length > 0 && (
        <div className="glass-card orders-section">
          <div className="section-header">
            <h2>
              <AlertCircle size={24} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Pending Orders ({pendingOrders.length})
            </h2>
          </div>
          
          <div className="orders-grid">
            {pendingOrders.map(order => {
              const urgency = getUrgency(order.createdAt);
              
              return (
                <div key={order._id} className="order-card">
                  {/* Urgency Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.5rem 1rem',
                    background: urgency.color + '22',
                    border: `2px solid ${urgency.color}`,
                    borderRadius: '20px',
                    color: urgency.color,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    zIndex: 10
                  }}>
                    {urgency.label}
                  </div>

                  <div className="order-card-header">
                    <div>
                      <h3>{order.orderNumber}</h3>
                      <span 
                        className="status-badge"
                        style={{ background: getStatusColor(order.deliveryStatus) }}
                      >
                        {order.deliveryStatus?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                    <div className="order-total">{formatPrice(order.total)}</div>
                  </div>

                  <div className="order-card-body">
                    <div className="delivery-info-grid">
                      <div>
                        <strong>
                          <Users size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          Customer:
                        </strong>
                        <p>{order.customerName}</p>
                      </div>
                      <div>
                        <strong>
                          <Phone size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          Phone:
                        </strong>
                        <p>{order.deliveryPhone}</p>
                      </div>
                      <div>
                        <strong>
                          <Clock size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          Time:
                        </strong>
                        <p>{calculateTimeSince(order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="delivery-address">
                      <strong>
                        <MapPin size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Delivery Address:
                      </strong>
                      <p>{order.deliveryAddress}</p>
                    </div>

                    {order.deliveryNote && (
                      <div className="delivery-note">
                        <strong>Note:</strong>
                        <p>{order.deliveryNote}</p>
                      </div>
                    )}
                  </div>

                  <div className="order-card-actions">
                    <button
                      className="btn-assign"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowAssignModal(true);
                      }}
                    >
                      <Users size={18} style={{ marginRight: '0.5rem' }} />
                      Assign Driver
                    </button>
                    <button
                      className="btn-broadcast"
                      onClick={() => broadcastOrder(order._id)}
                    >
                      <Radio size={18} style={{ marginRight: '0.5rem' }} />
                      Broadcast to All
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Deliveries with Live Tracking */}
      {[...assignedOrders, ...activeOrders].length > 0 && (
        <div className="glass-card orders-section">
          <div className="section-header">
            <h2>
              <Truck size={24} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Active Deliveries ({[...assignedOrders, ...activeOrders].length})
            </h2>
          </div>
          
          <div className="orders-grid">
            {[...assignedOrders, ...activeOrders].map(order => {
              const driverLiveLocation = order.driver && liveDriverLocations[order.driver];
              const isLiveTracking = driverLiveLocation && ['picked-up', 'on-the-way'].includes(order.deliveryStatus);
              
              return (
                <div key={order._id} className="order-card" style={{ position: 'relative' }}>
                  {/* Live Tracking Indicator */}
                  {isLiveTracking && (
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderRadius: '50px',
                      border: '2px solid #10b981',
                      zIndex: 10
                    }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        background: '#10b981',
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                      }} />
                      <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                        <MapPin size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Live
                      </span>
                    </div>
                  )}

                  <div className="order-card-header">
                    <div>
                      <h3>{order.orderNumber}</h3>
                      <span 
                        className="status-badge"
                        style={{ background: getStatusColor(order.deliveryStatus) }}
                      >
                        {order.deliveryStatus?.toUpperCase() || 'ASSIGNED'}
                      </span>
                    </div>
                    <div className="order-total">{formatPrice(order.total)}</div>
                  </div>

                  <div className="order-card-body">
                    <div className="delivery-info-grid">
                      <div>
                        <strong>
                          <Users size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          Customer:
                        </strong>
                        <p>{order.customerName}</p>
                      </div>
                      <div>
                        <strong>
                          <Truck size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          Driver:
                        </strong>
                        <p>{order.driverName || 'Assigning...'}</p>
                      </div>
                      <div>
                        <strong>
                          <Phone size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          Phone:
                        </strong>
                        <p>{order.deliveryPhone}</p>
                      </div>
                      <div>
                        <strong>
                          <Clock size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          Time:
                        </strong>
                        <p>{calculateTimeSince(order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="delivery-address compact">
                      <strong>
                        <MapPin size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      </strong>
                      <p>{order.deliveryAddress}</p>
                    </div>

                    {/* Live Location Info */}
                    {isLiveTracking && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                          <span style={{ fontWeight: 600 }}>
                            <MapPin size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                            Driver Location:
                          </span>
                          <span>{new Date(driverLiveLocation.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
                          Lat: {driverLiveLocation.location.lat.toFixed(6)}, Lng: {driverLiveLocation.location.lng.toFixed(6)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Deliveries */}
      {completedOrders.length > 0 && (
        <div className="glass-card orders-section completed-section">
          <div className="section-header">
            <h2>
              <CheckCircle2 size={24} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Completed Today ({completedOrders.length})
            </h2>
          </div>
          
          <div className="completed-list">
            {completedOrders.slice(0, 5).map(order => (
              <div key={order._id} className="completed-item">
                <div>
                  <strong>{order.orderNumber}</strong>
                  <span> • {order.customerName}</span>
                </div>
                <div className="completed-meta">
                  <span className="completed-price">{formatPrice(order.total)}</span>
                  <span className="completed-time">{calculateTimeSince(order.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssignModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Users size={24} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Assign Driver to {selectedOrder.orderNumber}
              </h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="order-summary">
                <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                <p><strong>Address:</strong> {selectedOrder.deliveryAddress}</p>
                <p><strong>Total:</strong> {formatPrice(selectedOrder.total)}</p>
              </div>

              <div className="form-group">
                <label>Select Driver:</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="driver-select"
                >
                  <option value="">-- Select a driver --</option>
                  {availableDrivers.map(driver => (
                    <option key={driver._id} value={driver._id}>
                      {driver.firstName} {driver.lastName} - {driver.vehicleType} ({driver.vehicleRegistration})
                    </option>
                  ))}
                </select>
              </div>

              {availableDrivers.length === 0 && (
                <p className="warning-text">
                  <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
                  No drivers currently available. Consider broadcasting this order.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={() => selectedDriver && assignDriver(selectedOrder._id, selectedDriver)}
                disabled={!selectedDriver}
              >
                <CheckCircle2 size={18} style={{ marginRight: '0.5rem' }} />
                Assign Driver
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default DeliveryManagement;