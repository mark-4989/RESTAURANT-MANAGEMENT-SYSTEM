import React, { useState, useEffect } from 'react';
import { getAllOrders, updateOrderStatus } from '../api/orderApi';
import '../styles/kds.css';

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterType, setFilterType] = useState('all'); // all, dine-in, pickup, delivery
  const [currentTime, setCurrentTime] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const fetchOrders = async () => {
    let status = '';
    
    if (filterStatus === 'active') {
      const result = await getAllOrders('all', '');
      if (result.success) {
        const activeOrders = result.data.filter(
          order => order.status === 'pending' || order.status === 'preparing'
        );
        
        if (soundEnabled && activeOrders.length > lastOrderCount) {
          playNotificationSound();
        }
        
        setLastOrderCount(activeOrders.length);
        setOrders(activeOrders);
      }
    } else if (filterStatus === 'all') {
      const result = await getAllOrders('all', '');
      if (result.success) {
        setOrders(result.data);
      }
    } else {
      const result = await getAllOrders(filterStatus, '');
      if (result.success) {
        setOrders(result.data);
      }
    }
  };

  const playNotificationSound = () => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.5);
  };

  const getElapsedTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = Math.floor((now - created) / 1000);
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    return {
      display: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      minutes,
      isWarning: minutes >= 15,
      isDanger: minutes >= 25,
    };
  };

  // Calculate priority time
  const getPriorityTime = (order) => {
    const now = new Date();
    let targetTime;

    if (order.orderType === 'pickup' && order.pickupDate && order.pickupTime) {
      const [hours, minutes] = order.pickupTime.split(':');
      targetTime = new Date(order.pickupDate);
      targetTime.setHours(parseInt(hours), parseInt(minutes));
    } else if (order.orderType === 'delivery' && order.deliveryDate && order.deliveryTime) {
      const [hours, minutes] = order.deliveryTime.split(':');
      targetTime = new Date(order.deliveryDate);
      targetTime.setHours(parseInt(hours), parseInt(minutes));
    } else if (order.orderType === 'preorder' && order.preorderDate && order.preorderTime) {
      const [hours, minutes] = order.preorderTime.split(':');
      targetTime = new Date(order.preorderDate);
      targetTime.setHours(parseInt(hours), parseInt(minutes));
    }

    if (!targetTime) return null;

    const diff = Math.floor((targetTime - now) / 1000 / 60); // minutes until target
    
    return {
      targetTime: targetTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      minutesUntil: diff,
      isUrgent: diff <= 15,
      isCritical: diff <= 5,
      isPast: diff < 0
    };
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    
    if (result.success) {
      setOrders(orders.map(order => 
        order._id === orderId ? result.data : order
      ));
      setTimeout(fetchOrders, 500);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleBump = async (orderId) => {
    await handleUpdateStatus(orderId, 'completed');
  };

  const getOrderClass = (order, elapsed, priority) => {
    let classes = ['kds-order-card'];
    
    if (order.status === 'pending') {
      classes.push('new');
    } else if (order.status === 'preparing') {
      classes.push('preparing');
    } else if (order.status === 'ready') {
      classes.push('ready');
    }
    
    if (elapsed.isDanger || (priority && priority.isCritical)) {
      classes.push('urgent');
    }
    
    return classes.join(' ');
  };

  const getActionButton = (order) => {
    if (order.status === 'pending') {
      return (
        <button
          className="kds-action-btn kds-btn-start"
          onClick={() => handleUpdateStatus(order._id, 'preparing')}
        >
          🔥 Start Cooking
        </button>
      );
    } else if (order.status === 'preparing') {
      return (
        <button
          className="kds-action-btn kds-btn-ready"
          onClick={() => handleUpdateStatus(order._id, 'ready')}
        >
          ✅ Mark Ready
        </button>
      );
    } else if (order.status === 'ready') {
      return (
        <button
          className="kds-action-btn kds-btn-bump"
          onClick={() => handleBump(order._id)}
        >
          👍 Bump (Served)
        </button>
      );
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

  // Filter orders by type
  const filteredOrders = filterType === 'all' 
    ? orders 
    : orders.filter(o => o.orderType === filterType);

  // Sort orders by priority (scheduled orders first, then by elapsed time)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const priorityA = getPriorityTime(a);
    const priorityB = getPriorityTime(b);
    
    // If both have scheduled times, sort by time until target
    if (priorityA && priorityB) {
      return priorityA.minutesUntil - priorityB.minutesUntil;
    }
    
    // Scheduled orders come first
    if (priorityA && !priorityB) return -1;
    if (!priorityA && priorityB) return 1;
    
    // Sort by creation time (oldest first)
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  return (
    <div className="kds-page">
      {/* Header */}
      <div className="kds-header">
        <div className="kds-title">
          <span>🍳 Kitchen Display</span>
          <div className="kds-live-indicator"></div>
        </div>
        
        <div className="kds-stats">
          <div className="kds-stat">
            <span className="kds-stat-value">{pendingCount}</span>
            <span className="kds-stat-label">New</span>
          </div>
          <div className="kds-stat">
            <span className="kds-stat-value">{preparingCount}</span>
            <span className="kds-stat-label">Cooking</span>
          </div>
          <div className="kds-stat">
            <span className="kds-stat-value">{readyCount}</span>
            <span className="kds-stat-label">Ready</span>
          </div>
        </div>

        <div className="kds-time">
          {currentTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="kds-filters">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className={`kds-filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            🔥 Active Orders
          </button>
          <button
            className={`kds-filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            ⏳ New Orders
          </button>
          <button
            className={`kds-filter-btn ${filterStatus === 'preparing' ? 'active' : ''}`}
            onClick={() => setFilterStatus('preparing')}
          >
            👨‍🍳 Cooking
          </button>
          <button
            className={`kds-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            📋 All
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          flexWrap: 'wrap',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ 
            color: 'rgba(255,255,255,0.6)', 
            fontSize: '14px', 
            fontWeight: 600,
            alignSelf: 'center',
            marginRight: '8px'
          }}>
            ORDER TYPE:
          </span>
          <button
            className={`kds-type-filter ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: filterType === 'all' ? '#667eea' : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            📋 All ({orders.length})
          </button>
          <button
            className={`kds-type-filter ${filterType === 'dine-in' ? 'active' : ''}`}
            onClick={() => setFilterType('dine-in')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: filterType === 'dine-in' ? '#667eea' : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🍽️ Dine-In ({orders.filter(o => o.orderType === 'dine-in').length})
          </button>
          <button
            className={`kds-type-filter ${filterType === 'pickup' ? 'active' : ''}`}
            onClick={() => setFilterType('pickup')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: filterType === 'pickup' ? '#10b981' : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🚗 Pickup ({orders.filter(o => o.orderType === 'pickup').length})
          </button>
          <button
            className={`kds-type-filter ${filterType === 'delivery' ? 'active' : ''}`}
            onClick={() => setFilterType('delivery')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: filterType === 'delivery' ? '#f59e0b' : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🚚 Delivery ({orders.filter(o => o.orderType === 'delivery').length})
          </button>
        </div>
      </div>

      {/* Sound Toggle */}
      <div 
        className={`kds-sound-indicator ${soundEnabled ? '' : 'muted'}`}
        onClick={() => setSoundEnabled(!soundEnabled)}
        style={{ cursor: 'pointer' }}
      >
        <span>{soundEnabled ? '🔔' : '🔕'}</span>
        <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
      </div>

      {/* Orders Grid */}
      {sortedOrders.length > 0 ? (
        <div className="kds-grid">
          {sortedOrders.map(order => {
            const elapsed = getElapsedTime(order.createdAt);
            const priority = getPriorityTime(order);
            
            return (
              <div key={order._id} className={getOrderClass(order, elapsed, priority)}>
                {/* Order Type Badge */}
                <div 
                  className="kds-order-type-badge"
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: getOrderTypeColor(order.orderType),
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 10
                  }}
                >
                  {getOrderTypeIcon(order.orderType)} {order.orderType.toUpperCase()}
                </div>

                {/* Header */}
                <div className="kds-order-header">
                  <div>
                    <div className="kds-order-number">{order.orderNumber}</div>
                    <div className="kds-table-info">
                      {order.orderType === 'dine-in' && order.tableNumber && `🍽️ ${order.tableNumber}`}
                      {order.orderType === 'pickup' && '🚗 Customer Pickup'}
                      {order.orderType === 'delivery' && '🚚 Delivery'}
                      {order.orderType === 'preorder' && '📅 Pre-Order'}
                      {' • '}{order.customerName}
                    </div>
                  </div>
                  <div className="kds-timer">
                    <div className={`kds-elapsed-time ${elapsed.isWarning ? 'warning' : ''} ${elapsed.isDanger ? 'danger' : ''}`}>
                      {elapsed.display}
                    </div>
                    <div className="kds-timer-label">Elapsed</div>
                  </div>
                </div>

                {/* Priority Time Info */}
                {priority && (
                  <div 
                    className="kds-priority-info"
                    style={{
                      padding: '10px',
                      background: priority.isCritical ? 'rgba(239, 68, 68, 0.2)' : 
                                  priority.isUrgent ? 'rgba(245, 158, 11, 0.2)' : 
                                  'rgba(59, 130, 246, 0.2)',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      border: `2px solid ${
                        priority.isCritical ? '#ef4444' : 
                        priority.isUrgent ? '#f59e0b' : 
                        '#3b82f6'
                      }`
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      color: 'white',
                      fontWeight: 700
                    }}>
                      <span style={{ fontSize: '14px' }}>
                        {order.orderType === 'pickup' && '🚗 Pickup Time:'}
                        {order.orderType === 'delivery' && '🚚 Delivery Time:'}
                        {order.orderType === 'preorder' && '📅 Scheduled For:'}
                      </span>
                      <span style={{ fontSize: '16px' }}>
                        {priority.targetTime}
                      </span>
                    </div>
                    <div style={{ 
                      marginTop: '4px', 
                      fontSize: '13px',
                      color: priority.isPast ? '#ef4444' : 
                             priority.isCritical ? '#fca5a5' : 
                             'rgba(255,255,255,0.8)',
                      fontWeight: 600
                    }}>
                      {priority.isPast ? (
                        `⚠️ OVERDUE by ${Math.abs(priority.minutesUntil)} minutes!`
                      ) : priority.isCritical ? (
                        `🚨 URGENT - ${priority.minutesUntil} minutes left!`
                      ) : priority.isUrgent ? (
                        `⏰ ${priority.minutesUntil} minutes until ${order.orderType} time`
                      ) : (
                        `⏱️ ${priority.minutesUntil} minutes until ${order.orderType} time`
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Order Details */}
                {(order.pickupPhone || order.deliveryPhone || order.deliveryAddress) && (
                  <div style={{ 
                    marginBottom: '12px', 
                    padding: '8px', 
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.8)'
                  }}>
                    {order.pickupPhone && (
                      <div>📱 {order.pickupPhone}</div>
                    )}
                    {order.deliveryPhone && (
                      <div>📱 {order.deliveryPhone}</div>
                    )}
                    {order.deliveryAddress && (
                      <div>📍 {order.deliveryAddress.substring(0, 50)}...</div>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="kds-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="kds-item">
                      <div className="kds-item-qty">{item.quantity}×</div>
                      <div className="kds-item-details">
                        <div className="kds-item-name">{item.name}</div>
                        {item.specialInstructions && (
                          <div className="kds-item-instructions">
                            💬 {item.specialInstructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="kds-actions">
                  {getActionButton(order)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="kds-empty">
          <div className="kds-empty-icon">✨</div>
          <div className="kds-empty-text">All Caught Up!</div>
          <div className="kds-empty-subtext">
            No orders to prepare right now. New orders will appear here automatically.
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;