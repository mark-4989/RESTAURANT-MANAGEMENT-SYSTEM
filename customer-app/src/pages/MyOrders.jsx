// customer-app/src/pages/MyOrders.jsx - COMPLETE THEME-ENABLED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { MapPin, X, Navigation, Phone, Package, Clock, Radio, Truck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext'; // ← NEW
import '../styles/MyOrders.css';

// Strip trailing /api if the env var includes it, so we never get /api/api/
const _RAW_URL  = import.meta.env.VITE_API_URL || 'https://restaurant-management-system-1-7v0m.onrender.com';
const API_URL   = _RAW_URL.replace(/\/api\/?$/, '');
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'https://restaurant-management-system-1-7v0m.onrender.com').replace(/\/api\/?$/, '');

// ── Notification messages per status (mirrors backend getMessage) ─────────────
const STATUS_MESSAGES = {
  confirmed: (n, t) => ({
    delivery:  `Great news! Your delivery order #${n} is confirmed and queued for the kitchen. 🙌`,
    pickup:    `Your pickup order #${n} is confirmed! We'll let you know when it's ready. 🙌`,
    'dine-in': `Your dine-in order #${n} is confirmed! Our team is on it. 😊`,
    preorder:  `Your pre-order #${n} is confirmed! We'll start preparing at the right time. ⏰`,
  }[t] || `Your order #${n} has been confirmed! 🙌`,
  preparing: (n) => `Our chef is now preparing your order #${n} with love and care. 🔥`,
  ready: (n, t) => ({
    delivery:  `Your order #${n} is packed and ready — the driver will pick it up shortly! 🚚`,
    pickup:    `Your order #${n} is hot and ready for pickup! Come grab it while it's fresh. 🍽️`,
    'dine-in': `Your order #${n} is on its way to your table right now! Enjoy. 🍽️`,
    preorder:  `Your pre-order #${n} is ready! 🎉`,
  }[t] || `Your order #${n} is ready! 🍽️`,
  completed: (n) => `Your order #${n} is complete. Thank you for dining with us! ⭐`,
  cancelled: (n) => `Your order #${n} has been cancelled. Contact us if you need help. 💙`,
  'on-the-way': (n) => `Your order #${n} is on its way — the driver is heading to you now! 🚚`,
  delivered:    (n) => `Your order #${n} has arrived! Bon appétit! 🏠❤️`,
};

// Map kitchen status → notification type
const STATUS_TO_TYPE = {
  confirmed:    'ORDER_CONFIRMED',
  preparing:    'PREPARING',
  ready:        'READY',
  completed:    'DELIVERED',
  cancelled:    'CANCELLED',
};

const MyOrders = () => {
  const { user } = useUser();
  const { addNotification } = useNotifications(); // ← NEW

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const socketRef = useRef(null);
  const driverTrailRef = useRef([]);

  // ← NEW: tracks last-known status of each order so we only notify on changes
  const prevStatusRef = useRef({}); // { [orderId]: { status, deliveryStatus } }

  useEffect(() => {
    if (user) {
      fetchOrders();
      loadMapboxScript();
      initializeWebSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const initializeWebSocket = () => {
    import('socket.io-client').then(({ io }) => {
      const socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('📡 Connected to tracking server');
      });

      socket.on('DRIVER_LOCATION_UPDATE', (data) => {
        if (trackingOrder && data.orderId === trackingOrder._id) {
          setDriverLocation(data.location);
          updateDriverMarker(data.location);
        }
      });

      // When kitchen updates an order, re-fetch orders — the comparison
      // logic in fetchOrders will detect status changes and fire notifications.
      socket.on('ORDER_STATUS_UPDATE',    () => fetchOrders());
      socket.on('DELIVERY_STATUS_UPDATE', () => fetchOrders());

      socket.on('connect_error', (err) => {
        console.error('📡 Socket connection error:', err.message);
      });
    }).catch(err => console.error('Socket.IO client error:', err));
  };

  const loadMapboxScript = () => {
    if (!window.mapboxgl) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      script.async = true;
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  };

  const fetchOrders = async () => {
    try {
      const customerId   = user.id;
      const customerName = user.fullName || user.firstName || 'Guest';

      const response = await fetch(
        `${API_URL}/api/orders?customerId=${encodeURIComponent(customerId)}&customerName=${encodeURIComponent(customerName)}`
      );
      const data = await response.json();
      
      if (data.success) {
        const sortedOrders = data.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );

        // ── NEW: compare each order's status against what we saw last time ──────
        // isFirstLoad = true on the very first fetch — just snapshot, no notifications.
        // On every subsequent fetch, compare and fire a notification for each change.
        const prev = prevStatusRef.current;
        const isFirstLoad = Object.keys(prev).length === 0;

        sortedOrders.forEach(order => {
          const id = order._id;
          const newStatus      = order.status;
          const newDelivStatus = order.deliveryStatus;
          const orderNum       = order.orderNumber;
          const orderType      = order.orderType;

          if (!isFirstLoad) {
            // Kitchen status changed
            if (prev[id] && prev[id].status !== newStatus) {
              const notifType = STATUS_TO_TYPE[newStatus];
              const msgFn     = STATUS_MESSAGES[newStatus];
              if (notifType && msgFn) {
                addNotification(notifType, {
                  orderId:     id,
                  orderNumber: orderNum,
                  orderType,
                  message: msgFn(orderNum, orderType),
                });
              }
            }

            // Delivery status changed (on-the-way / delivered)
            if (prev[id] && prev[id].deliveryStatus !== newDelivStatus) {
              const msgFn = STATUS_MESSAGES[newDelivStatus];
              if (msgFn) {
                const type = newDelivStatus === 'delivered' ? 'DELIVERED' : 'ON_THE_WAY';
                addNotification(type, {
                  orderId:     id,
                  orderNumber: orderNum,
                  orderType,
                  message: msgFn(orderNum, orderType),
                });
              }
            }
          }

          // Always update the snapshot
          prev[id] = { status: newStatus, deliveryStatus: newDelivStatus };
        });

        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = (order) => {
    if (!mapRef.current || !window.mapboxgl || !order.deliveryLng || !order.deliveryLat) return;

    const mapboxgl = window.mapboxgl;
    mapboxgl.accessToken = 'pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA';

    if (mapInstanceRef.current) mapInstanceRef.current.remove();

    driverTrailRef.current = [];

    mapInstanceRef.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [order.deliveryLng, order.deliveryLat],
      zoom: 14,
      pitch: 50,
      bearing: -10,
    });

    mapInstanceRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstanceRef.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    mapInstanceRef.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    mapInstanceRef.current.on('load', () => {
      mapInstanceRef.current.addSource('driver-trail', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
      });
      mapInstanceRef.current.addLayer({
        id: 'driver-trail-layer',
        type: 'line',
        source: 'driver-trail',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#f97316',
          'line-width': 4,
          'line-opacity': 0.85,
          'line-dasharray': [2, 1.5],
        },
      });
    });

    const destEl = document.createElement('div');
    destEl.innerHTML = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="
          width:44px;height:44px;background:linear-gradient(135deg,#ef4444,#dc2626);
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 20px rgba(239,68,68,0.5);border:3px solid #fff;
        ">
          <span style="transform:rotate(45deg);font-size:20px;">🏠</span>
        </div>
        <div style="
          margin-top:5px;background:#ef4444;color:#fff;font-size:10px;font-weight:800;
          padding:3px 10px;border-radius:10px;white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.2);
        ">YOUR LOCATION</div>
      </div>
    `;
    destEl.style.cursor = 'pointer';

    destinationMarkerRef.current = new mapboxgl.Marker({ element: destEl, anchor: 'bottom' })
      .setLngLat([order.deliveryLng, order.deliveryLat])
      .setPopup(
        new mapboxgl.Popup({ offset: 30, closeButton: false }).setHTML(`
          <div style="
            padding:14px 16px;background:#fff;border-radius:12px;
            font-family:system-ui,sans-serif;min-width:220px;
            box-shadow:0 8px 30px rgba(0,0,0,0.12);
          ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:10px;height:10px;background:#ef4444;border-radius:50%;"></div>
              <strong style="color:#111;font-size:13px;">Your Delivery Address</strong>
            </div>
            <div style="color:#555;font-size:12px;line-height:1.5;">${order.deliveryAddress}</div>
          </div>
        `)
      )
      .addTo(mapInstanceRef.current);

    if (driverLocation) {
      updateDriverMarker(driverLocation);
    }
  };

  const updateDriverMarker = (location) => {
    if (!mapInstanceRef.current || !window.mapboxgl) return;

    driverTrailRef.current.push([location.lng, location.lat]);
    if (mapInstanceRef.current.getSource('driver-trail')) {
      mapInstanceRef.current.getSource('driver-trail').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: driverTrailRef.current },
      });
    }

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([location.lng, location.lat]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="
            width:48px;height:48px;
            background:linear-gradient(135deg,#10b981,#059669);
            border-radius:50%;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 0 5px rgba(16,185,129,0.25),0 4px 20px rgba(16,185,129,0.5);
            border:3px solid #fff;font-size:22px;cursor:pointer;
          ">🛵</div>
          <div style="
            margin-top:4px;background:#10b981;color:#fff;font-size:10px;font-weight:800;
            padding:3px 8px;border-radius:10px;white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.2);
          ">DRIVER</div>
        </div>
      `;
      el.style.cursor = 'pointer';

      driverMarkerRef.current = new window.mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new window.mapboxgl.Popup({ offset: 30, closeButton: false }).setHTML(`
            <div style="
              padding:14px 16px;background:#fff;border-radius:12px;
              font-family:system-ui,sans-serif;min-width:190px;
              box-shadow:0 8px 30px rgba(0,0,0,0.12);
            ">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <div style="
                  width:10px;height:10px;background:#10b981;border-radius:50%;
                  box-shadow:0 0 0 3px rgba(16,185,129,0.25);
                "></div>
                <strong style="color:#111;font-size:13px;">Your Driver 🛵</strong>
              </div>
              <div style="color:#10b981;font-size:12px;font-weight:600;">On the way to you!</div>
              <div style="color:#888;font-size:11px;margin-top:4px;">
                Lat: ${location.lat.toFixed(5)}<br/>Lng: ${location.lng.toFixed(5)}
              </div>
            </div>
          `)
        )
        .addTo(mapInstanceRef.current);
    }

    if (destinationMarkerRef.current) {
      const bounds = new window.mapboxgl.LngLatBounds();
      bounds.extend([location.lng, location.lat]);
      bounds.extend(destinationMarkerRef.current.getLngLat());
      mapInstanceRef.current.fitBounds(bounds, { padding: 100, maxZoom: 16, duration: 1000 });
    }

    if (destinationMarkerRef.current) {
      const destLngLat = destinationMarkerRef.current.getLngLat();
      drawRoute(location, { lat: destLngLat.lat, lng: destLngLat.lng });
    }
  };

  const drawRoute = async (driverLocation, customerLocation) => {
    if (!mapInstanceRef.current) return;
    const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA';
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.lng},${driverLocation.lat};${customerLocation.lng},${customerLocation.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes?.[0]) return;
      const route = data.routes[0].geometry;

      if (mapInstanceRef.current.getSource('route')) {
        mapInstanceRef.current.getSource('route').setData({ type: 'Feature', geometry: route });
      } else if (mapInstanceRef.current.isStyleLoaded()) {
        mapInstanceRef.current.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: route },
        });
        mapInstanceRef.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 6,
            'line-opacity': 0.9,
          },
        });
      }
    } catch (err) {
      console.error('Route error:', err);
    }
  };

  const openTracking = (order) => {
    setTrackingOrder(order);
    setDriverLocation(null);
    driverTrailRef.current = [];
    if (driverMarkerRef.current) { driverMarkerRef.current.remove(); driverMarkerRef.current = null; }
    setTimeout(() => initializeMap(order), 100);

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('SUBSCRIBE_ORDER', { orderId: order._id });
    }
  };

  const dineInOrders   = orders.filter(o => o.orderType === 'dine-in');
  const deliveryOrders = orders.filter(o => o.orderType === 'delivery');
  const pickupOrders   = orders.filter(o => o.orderType === 'pickup');
  const preOrders      = orders.filter(o => o.orderType === 'preorder');

  const getCategoryOrders = () => {
    switch(selectedCategory) {
      case 'dine-in':  return dineInOrders;
      case 'delivery': return deliveryOrders;
      case 'pickup':   return pickupOrders;
      case 'preorder': return preOrders;
      default:         return orders;
    }
  };

  const formatPrice = (price) => `KSh ${price?.toLocaleString() || 0}`;
  const formatDate  = (date)  => new Date(date).toLocaleString();

  const getStatusColor = (status) => {
    const colors = {
      pending:   'var(--status-pending)',
      confirmed: 'var(--status-info)',
      preparing: '#8b5cf6',
      ready:     'var(--status-ready)',
      completed: 'var(--status-completed)',
      cancelled: 'var(--status-cancelled)'
    };
    return colors[status] || 'var(--status-completed)';
  };

  const getDeliveryStatusColor = (status) => {
    const colors = {
      pending:    'var(--status-pending)',
      assigned:   'var(--status-info)',
      'picked-up': '#8b5cf6',
      'on-the-way': 'var(--status-ready)',
      delivered:  '#22c55e',
      cancelled:  'var(--status-cancelled)'
    };
    return colors[status] || 'var(--status-completed)';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginTop: '1rem' }}>
          Loading your orders...
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      <div className="my-orders-container">
        {/* Header */}
        <div className="my-orders-header">
          <h1>📦 My Orders</h1>
          <p>Track all your orders in one place</p>
        </div>

        {/* Category Pills */}
        <div className="category-pills">
          {[
            { id: 'all',      label: 'All Orders', icon: '📋', count: orders.length },
            { id: 'dine-in',  label: 'Dine-In',    icon: '🍽️', count: dineInOrders.length },
            { id: 'delivery', label: 'Delivery',    icon: '🚚', count: deliveryOrders.length },
            { id: 'pickup',   label: 'Pickup',      icon: '🚗', count: pickupOrders.length },
            { id: 'preorder', label: 'Pre-Orders',  icon: '📅', count: preOrders.length }
          ].map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`category-pill ${selectedCategory === category.id ? 'active' : ''}`}
            >
              {category.icon} {category.label} ({category.count})
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="orders-list">
          {getCategoryOrders().length === 0 ? (
            <div className="no-orders">
              <div className="no-orders-icon">📦</div>
              <h3>No orders in this category</h3>
              <p>Start ordering to see your items here!</p>
            </div>
          ) : (
            getCategoryOrders().map(order => (
              <div key={order._id} className="order-card">
                {/* Live Indicator */}
                {order.orderType === 'delivery' && ['assigned', 'picked-up', 'on-the-way'].includes(order.deliveryStatus) && (
                  <div className="live-indicator">
                    <span className="pulse-dot"></span>
                    <Radio size={14} />
                    <span className="live-text">Live</span>
                  </div>
                )}

                <div className="order-card-header">
                  <div>
                    <div className="order-number">{order.orderNumber}</div>
                    <div className={`order-type-badge ${order.orderType}`}>
                      {order.orderType === 'dine-in'  ? '🍽️' : 
                       order.orderType === 'delivery' ? '🚚' : 
                       order.orderType === 'pickup'   ? '🚗' : '📅'} 
                      {order.orderType.toUpperCase()}
                    </div>
                  </div>
                  <div className="order-total-section">
                    <div className="order-price">{formatPrice(order.total)}</div>
                    <div className="order-date">{formatDate(order.createdAt)}</div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="order-details">
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span 
                      className="status-badge"
                      style={{ background: getStatusColor(order.status) }}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>

                  {order.orderType === 'delivery' && order.deliveryStatus && (
                    <div className="detail-row">
                      <span className="detail-label">Delivery Status:</span>
                      <span 
                        className="status-badge"
                        style={{ background: getDeliveryStatusColor(order.deliveryStatus) }}
                      >
                        {order.deliveryStatus.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {order.orderType === 'dine-in' && order.tableNumber && (
                    <div className="detail-row">
                      <span className="detail-label">🍽️ Table:</span>
                      <span className="detail-value">Table {order.tableNumber}</span>
                    </div>
                  )}

                  {order.orderType === 'delivery' && (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">📍 Address:</span>
                        <span className="detail-value address-truncate">
                          {order.deliveryAddress?.substring(0, 40)}...
                        </span>
                      </div>
                      {order.driverName && (
                        <div className="detail-row">
                          <span className="detail-label">🚗 Driver:</span>
                          <span className="detail-value">{order.driverName}</span>
                        </div>
                      )}
                    </>
                  )}

                  {order.orderType === 'pickup' && (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">📅 Pickup Date:</span>
                        <span className="detail-value">
                          {order.pickupDate && new Date(order.pickupDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">⏰ Pickup Time:</span>
                        <span className="detail-value">{order.pickupTime}</span>
                      </div>
                    </>
                  )}

                  {order.orderType === 'preorder' && (
                    <div className="detail-row">
                      <span className="detail-label">📅 Pre-order For:</span>
                      <span className="detail-value">
                        {order.preorderDate && new Date(order.preorderDate).toLocaleDateString()} at {order.preorderTime}
                      </span>
                    </div>
                  )}
                </div>

                {/* Track Order Button */}
                {order.orderType === 'delivery' && order.deliveryStatus === 'on-the-way' && order.deliveryLng && order.deliveryLat && (
                  <button onClick={() => openTracking(order)} className="track-button">
                    <Navigation size={20} /> Track Delivery on Map (Live)
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map Tracking Modal */}
      {trackingOrder && (
        <div className="modal-overlay" onClick={() => setTrackingOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="modal-header">
              <div>
                <h2>🗺️ Live Tracking: {trackingOrder.orderNumber}</h2>
                <p className="modal-subtitle">📍 {trackingOrder.deliveryAddress}</p>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="close-modal-btn">
                <X size={24} />
              </button>
            </div>

            {/* Map */}
            <div ref={mapRef} className="map-container" />
            <style>{`
              .mapboxgl-popup-content { padding:0!important;border-radius:12px!important;box-shadow:0 8px 30px rgba(0,0,0,0.15)!important;overflow:hidden; }
              .mapboxgl-popup-tip { display:none!important; }
              .mapboxgl-ctrl-logo { display:none!important; }
            `}</style>

            {/* Footer Info */}
            <div className="modal-footer">
              <div className="footer-grid">
                <div className="footer-item">
                  <Package size={24} style={{ color: 'var(--brand-primary)' }} />
                  <div>
                    <div className="footer-label">Order Total</div>
                    <div className="footer-value">{formatPrice(trackingOrder.total)}</div>
                  </div>
                </div>

                {trackingOrder.driverName && (
                  <div className="footer-item">
                    <Truck size={24} style={{ color: 'var(--status-success)' }} />
                    <div>
                      <div className="footer-label">Driver</div>
                      <div className="footer-value">{trackingOrder.driverName}</div>
                    </div>
                  </div>
                )}

                {trackingOrder.driverPhone && (
                  <div className="footer-item">
                    <Phone size={24} style={{ color: 'var(--status-info)' }} />
                    <div>
                      <div className="footer-label">Contact</div>
                      <div className="footer-value">{trackingOrder.driverPhone}</div>
                    </div>
                  </div>
                )}
              </div>

              {trackingOrder.deliveryLat && trackingOrder.deliveryLng && (
                <button
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${trackingOrder.deliveryLat},${trackingOrder.deliveryLng}`, '_blank')}
                  className="google-maps-btn"
                >
                  🗺️ Open in Google Maps
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;