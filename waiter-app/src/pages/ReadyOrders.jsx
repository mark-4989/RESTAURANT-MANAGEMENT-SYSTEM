// waiter-app/src/pages/ReadyOrders.jsx
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import socketService from '../services/socketService';
import '../styles/ready-orders.css';

const ReadyOrders = () => {
  const [readyOrders, setReadyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Load ready orders
  const loadReadyOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/orders?status=ready');
      const data = await response.json();
      
      if (data.success) {
        setReadyOrders(data.data);
      }
    } catch (error) {
      console.error('Error loading ready orders:', error);
      toast.error('Failed to load ready orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadyOrders();

    // Connect to WebSocket
    socketService.connect();

    // Listen for order status updates
    socketService.on('orderStatusUpdated', (order) => {
      if (order.status === 'ready') {
        // Play sound notification
        if (audioEnabled) {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE=');
          audio.play().catch(e => console.log('Audio play failed:', e));
        }

        // Show toast notification
        toast.success(`🔔 Order ${order.orderNumber} is ready for Table ${order.tableNumber}!`, {
          autoClose: 5000,
          position: 'top-center'
        });

        // Add to ready orders list
        setReadyOrders(prev => {
          const exists = prev.find(o => o._id === order._id);
          if (exists) {
            return prev.map(o => o._id === order._id ? order : o);
          }
          return [order, ...prev];
        });
      } else if (order.status === 'completed') {
        // Remove from ready orders when marked as served
        setReadyOrders(prev => prev.filter(o => o._id !== order._id));
      }
    });

    return () => {
      socketService.disconnect();
    };
  }, [audioEnabled]);

  // Mark order as served (completed)
  const markAsServed = async (orderId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Order marked as served!');
        setReadyOrders(prev => prev.filter(o => o._id !== orderId));
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error marking order as served:', error);
      toast.error('Failed to update order status');
    }
  };

  // Format time ago
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="ready-orders-page">
        <div className="loading">Loading ready orders...</div>
      </div>
    );
  }

  return (
    <div className="ready-orders-page">
      <div className="ready-orders-header">
        <div>
          <h1>🔔 Ready Orders</h1>
          <p>Orders ready for pickup and delivery to customers</p>
        </div>
        <div className="header-controls">
          <button
            className={`sound-toggle ${audioEnabled ? 'enabled' : 'disabled'}`}
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
          </button>
          <div className="order-count">
            <span className="count-badge">{readyOrders.length}</span>
            <span>Ready Orders</span>
          </div>
        </div>
      </div>

      {readyOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h2>All Caught Up!</h2>
          <p>No orders waiting for pickup</p>
          <small>Orders will appear here when kitchen marks them as ready</small>
        </div>
      ) : (
        <div className="ready-orders-grid">
          {readyOrders.map((order) => (
            <div 
              key={order._id} 
              className="ready-order-card pulse-animation"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="order-card-header">
                <div className="order-number">
                  {order.orderNumber}
                </div>
                <div className="ready-badge">
                  🔔 READY
                </div>
              </div>

              <div className="order-card-body">
                <div className="table-info">
                  <div className="table-number">
                    📍 Table {order.tableNumber}
                  </div>
                  <div className="time-ready">
                    ⏰ {getTimeAgo(order.updatedAt)}
                  </div>
                </div>

                <div className="customer-info">
                  <strong>👤 {order.customerName}</strong>
                </div>

                <div className="items-summary">
                  <div className="items-count">
                    📦 {order.items.length} item{order.items.length > 1 ? 's' : ''}
                  </div>
                  <div className="items-preview">
                    {order.items.slice(0, 2).map((item, index) => (
                      <div key={index} className="item-preview">
                        • {item.quantity}x {item.name}
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div className="item-preview more">
                        +{order.items.length - 2} more items
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="serve-button"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsServed(order._id);
                }}
              >
                ✅ Mark as Served
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details - {selectedOrder.orderNumber}</h2>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="order-detail-section">
                <h3>📍 Delivery Information</h3>
                <div className="detail-row">
                  <span>Table Number:</span>
                  <strong>Table {selectedOrder.tableNumber}</strong>
                </div>
                <div className="detail-row">
                  <span>Customer Name:</span>
                  <strong>{selectedOrder.customerName}</strong>
                </div>
                <div className="detail-row">
                  <span>Ready Time:</span>
                  <strong>{new Date(selectedOrder.updatedAt).toLocaleTimeString()}</strong>
                </div>
              </div>

              <div className="order-detail-section">
                <h3>📦 Order Items</h3>
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="item-detail">
                    <div className="item-detail-info">
                      <span className="item-qty">{item.quantity}x</span>
                      <span className="item-name">{item.name}</span>
                    </div>
                    <span className="item-price">
                      KES {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="order-detail-section">
                <h3>💰 Order Summary</h3>
                <div className="detail-row">
                  <span>Subtotal:</span>
                  <strong>KES {selectedOrder.subtotal?.toLocaleString() || '0'}</strong>
                </div>
                <div className="detail-row">
                  <span>Tax:</span>
                  <strong>KES {selectedOrder.tax?.toLocaleString() || '0'}</strong>
                </div>
                <div className="detail-row total-row">
                  <span>Total:</span>
                  <strong>KES {selectedOrder.total?.toLocaleString() || '0'}</strong>
                </div>
              </div>

              {selectedOrder.specialInstructions && (
                <div className="order-detail-section">
                  <h3>📝 Special Instructions</h3>
                  <p className="special-instructions">{selectedOrder.specialInstructions}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-serve"
                onClick={() => markAsServed(selectedOrder._id)}
              >
                ✅ Mark as Served
              </button>
              <button className="btn-close" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadyOrders;