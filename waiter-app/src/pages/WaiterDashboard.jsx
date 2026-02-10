// waiter-app/src/pages/WaiterDashboard.jsx
import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import '../styles/dashboard.css';

const WaiterDashboard = ({ staff, onNavigate }) => {
  const [stats, setStats] = useState({
    myOrders: 0,
    activeOrders: 0,
    completedToday: 0,
    totalEarned: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (staff) {
      fetchDashboardData();
      
      // Connect to WebSocket
      socketService.connect();

      // Listen for new orders
      socketService.on('newOrder', (order) => {
        if (order.createdBy === staff._id) {
          fetchDashboardData();
        }
      });

      // Listen for order status updates
      socketService.on('orderStatusUpdated', (order) => {
        if (order.createdBy === staff._id) {
          fetchDashboardData();
        }
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [staff]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/orders');
      const data = await response.json();

      if (data.success) {
        const myOrders = data.data.filter(o => o.createdBy === staff._id);
        const today = new Date().toDateString();
        const todayOrders = myOrders.filter(o => 
          new Date(o.createdAt).toDateString() === today
        );

        setStats({
          myOrders: myOrders.length,
          activeOrders: myOrders.filter(o => 
            ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
          ).length,
          completedToday: todayOrders.filter(o => o.status === 'completed').length,
          totalEarned: todayOrders.reduce((sum, o) => sum + o.total, 0)
        });

        setActiveOrders(
          myOrders
            .filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        );

        setRecentOrders(
          myOrders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      preparing: '#8b5cf6',
      ready: '#10b981',
      completed: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const formatPrice = (price) => {
    return `KSh ${price.toLocaleString()}`;
  };

  const formatTime = (date) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffMinutes = Math.floor((now - orderDate) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return orderDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="waiter-dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="waiter-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {staff.firstName}! 👋</h1>
          <p>Here's your activity today</p>
        </div>
        <button 
          onClick={() => onNavigate('create-order')}
          className="btn-primary-large"
        >
          ➕ Create New Order
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{stats.myOrders}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeOrders}</div>
            <div className="stat-label">Active Orders</div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completedToday}</div>
            <div className="stat-label">Completed Today</div>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatPrice(stats.totalEarned)}</div>
            <div className="stat-label">Earned Today</div>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      <div className="section">
        <div className="section-header">
          <h2>🔥 Active Orders</h2>
          <button 
            onClick={() => onNavigate('my-orders')}
            className="btn-link"
          >
            View All →
          </button>
        </div>

        {activeOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔭</div>
            <h3>No active orders</h3>
            <p>Create a new order to get started!</p>
            <button 
              onClick={() => onNavigate('create-order')}
              className="btn-primary"
            >
              ➕ Create Order
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {activeOrders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-card-header">
                  <div className="order-number">
                    {order.orderNumber}
                  </div>
                  <div 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {order.status}
                  </div>
                </div>

                <div className="order-card-body">
                  <div className="order-info">
                    <span className="info-label">📍 Table:</span>
                    <span className="info-value">{order.tableNumber}</span>
                  </div>
                  <div className="order-info">
                    <span className="info-label">👤 Customer:</span>
                    <span className="info-value">{order.customerName}</span>
                  </div>
                  <div className="order-info">
                    <span className="info-label">🕐 Time:</span>
                    <span className="info-value">{formatTime(order.createdAt)}</span>
                  </div>
                  <div className="order-info">
                    <span className="info-label">💵 Total:</span>
                    <span className="info-value-large">{formatPrice(order.total)}</span>
                  </div>
                </div>

                <div className="order-items-preview">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="item-preview">
                      <span>{item.quantity}x</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="item-preview more">
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="section">
        <div className="section-header">
          <h2>📋 Recent Orders</h2>
        </div>

        <div className="recent-orders-table">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Table</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order._id}>
                  <td className="order-number-cell">{order.orderNumber}</td>
                  <td>{order.tableNumber}</td>
                  <td>{order.customerName}</td>
                  <td>{order.items.length} items</td>
                  <td className="total-cell">{formatPrice(order.total)}</td>
                  <td>
                    <span 
                      className="status-badge-small"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="time-cell">{formatTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            onClick={() => onNavigate('create-order')}
            className="action-btn"
          >
            <span className="action-icon">➕</span>
            <span>New Order</span>
          </button>
          <button 
            onClick={() => onNavigate('my-orders')}
            className="action-btn"
          >
            <span className="action-icon">📦</span>
            <span>My Orders</span>
          </button>
          <button 
            onClick={fetchDashboardData}
            className="action-btn"
          >
            <span className="action-icon">🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaiterDashboard;