// customer-app/src/pages/MyOrders.jsx — LUXURY REDESIGN WITH GSAP
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { MapPin, X, Navigation, Phone, Package, Clock, Radio, Truck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import '../styles/MyOrders.css';

const _RAW_URL    = import.meta.env.VITE_API_URL     || 'https://restaurant-management-system-1-7v0m.onrender.com';
const API_URL     = _RAW_URL.replace(/\/api\/?$/, '');
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'https://restaurant-management-system-1-7v0m.onrender.com').replace(/\/api\/?$/, '');

// ── Status → progress % ──────────────────────────────────────
const STATUS_PROGRESS = { pending: 15, confirmed: 30, preparing: 55, ready: 80, completed: 100, cancelled: 0 };
const DELIVERY_PROGRESS = { pending: 10, assigned: 30, 'picked-up': 55, 'on-the-way': 80, delivered: 100, cancelled: 0 };

const MyOrders = () => {
  const { user }            = useUser();
  const { addNotification } = useNotifications();

  const [orders,           setOrders]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [trackingOrder,    setTrackingOrder]    = useState(null);
  const [driverLocation,   setDriverLocation]   = useState(null);

  const mapRef              = useRef(null);
  const mapInstanceRef      = useRef(null);
  const driverMarkerRef     = useRef(null);
  const destinationMarkerRef= useRef(null);
  const socketRef           = useRef(null);
  const driverTrailRef      = useRef([]);
  const headerRef           = useRef(null);
  const pillsRef            = useRef(null);
  const listRef             = useRef(null);
  const gsapLoaded          = useRef(false);

  // ── GSAP PAGE ENTRANCE ───────────────────────────────────
  useEffect(() => {
    const initGSAP = async () => {
      if (gsapLoaded.current) return;
      gsapLoaded.current = true;
      try {
        const { gsap } = await import('gsap');
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        if (headerRef.current) {
          tl.fromTo(headerRef.current,
            { opacity: 0, y: -30 },
            { opacity: 1, y: 0, duration: 0.7 }
          );
        }
        if (pillsRef.current) {
          tl.fromTo(
            pillsRef.current.querySelectorAll('.category-pill'),
            { opacity: 0, y: 20, scale: 0.92 },
            { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.07 },
            '-=0.4'
          );
        }
      } catch (e) { /* GSAP not installed – silent */ }
    };
    initGSAP();
  }, []);

  // Animate order cards whenever they render
  const animateCards = () => {
    import('gsap').then(({ gsap }) => {
      const cards = document.querySelectorAll('.order-card');
      gsap.fromTo(cards,
        { opacity: 0, y: 40, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' }
      );
    }).catch(() => {});
  };

  // ── SOCKET ───────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      fetchOrders();
      loadMapboxScript();
      initializeWebSocket();
    }
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [user]);

  const initializeWebSocket = () => {
    import('socket.io-client').then(({ io }) => {
      const socket = io(BACKEND_URL, { transports: ['websocket','polling'], reconnectionAttempts: 5, reconnectionDelay: 2000 });
      socketRef.current = socket;
      socket.on('DRIVER_LOCATION_UPDATE', (data) => {
        if (trackingOrder && data.orderId === trackingOrder._id) {
          setDriverLocation(data.location);
          updateDriverMarker(data.location);
        }
      });
      socket.on('ORDER_STATUS_UPDATE',    () => fetchOrders());
      socket.on('DELIVERY_STATUS_UPDATE', () => fetchOrders());
    }).catch(err => console.error('Socket.IO client error:', err));
  };

  const loadMapboxScript = () => {
    if (!window.mapboxgl) {
      const s = document.createElement('script');
      s.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      s.async = true;
      document.head.appendChild(s);
      const l = document.createElement('link');
      l.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      l.rel = 'stylesheet';
      document.head.appendChild(l);
    }
  };

  const fetchOrders = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/orders?customerId=${encodeURIComponent(user.id)}&customerName=${encodeURIComponent(user.fullName||user.firstName||'Guest')}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setTimeout(animateCards, 50);
      }
    } catch(e) { console.error('Error fetching orders:', e); }
    finally    { setLoading(false); }
  };

  // ── MAP ──────────────────────────────────────────────────
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
      zoom: 14, pitch: 50, bearing: -10,
    });
    mapInstanceRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstanceRef.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    mapInstanceRef.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    mapInstanceRef.current.on('load', () => {
      mapInstanceRef.current.addSource('driver-trail', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:[] } } });
      mapInstanceRef.current.addLayer({ id:'driver-trail-layer', type:'line', source:'driver-trail', layout:{'line-join':'round','line-cap':'round'}, paint:{'line-color':'#f97316','line-width':4,'line-opacity':0.85,'line-dasharray':[2,1.5]} });
    });

    const destEl = document.createElement('div');
    destEl.innerHTML = `<div style="position:relative;display:flex;flex-direction:column;align-items:center;"><div style="width:44px;height:44px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(239,68,68,0.5);border:3px solid #fff;"><span style="transform:rotate(45deg);font-size:20px;">🏠</span></div><div style="margin-top:5px;background:#ef4444;color:#fff;font-size:10px;font-weight:800;padding:3px 10px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);">YOUR LOCATION</div></div>`;
    destEl.style.cursor = 'pointer';

    destinationMarkerRef.current = new mapboxgl.Marker({ element: destEl, anchor: 'bottom' })
      .setLngLat([order.deliveryLng, order.deliveryLat])
      .setPopup(new mapboxgl.Popup({ offset:30, closeButton:false }).setHTML(`<div style="padding:14px 16px;background:#fff;border-radius:12px;font-family:system-ui,sans-serif;min-width:220px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><div style="width:10px;height:10px;background:#ef4444;border-radius:50%;"></div><strong style="color:#111;font-size:13px;">Your Delivery Address</strong></div><p style="color:#555;font-size:12px;margin:0;line-height:1.5;">${order.deliveryAddress}</p></div>`))
      .addTo(mapInstanceRef.current);
    destinationMarkerRef.current.togglePopup();
  };

  const updateDriverMarker = (location) => {
    if (!mapInstanceRef.current || !window.mapboxgl) return;
    driverTrailRef.current.push([location.lng, location.lat]);
    const source = mapInstanceRef.current.getSource('driver-trail');
    if (source) source.setData({ type:'Feature', geometry:{ type:'LineString', coordinates: driverTrailRef.current } });
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([location.lng, location.lat]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = `<div style="width:52px;height:52px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(249,115,22,0.5);border:3px solid #fff;font-size:24px;cursor:pointer;">🛵</div>`;
      driverMarkerRef.current = new window.mapboxgl.Marker({ element: el, anchor:'center' }).setLngLat([location.lng, location.lat]).addTo(mapInstanceRef.current);
    }
    mapInstanceRef.current.flyTo({ center: [location.lng, location.lat], speed: 0.8 });
  };

  const openTracking = (order) => {
    setTrackingOrder(order);
    setDriverLocation(null);
    driverTrailRef.current = [];
    if (driverMarkerRef.current) { driverMarkerRef.current.remove(); driverMarkerRef.current = null; }
    setTimeout(() => initializeMap(order), 100);
    if (socketRef.current?.connected) socketRef.current.emit('SUBSCRIBE_ORDER', { orderId: order._id });
  };

  // ── HELPERS ──────────────────────────────────────────────
  const dineInOrders   = orders.filter(o => o.orderType === 'dine-in');
  const deliveryOrders = orders.filter(o => o.orderType === 'delivery');
  const pickupOrders   = orders.filter(o => o.orderType === 'pickup');
  const preOrders      = orders.filter(o => o.orderType === 'preorder');

  const getCategoryOrders = () => ({
    'all':      orders,
    'dine-in':  dineInOrders,
    'delivery': deliveryOrders,
    'pickup':   pickupOrders,
    'preorder': preOrders,
  }[selectedCategory] || orders);

  const formatPrice = (p) => `KSh ${(p||0).toLocaleString()}`;
  const formatDate  = (d) => new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

  const getStatusColor = (s) => ({
    pending:'var(--status-pending)', confirmed:'var(--status-info)', preparing:'#8b5cf6',
    ready:'var(--status-ready)', completed:'var(--status-completed)', cancelled:'var(--status-cancelled)'
  }[s] || '#6b7280');

  const getDeliveryStatusColor = (s) => ({
    pending:'var(--status-pending)', assigned:'var(--status-info)', 'picked-up':'#8b5cf6',
    'on-the-way':'var(--status-ready)', delivered:'#22c55e', cancelled:'var(--status-cancelled)'
  }[s] || '#6b7280');

  const getProgressPct = (order) => {
    if (order.orderType === 'delivery' && order.deliveryStatus) return DELIVERY_PROGRESS[order.deliveryStatus] ?? 20;
    return STATUS_PROGRESS[order.status] ?? 20;
  };

  const getTypeIcon = (type) => ({ 'dine-in':'🍽️', delivery:'🚚', pickup:'🚗', preorder:'📅' }[type] || '📦');

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" />
      <div style={{ color:'var(--text-primary)', fontSize:'1.1rem', fontWeight:500 }}>Loading your orders…</div>
    </div>
  );

  return (
    <div className="my-orders-page">
      <div className="my-orders-container">

        {/* ── HEADER ── */}
        <div className="my-orders-header" ref={headerRef}>
          <h1>📦 My Orders</h1>
          <p>Track all your orders in real time</p>
        </div>

        {/* ── CATEGORY PILLS ── */}
        <div className="category-pills" ref={pillsRef}>
          {[
            { id:'all',      label:'All Orders', icon:'📋', count: orders.length },
            { id:'dine-in',  label:'Dine-In',    icon:'🍽️', count: dineInOrders.length },
            { id:'delivery', label:'Delivery',    icon:'🚚', count: deliveryOrders.length },
            { id:'pickup',   label:'Pickup',      icon:'🚗', count: pickupOrders.length },
            { id:'preorder', label:'Pre-Orders',  icon:'📅', count: preOrders.length },
          ].map(c => (
            <button key={c.id} onClick={() => { setSelectedCategory(c.id); setTimeout(animateCards, 50); }}
              className={`category-pill ${selectedCategory === c.id ? 'active' : ''}`}>
              {c.icon} {c.label} ({c.count})
            </button>
          ))}
        </div>

        {/* ── ORDERS LIST ── */}
        <div className="orders-list" ref={listRef}>
          {getCategoryOrders().length === 0 ? (
            <div className="no-orders">
              <div className="no-orders-icon">📭</div>
              <h3>No orders here yet</h3>
              <p>Start ordering to see your history!</p>
            </div>
          ) : (
            getCategoryOrders().map(order => {
              const progressPct = getProgressPct(order);
              const isLive = order.orderType === 'delivery' && ['assigned','picked-up','on-the-way'].includes(order.deliveryStatus);

              return (
                <div key={order._id} className="order-card">
                  <div className="order-card-inner">

                    {/* ── LEFT: type + number ── */}
                    <div className="order-card-left">
                      <div className="order-type-icon">{getTypeIcon(order.orderType)}</div>
                      <div className={`order-type-badge ${order.orderType}`}>
                        {order.orderType.toUpperCase()}
                      </div>
                      <div className="order-number">{order.orderNumber}</div>
                    </div>

                    {/* ── CENTER: items + details ── */}
                    <div className="order-card-center">
                      {/* Items chips */}
                      {order.items && order.items.length > 0 && (
                        <div className="order-items-preview">
                          {order.items.slice(0, 5).map((item, idx) => (
                            <span key={idx} className="order-item-chip">
                              <span className="chip-qty">{item.quantity}×</span>
                              {item.name}
                            </span>
                          ))}
                          {order.items.length > 5 && (
                            <span className="order-item-chip">+{order.items.length - 5} more</span>
                          )}
                        </div>
                      )}

                      {/* Detail rows */}
                      <div className="detail-grid">
                        <div className="detail-row">
                          <span className="detail-label">Status</span>
                          <span className="status-badge" style={{ background: getStatusColor(order.status) }}>
                            {order.status}
                          </span>
                        </div>

                        {order.orderType === 'delivery' && order.deliveryStatus && (
                          <div className="detail-row">
                            <span className="detail-label">Delivery</span>
                            <span className="status-badge" style={{ background: getDeliveryStatusColor(order.deliveryStatus) }}>
                              {order.deliveryStatus}
                            </span>
                          </div>
                        )}

                        {order.orderType === 'dine-in' && order.tableNumber && (
                          <div className="detail-row">
                            <span className="detail-label">🍽️ Table</span>
                            <span className="detail-value">Table {order.tableNumber}</span>
                          </div>
                        )}

                        {order.orderType === 'delivery' && order.deliveryAddress && (
                          <div className="detail-row">
                            <span className="detail-label">📍 Address</span>
                            <span className="detail-value">{order.deliveryAddress?.substring(0,35)}…</span>
                          </div>
                        )}

                        {order.orderType === 'delivery' && order.driverName && (
                          <div className="detail-row">
                            <span className="detail-label">🚗 Driver</span>
                            <span className="detail-value">{order.driverName}</span>
                          </div>
                        )}

                        {order.orderType === 'pickup' && (
                          <>
                            <div className="detail-row">
                              <span className="detail-label">📅 Pickup Date</span>
                              <span className="detail-value">{order.pickupDate && new Date(order.pickupDate).toLocaleDateString()}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">⏰ Time</span>
                              <span className="detail-value">{order.pickupTime}</span>
                            </div>
                          </>
                        )}

                        {order.orderType === 'preorder' && (
                          <div className="detail-row">
                            <span className="detail-label">📅 Pre-order For</span>
                            <span className="detail-value">
                              {order.preorderDate && new Date(order.preorderDate).toLocaleDateString()} at {order.preorderTime}
                            </span>
                          </div>
                        )}

                        {/* Items count */}
                        <div className="detail-row">
                          <span className="detail-label">Items</span>
                          <span className="detail-value">{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Payment */}
                        {order.paymentStatus && (
                          <div className="detail-row">
                            <span className="detail-label">Payment</span>
                            <span className="detail-value" style={{ textTransform:'capitalize' }}>{order.paymentStatus}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      {order.status !== 'cancelled' && (
                        <div className="order-progress">
                          <div className="progress-label">{progressPct}% Complete</div>
                          <div className="progress-bar-wrap">
                            <div className="progress-bar-fill" style={{ width:`${progressPct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── RIGHT: price + date + actions ── */}
                    <div className="order-card-right">
                      <div>
                        <div className="order-price">{formatPrice(order.total)}</div>
                        <div className="order-date">{formatDate(order.createdAt)}</div>
                      </div>

                      <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', width:'100%', alignItems:'flex-end' }}>
                        {isLive && (
                          <div className="live-indicator">
                            <span className="pulse-dot" />
                            <Radio size={12} />
                            <span className="live-text">Live</span>
                          </div>
                        )}

                        {order.orderType === 'delivery' && order.deliveryStatus === 'on-the-way' && order.deliveryLng && order.deliveryLat && (
                          <button onClick={() => openTracking(order)} className="track-button">
                            <Navigation size={15} />
                            Track Live
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAP MODAL ── */}
      {trackingOrder && (
        <div className="modal-overlay" onClick={() => setTrackingOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>🗺️ Live Tracking: {trackingOrder.orderNumber}</h2>
                <p className="modal-subtitle">📍 {trackingOrder.deliveryAddress}</p>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="close-modal-btn"><X size={20} /></button>
            </div>

            <div ref={mapRef} className="map-container" />
            <style>{`.mapboxgl-popup-content{padding:0!important;border-radius:12px!important;overflow:hidden}.mapboxgl-popup-tip{display:none!important}.mapboxgl-ctrl-logo{display:none!important}`}</style>

            <div className="modal-footer">
              <div className="footer-grid">
                <div className="footer-item">
                  <Package size={22} style={{ color:'var(--brand-primary)', flexShrink:0 }} />
                  <div><div className="footer-label">Order Total</div><div className="footer-value">{formatPrice(trackingOrder.total)}</div></div>
                </div>
                {trackingOrder.driverName && (
                  <div className="footer-item">
                    <Truck size={22} style={{ color:'var(--status-success)', flexShrink:0 }} />
                    <div><div className="footer-label">Driver</div><div className="footer-value">{trackingOrder.driverName}</div></div>
                  </div>
                )}
                {trackingOrder.driverPhone && (
                  <div className="footer-item">
                    <Phone size={22} style={{ color:'var(--status-info)', flexShrink:0 }} />
                    <div><div className="footer-label">Contact</div><div className="footer-value">{trackingOrder.driverPhone}</div></div>
                  </div>
                )}
              </div>
              {trackingOrder.deliveryLat && trackingOrder.deliveryLng && (
                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${trackingOrder.deliveryLat},${trackingOrder.deliveryLng}`, '_blank')} className="google-maps-btn">
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