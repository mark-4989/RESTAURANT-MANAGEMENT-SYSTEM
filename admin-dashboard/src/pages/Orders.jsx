// admin-dashboard/src/pages/Orders.jsx (UPDATED - CARD LAYOUT)
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import '../styles/orders.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeSection, setActiveSection] = useState('all');

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`);
      const data = await response.json();
      
      if (data.success) {
        const sortedOrders = data.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setOrders(sortedOrders);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`✅ Order status updated to ${newStatus}`);
        fetchOrders();
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(data.data);
        }
      } else {
        toast.error(`❌ ${data.message || 'Failed to update status'}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    }
  };

  const getOrderTypeIcon = (type) => {
    const icons = {
      'dine-in': '🍽️',
      'pickup': '🚗',
      'delivery': '🚚',
      'preorder': '📅'
    };
    return icons[type] || '📋';
  };

  const getOrderTypeColor = (type) => {
    const colors = {
      'dine-in': '#667eea',
      'pickup': '#10b981',
      'delivery': '#f59e0b',
      'preorder': '#8b5cf6'
    };
    return colors[type] || '#6b7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✅',
      preparing: '👨‍🍳',
      ready: '🔔',
      completed: '✔',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      preparing: '#8b5cf6',
      ready: '#10b981',
      completed: '#6b7280',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const dineInOrders = orders.filter(o => o.orderType === 'dine-in');
  const pickupOrders = orders.filter(o => o.orderType === 'pickup');
  const deliveryOrders = orders.filter(o => o.orderType === 'delivery');
  const preorderOrders = orders.filter(o => o.orderType === 'preorder');

  const filterByStatus = (ordersList) => {
    if (filterStatus === 'all') return ordersList;
    return ordersList.filter(o => o.status === filterStatus);
  };

  const filterBySearch = (ordersList) => {
    if (!searchQuery) return ordersList;
    return ordersList.filter(order =>
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const applyFilters = (ordersList) => {
    return filterBySearch(filterByStatus(ordersList));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatPrice = (price) => {
    return `KSh ${price.toLocaleString()}`;
  };

  const OrderCard = ({ order }) => (
    <div className="order-card" onClick={() => setSelectedOrder(order)}>
      <div className="order-card-header">
        <div className="order-header-top">
          <span className="order-number">{order.orderNumber}</span>
          <span className={`status-badge ${order.status}`}>
            {getStatusIcon(order.status)} {order.status}
          </span>
        </div>
        <span className="order-type-badge" style={{ background: getOrderTypeColor(order.orderType) }}>
          {getOrderTypeIcon(order.orderType)} {order.orderType}
        </span>
      </div>

      <div className="order-card-body">
        <div className="customer-section">
          <h3 className="customer-name">{order.customerName}</h3>
          {order.customerEmail && (
            <p className="customer-email">📧 {order.customerEmail}</p>
          )}
        </div>

        <div className="order-details">
          {order.orderType === 'dine-in' && order.tableNumber && (
            <div className="detail-item">
              <span className="detail-icon">🍽️</span>
              <span>Table {order.tableNumber}</span>
            </div>
          )}
          
          {order.orderType === 'pickup' && (
            <>
              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <span>{order.pickupDate && new Date(order.pickupDate).toLocaleDateString()} at {order.pickupTime}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">📱</span>
                <span>{order.pickupPhone}</span>
              </div>
            </>
          )}
          
          {order.orderType === 'delivery' && (
            <>
              <div className="detail-item">
                <span className="detail-icon">📍</span>
                <span>{order.deliveryAddress?.substring(0, 50)}...</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">📱</span>
                <span>{order.deliveryPhone}</span>
              </div>
            </>
          )}
          
          {order.orderType === 'preorder' && (
            <>
              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <span>{order.preorderDate && new Date(order.preorderDate).toLocaleDateString()} at {order.preorderTime}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">📱</span>
                <span>{order.preorderPhone}</span>
              </div>
            </>
          )}
        </div>

        <div className="order-items-summary">
          <span className="items-count">{order.items.length} items</span>
          <span className="order-total">{formatPrice(order.total)}</span>
        </div>

        <div className="order-time">
          <span>🕒 {formatDate(order.createdAt)}</span>
        </div>
      </div>

      <div className="order-card-footer">
        <button className="view-details-btn">
          View Full Details →
        </button>
      </div>
    </div>
  );

  const OrderSection = ({ title, icon, orders, color }) => {
    const filteredOrders = applyFilters(orders);
    
    if (filteredOrders.length === 0 && activeSection !== 'all') return null;

    return (
      <div className="order-section">
        <div className="section-header" style={{ borderLeftColor: color }}>
          <h2>
            <span className="section-icon">{icon}</span>
            {title}
          </h2>
          <span className="section-count">{filteredOrders.length} orders</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="no-orders-section">
            <span className="no-orders-icon">{icon}</span>
            <p>No {title.toLowerCase()} found</p>
          </div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.map(order => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>📋 Order Management</h1>
        <p>Manage and track all your orders in real-time</p>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search by order number or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Order Type:</label>
          <div className="type-filters">
            <button
              className={`type-filter-btn ${activeSection === 'all' ? 'active' : ''}`}
              onClick={() => setActiveSection('all')}
            >
              All ({orders.length})
            </button>
            <button
              className={`type-filter-btn ${activeSection === 'dine-in' ? 'active' : ''}`}
              onClick={() => setActiveSection('dine-in')}
            >
              🍽️ Dine-In ({dineInOrders.length})
            </button>
            <button
              className={`type-filter-btn ${activeSection === 'pickup' ? 'active' : ''}`}
              onClick={() => setActiveSection('pickup')}
            >
              🚗 Pickup ({pickupOrders.length})
            </button>
            <button
              className={`type-filter-btn ${activeSection === 'delivery' ? 'active' : ''}`}
              onClick={() => setActiveSection('delivery')}
            >
              🚚 Delivery ({deliveryOrders.length})
            </button>
            <button
              className={`type-filter-btn ${activeSection === 'preorder' ? 'active' : ''}`}
              onClick={() => setActiveSection('preorder')}
            >
              📅 Pre-Order ({preorderOrders.length})
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button className="refresh-btn" onClick={fetchOrders}>
          🔄 Refresh
        </button>
      </div>

      <div className="orders-container">
        {(activeSection === 'all' || activeSection === 'dine-in') && (
          <OrderSection 
            title="Dine-In Orders" 
            icon="🍽️" 
            orders={dineInOrders}
            color="#667eea"
          />
        )}

        {(activeSection === 'all' || activeSection === 'pickup') && (
          <OrderSection 
            title="Pickup Orders" 
            icon="🚗" 
            orders={pickupOrders}
            color="#10b981"
          />
        )}

        {(activeSection === 'all' || activeSection === 'delivery') && (
          <OrderSection 
            title="Delivery Orders" 
            icon="🚚" 
            orders={deliveryOrders}
            color="#f59e0b"
          />
        )}

        {(activeSection === 'all' || activeSection === 'preorder') && (
          <OrderSection 
            title="Pre-Orders" 
            icon="📅" 
            orders={preorderOrders}
            color="#8b5cf6"
          />
        )}
      </div>

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details - {selectedOrder.orderNumber}</h2>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="order-detail-section">
                <h3>Order Information</h3>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="detail-label">Order Type:</span>
                    <span className="order-type-badge" style={{ background: getOrderTypeColor(selectedOrder.orderType) }}>
                      {getOrderTypeIcon(selectedOrder.orderType)} {selectedOrder.orderType}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge ${selectedOrder.status}`}>
                      {getStatusIcon(selectedOrder.status)} {selectedOrder.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Customer:</span>
                    <span className="detail-value">{selectedOrder.customerName}</span>
                  </div>
                  {selectedOrder.customerEmail && (
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedOrder.customerEmail}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Order Time:</span>
                    <span className="detail-value">{formatDate(selectedOrder.createdAt)}</span>
                  </div>

                  {selectedOrder.orderType === 'dine-in' && selectedOrder.tableNumber && (
                    <div className="detail-row">
                      <span className="detail-label">Table Number:</span>
                      <span className="detail-value">{selectedOrder.tableNumber}</span>
                    </div>
                  )}

                  {selectedOrder.orderType === 'pickup' && (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Pickup Date:</span>
                        <span className="detail-value">{selectedOrder.pickupDate && new Date(selectedOrder.pickupDate).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Pickup Time:</span>
                        <span className="detail-value">{selectedOrder.pickupTime}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{selectedOrder.pickupPhone}</span>
                      </div>
                    </>
                  )}

                  {selectedOrder.orderType === 'delivery' && (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Delivery Address:</span>
                        <span className="detail-value">{selectedOrder.deliveryAddress}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{selectedOrder.deliveryPhone}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Delivery Date:</span>
                        <span className="detail-value">{selectedOrder.deliveryDate && new Date(selectedOrder.deliveryDate).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Delivery Time:</span>
                        <span className="detail-value">{selectedOrder.deliveryTime}</span>
                      </div>
                    </>
                  )}

                  {selectedOrder.orderType === 'preorder' && (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Pre-order Date:</span>
                        <span className="detail-value">{selectedOrder.preorderDate && new Date(selectedOrder.preorderDate).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Pre-order Time:</span>
                        <span className="detail-value">{selectedOrder.preorderTime}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{selectedOrder.preorderPhone}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="order-detail-section">
                <h3>Order Items</h3>
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="item-detail">
                    <div className="item-detail-info">
                      <span className="item-qty">{item.quantity}x</span>
                      <span className="item-name">{item.name}</span>
                    </div>
                    <span className="item-price">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="order-detail-section">
                <h3>Order Summary</h3>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="detail-label">Subtotal:</span>
                    <span className="detail-value">{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tax (16%):</span>
                    <span className="detail-value">{formatPrice(selectedOrder.tax)}</span>
                  </div>
                  {selectedOrder.deliveryFee > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Delivery Fee:</span>
                      <span className="detail-value">{formatPrice(selectedOrder.deliveryFee)}</span>
                    </div>
                  )}
                  <div className="detail-row total-row">
                    <span className="detail-label">Total:</span>
                    <span className="detail-value">{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="order-detail-section">
                <h3>Update Order Status</h3>
                <div className="status-buttons">
                  {['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'].map(status => (
                    <button 
                      key={status}
                      className={`status-btn ${status}`}
                      onClick={() => updateOrderStatus(selectedOrder._id, status)}
                      disabled={selectedOrder.status === status}
                    >
                      {getStatusIcon(status)} {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;