import React, { useState, useEffect } from 'react';
import { Package, DollarSign, BarChart3, Clock } from 'lucide-react';
import { getAllOrders, updateOrderStatus, getOrderStats } from '../api/orderApi';
import { formatPrice } from '../data/dashboardData';
import '../styles/blue-metallic-theme.css';
import '../styles/dashboard-ocean.css';

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch orders when filter changes
  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchDashboardData = async () => {
    await Promise.all([fetchOrders(), fetchStats()]);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const result = await getAllOrders(filterStatus, 'today');
    
    if (result.success) {
      setOrders(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getOrderStats();
    
    if (result.success) {
      setStats(result.data);
    }
  };

  // Update order status
  const handleUpdateStatus = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    
    if (result.success) {
      // Update local state
      setOrders(orders.map(order => 
        order._id === orderId ? result.data : order
      ));
      
      // Refresh stats
      fetchStats();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  // Get status badge color class
  const getStatusClass = (status) => {
    const classes = {
      pending: 'pending',
      preparing: 'preparing',
      ready: 'ready',
      completed: 'completed',
      cancelled: 'cancelled',
    };
    return classes[status] || 'pending';
  };

  // Get next status for order
  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'completed',
      completed: 'completed',
    };
    return statusFlow[currentStatus];
  };

  const getNextStatusLabel = (currentStatus) => {
    const labels = {
      pending: 'Start Preparing',
      preparing: 'Mark Ready',
      ready: 'Complete',
      completed: 'Completed',
    };
    return labels[currentStatus];
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  return (
    <div className="dashboard-page">
      {/* Ocean Blue Background */}
      <div className="ocean-bg">
        <div className="ocean-wave wave-1"></div>
        <div className="ocean-wave wave-2"></div>
        <div className="ocean-wave wave-3"></div>
      </div>

      <div className="container">
        {/* Dashboard Header */}
        <div className="dashboard-header fade-in">
          <div className="dashboard-title-section">
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="dashboard-actions">
            <button className="btn btn-glass" onClick={fetchDashboardData}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid - Ocean Blue Metallic Cards */}
        {stats && (
          <div className="stats-grid fade-in-delay-1">
            <div className="metallic-card stat-card">
              <div className="stat-icon"><Package size={48} /></div>
              <div className="stat-label">Today's Orders</div>
              <div className="stat-value">{stats.todayOrders || 0}</div>
              <div className="stat-change positive">
                Total: {stats.totalOrders || 0} all time
              </div>
            </div>

            <div className="metallic-card stat-card">
              <div className="stat-icon"><DollarSign size={48} /></div>
              <div className="stat-label">Revenue</div>
              <div className="stat-value">{formatPrice(stats.revenue?.totalRevenue || 0)}</div>
              <div className="stat-change positive">
                Today's earnings
              </div>
            </div>

            <div className="metallic-card stat-card">
              <div className="stat-icon"><BarChart3 size={48} /></div>
              <div className="stat-label">Avg Order Value</div>
              <div className="stat-value">{formatPrice(Math.round(stats.revenue?.avgOrder || 0))}</div>
              <div className="stat-change neutral">
                Per order average
              </div>
            </div>

            <div className="metallic-card stat-card">
              <div className="stat-icon"><Clock size={48} /></div>
              <div className="stat-label">Active Orders</div>
              <div className="stat-value">{stats.activeOrders || 0}</div>
              <div className="stat-change positive">
                {stats.statusBreakdown?.pending || 0} pending, {stats.statusBreakdown?.preparing || 0} preparing
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="dashboard-grid fade-in-delay-2">
          {/* Orders Section */}
          <div className="glass-card orders-section">
            <div className="section-header">
              <h2 className="section-title">Orders</h2>
              <div className="order-filters">
                <button
                  className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  All ({orders.length})
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('pending')}
                >
                  Pending ({orders.filter(o => o.status === 'pending').length})
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'preparing' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('preparing')}
                >
                  Preparing ({orders.filter(o => o.status === 'preparing').length})
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'ready' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('ready')}
                >
                  Ready ({orders.filter(o => o.status === 'ready').length})
                </button>
              </div>
            </div>

            <div className="orders-list">
              {loading ? (
                <div className="empty-state">
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p style={{ color: 'var(--text-gray)' }}>Loading orders...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="empty-state">
                  <div className="empty-state-icon">❌</div>
                  <p style={{ color: 'var(--text-dark)' }}>Error loading orders: {error}</p>
                  <button className="btn btn-primary mt-3" onClick={fetchOrders}>
                    Retry
                  </button>
                </div>
              ) : orders.length > 0 ? (
                orders.map(order => (
                  <div key={order._id} className="glass-card order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <h3>{order.orderNumber} - {order.tableNumber}</h3>
                        <p className="order-meta">{order.customerName} • {formatTimeAgo(order.createdAt)}</p>
                      </div>
                      <span className={`order-status ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="order-items">
                      {order.items.map((item, index) => (
                        <div key={index} className="order-item">
                          <span>{item.quantity}x {item.name}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="order-footer">
                      <div className="order-total">
                        Total: {formatPrice(order.total)}
                      </div>
                      <div className="order-actions">
                        {order.status !== 'completed' && (
                          <button
                            className="action-btn action-btn-primary"
                            onClick={() => handleUpdateStatus(order._id, getNextStatus(order.status))}
                          >
                            {getNextStatusLabel(order.status)}
                          </button>
                        )}
                        <button className="action-btn action-btn-secondary">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <p style={{ color: 'var(--text-dark)', fontWeight: '600' }}>No orders found</p>
                  <p style={{ fontSize: '14px', marginTop: '8px', color: 'var(--text-gray)' }}>
                    Orders will appear here once customers place them
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card activity-section">
            <div className="section-header">
              <h2 className="section-title">Quick Stats</h2>
            </div>

            {stats && stats.statusBreakdown && (
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: 'var(--text-dark)', fontSize: '16px', marginBottom: '12px', fontWeight: '600' }}>
                    Order Status Breakdown
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <span style={{ color: 'var(--text-gray)', fontSize: '14px' }}>Pending:</span>
                      <span style={{ color: 'var(--brand-primary)', fontWeight: '700', fontSize: '16px' }}>{stats.statusBreakdown.pending || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <span style={{ color: 'var(--text-gray)', fontSize: '14px' }}>Preparing:</span>
                      <span style={{ color: 'var(--brand-primary)', fontWeight: '700', fontSize: '16px' }}>{stats.statusBreakdown.preparing || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <span style={{ color: 'var(--text-gray)', fontSize: '14px' }}>Ready:</span>
                      <span style={{ color: 'var(--brand-primary)', fontWeight: '700', fontSize: '16px' }}>{stats.statusBreakdown.ready || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <span style={{ color: 'var(--text-gray)', fontSize: '14px' }}>Completed:</span>
                      <span style={{ color: 'var(--brand-primary)', fontWeight: '700', fontSize: '16px' }}>{stats.statusBreakdown.completed || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;