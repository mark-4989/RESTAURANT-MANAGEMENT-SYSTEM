// waiter-app/src/pages/MyOrders.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import socketService from '../services/socketService';
import '../styles/my-orders.css';

const MyOrders = ({ staff }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchMyOrders();
    
    // Connect to WebSocket
    socketService.connect();

    // Listen for order status updates
    socketService.on('orderStatusUpdated', (updatedOrder) => {
      if (updatedOrder.createdBy === staff._id) {
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === updatedOrder._id ? updatedOrder : order
          )
        );
        toast.info(`Order ${updatedOrder.orderNumber} is now ${updatedOrder.status}`);
      }
    });

    return () => {
      socketService.disconnect();
    };
  }, [staff]);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/orders');
      const data = await response.json();

      if (data.success) {
        const myOrders = data.data
          .filter(o => o.createdBy === staff._id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(myOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async (order) => {
    try {
      const response = await fetch(`http://localhost:5000/api/receipts/${order._id}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${order.orderNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Receipt downloaded!');
      } else {
        toast.error('Failed to generate receipt');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
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

  const formatPrice = (price) => `KSh ${price.toLocaleString()}`;

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'active') {
      return ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);
    }
    if (filter === 'completed') {
      return order.status === 'completed';
    }
    return true;
  });

  if (loading) {
    return (
      <div className="my-orders-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      <div className="orders-header">
        <h1>📦 My Orders</h1>
        <p>{orders.length} total orders</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({orders.length})
        </button>
        <button
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length})
        </button>
        <button
          className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({orders.filter(o => o.status === 'completed').length})
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔭</div>
          <h3>No orders found</h3>
          <p>Orders you create will appear here</p>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Table</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order._id}>
                  <td className="order-number">{order.orderNumber}</td>
                  <td>{order.tableNumber}</td>
                  <td>{order.customerName}</td>
                  <td>{order.items.length} items</td>
                  <td className="total">{formatPrice(order.total)}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="time">{formatDate(order.createdAt)}</td>
                  <td className="actions">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="action-btn view"
                      title="View Details"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handlePrintReceipt(order)}
                      className="action-btn print"
                      title="Print Receipt"
                    >
                      🖨️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details - {selectedOrder.orderNumber}</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="order-detail-section">
                <h3>📋 Order Information</h3>
                <div className="detail-row">
                  <span>Order Number:</span>
                  <span><strong>{selectedOrder.orderNumber}</strong></span>
                </div>
                <div className="detail-row">
                  <span>Table:</span>
                  <span>{selectedOrder.tableNumber}</span>
                </div>
                <div className="detail-row">
                  <span>Customer:</span>
                  <span>{selectedOrder.customerName}</span>
                </div>
                <div className="detail-row">
                  <span>Status:</span>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(selectedOrder.status) }}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Created:</span>
                  <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="order-detail-section">
                <h3>🍽️ Order Items</h3>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="item-detail">
                    <div className="item-detail-info">
                      <span className="item-qty">{item.quantity}x</span>
                      <span className="item-name">{item.name}</span>
                    </div>
                    <span className="item-price">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="order-detail-section">
                <h3>💰 Payment Details</h3>
                <div className="detail-row">
                  <span>Subtotal:</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="detail-row">
                  <span>Tax (16%):</span>
                  <span>{formatPrice(selectedOrder.tax)}</span>
                </div>
                <div className="detail-row total-row">
                  <span>Total:</span>
                  <span><strong>{formatPrice(selectedOrder.total)}</strong></span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => handlePrintReceipt(selectedOrder)}
                  className="btn-print"
                >
                  🖨️ Print Receipt
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="btn-close"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;