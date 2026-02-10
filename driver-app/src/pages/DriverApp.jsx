import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA';

const DriverApp = () => {
  // Driver State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driver, setDriver] = useState(null);
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  
  // Orders State
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('available'); // available, active, completed
  
  // Map State
  const mapContainer = useRef(null);
  const map = useRef(null);
  const driverMarker = useRef(null);
  const destinationMarker = useRef(null);

  // Fetch orders
  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const fetchOrders = async () => {
    try {
      // Fetch available broadcast orders
      const availableRes = await fetch('http://localhost:5000/api/orders?orderType=delivery&deliveryStatus=pending');
      const availableData = await availableRes.json();
      
      if (availableData.success) {
        setAvailableOrders(availableData.data || []);
      }

      // Fetch driver's assigned orders
      if (driver) {
        const myRes = await fetch(`http://localhost:5000/api/orders?driver=${driver._id}`);
        const myData = await myRes.json();
        
        if (myData.success) {
          setMyOrders(myData.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleLogin = () => {
    // Mock login - replace with real authentication
    if (loginForm.phone && loginForm.password) {
      const mockDriver = {
        _id: 'driver_' + Date.now(),
        firstName: 'John',
        lastName: 'Kamau',
        phone: loginForm.phone,
        vehicleType: 'motorcycle',
        vehicleRegistration: 'KCB 123A',
        status: 'available',
        currentLocation: { lat: -1.2921, lng: 36.8219 }
      };
      
      setDriver(mockDriver);
      setIsLoggedIn(true);
      toast.success('✅ Logged in successfully!');
    } else {
      toast.error('Please enter phone and password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setDriver(null);
    setLoginForm({ phone: '', password: '' });
    toast.info('Logged out');
  };

  const acceptOrder = async (order) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${order._id}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driverId: driver._id,
          driverName: `${driver.firstName} ${driver.lastName}`,
          driverPhone: driver.phone,
          deliveryStatus: 'assigned'
        })
      });

      if (response.ok) {
        toast.success('🎉 Order accepted! Check Active Orders');
        fetchOrders();
        setActiveTab('active');
      } else {
        toast.error('Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driverId: driver._id,
          deliveryStatus: newStatus
        })
      });

      if (response.ok) {
        toast.success(`✅ Order ${newStatus}!`);
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const initializeMap = (order) => {
    if (!mapContainer.current || !window.mapboxgl) return;

    const mapboxgl = window.mapboxgl;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    if (map.current) map.current.remove();

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [order.deliveryLng || 36.8219, order.deliveryLat || -1.2921],
      zoom: 13
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add delivery location marker
    if (order.deliveryLat && order.deliveryLng) {
      destinationMarker.current = new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([order.deliveryLng, order.deliveryLat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <strong>📍 Delivery Location</strong><br/>
          ${order.deliveryAddress}
        `))
        .addTo(map.current);
    }

    // Add driver's current location
    if (driver.currentLocation) {
      driverMarker.current = new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat([driver.currentLocation.lng, driver.currentLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>🚗 Your Location</strong>'))
        .addTo(map.current);
    }
  };

  const calculateTimeSince = (date) => {
    const minutes = Math.floor((new Date() - new Date(date)) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const formatPrice = (price) => `KSh ${price?.toLocaleString() || 0}`;

  const getUrgency = (orderTime) => {
    const minutes = Math.floor((new Date() - new Date(orderTime)) / 60000);
    if (minutes > 30) return { label: 'URGENT', color: '#ef4444' };
    if (minutes > 15) return { label: 'HIGH', color: '#f59e0b' };
    return { label: 'NORMAL', color: '#10b981' };
  };

  // Load Mapbox scripts
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
    script.async = true;
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <ToastContainer position="top-center" />
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '3rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚗</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>
              Driver Portal
            </h1>
            <p style={{ color: '#666' }}>Sign in to start delivering</p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
              📱 Phone Number
            </label>
            <input
              type="tel"
              placeholder="+254712345678"
              value={loginForm.phone}
              onChange={e => setLoginForm({ ...loginForm, phone: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
              🔒 Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={loginForm.password}
              onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
              onKeyPress={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            />
          </div>

          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Sign In
          </button>

          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            Demo: Use any phone/password
          </p>
        </div>
      </div>
    );
  }

  // MAIN APP
  const activeOrders = myOrders.filter(o => ['assigned', 'picked-up', 'on-the-way'].includes(o.deliveryStatus));
  const completedOrders = myOrders.filter(o => o.deliveryStatus === 'delivered');

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <ToastContainer position="top-center" />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        padding: '1.5rem',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              🚗 Driver Dashboard
            </h1>
            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              {driver.firstName} {driver.lastName} • {driver.vehicleRegistration}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #f59e0b'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#333' }}>
              {availableOrders.length}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Available Orders</div>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #3b82f6'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚗</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#333' }}>
              {activeOrders.length}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Active Deliveries</div>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#333' }}>
              {completedOrders.length}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Completed Today</div>
          </div>

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #667eea'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#333' }}>
              {formatPrice(completedOrders.reduce((sum, o) => sum + (o.deliveryFee || 200), 0))}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Today's Earnings</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '2px solid #e5e7eb',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('available')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'available' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'available' ? '#667eea' : '#666',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            📦 Available ({availableOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'active' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'active' ? '#667eea' : '#666',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            🚗 Active ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'completed' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'completed' ? '#667eea' : '#666',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            ✅ Completed ({completedOrders.length})
          </button>
        </div>

        {/* AVAILABLE ORDERS */}
        {activeTab === 'available' && (
          <div>
            {availableOrders.length === 0 ? (
              <div style={{
                background: 'white',
                padding: '3rem',
                borderRadius: '15px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
                <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>No available orders</h3>
                <p style={{ color: '#666' }}>New orders will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {availableOrders.map(order => {
                  const urgency = getUrgency(order.createdAt);
                  return (
                    <div
                      key={order._id}
                      style={{
                        background: 'white',
                        borderRadius: '15px',
                        padding: '1.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        borderLeft: `4px solid ${urgency.color}`
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem'
                      }}>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#333', marginBottom: '0.25rem' }}>
                            {order.orderNumber}
                          </h3>
                          <div style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            background: urgency.color,
                            color: 'white',
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {urgency.label}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#667eea' }}>
                            {formatPrice(order.total)}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            {calculateTimeSince(order.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        marginBottom: '1rem',
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '10px'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>👤 Customer</div>
                          <div style={{ fontWeight: 600, color: '#333' }}>{order.customerName}</div>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>📞 {order.deliveryPhone}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>📍 Distance</div>
                          <div style={{ fontWeight: 600, color: '#333' }}>~3.5 km</div>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>~15 min drive</div>
                        </div>
                      </div>

                      <div style={{
                        marginBottom: '1rem',
                        padding: '1rem',
                        background: '#fef3c7',
                        borderRadius: '10px',
                        borderLeft: '3px solid #f59e0b'
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e', marginBottom: '0.5rem' }}>
                          📍 Delivery Address:
                        </div>
                        <div style={{ color: '#78350f' }}>{order.deliveryAddress}</div>
                        {order.deliveryInstructions && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#78350f', fontStyle: 'italic' }}>
                            💬 "{order.deliveryInstructions}"
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}>
                        <button
                          onClick={() => acceptOrder(order)}
                          style={{
                            flex: 1,
                            padding: '1rem',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          ✅ Accept Order
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setTimeout(() => initializeMap(order), 100);
                          }}
                          style={{
                            padding: '1rem 1.5rem',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🗺️ View Map
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE ORDERS */}
        {activeTab === 'active' && (
          <div>
            {activeOrders.length === 0 ? (
              <div style={{
                background: 'white',
                padding: '3rem',
                borderRadius: '15px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚗</div>
                <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>No active deliveries</h3>
                <p style={{ color: '#666' }}>Accept orders from Available tab</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {activeOrders.map(order => (
                  <div
                    key={order._id}
                    style={{
                      background: 'white',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      borderLeft: '4px solid #3b82f6'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>
                          {order.orderNumber}
                        </h3>
                        <div style={{
                          display: 'inline-block',
                          padding: '0.5rem 1rem',
                          background: '#3b82f6',
                          color: 'white',
                          borderRadius: '50px',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}>
                          {order.deliveryStatus?.toUpperCase() || 'IN PROGRESS'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#667eea' }}>
                          {formatPrice(order.total)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                          +{formatPrice(order.deliveryFee || 200)} delivery fee
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        padding: '1rem',
                        background: '#f0f9ff',
                        borderRadius: '10px'
                      }}>
                        <div style={{ fontSize: '0.85rem', color: '#0369a1', marginBottom: '0.5rem', fontWeight: 600 }}>
                          👤 Customer
                        </div>
                        <div style={{ fontWeight: 700, color: '#333', marginBottom: '0.25rem' }}>
                          {order.customerName}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#0369a1' }}>
                          📞 {order.deliveryPhone}
                        </div>
                      </div>

                      <div style={{
                        padding: '1rem',
                        background: '#fef3c7',
                        borderRadius: '10px'
                      }}>
                        <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.5rem', fontWeight: 600 }}>
                          📍 Delivery Address
                        </div>
                        <div style={{ color: '#78350f' }}>{order.deliveryAddress}</div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      {order.deliveryStatus === 'assigned' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'picked-up')}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          📦 Mark as Picked Up
                        </button>
                      )}
                      {order.deliveryStatus === 'picked-up' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'on-the-way')}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          🚗 On The Way
                        </button>
                      )}
                      {order.deliveryStatus === 'on-the-way' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'delivered')}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ✅ Delivered
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setTimeout(() => initializeMap(order), 100);
                        }}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🗺️ Map
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMPLETED ORDERS */}
        {activeTab === 'completed' && (
          <div>
            {completedOrders.length === 0 ? (
              <div style={{
                background: 'white',
                padding: '3rem',
                borderRadius: '15px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>No completed deliveries</h3>
                <p style={{ color: '#666' }}>Completed orders will appear here</p>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {completedOrders.map((order, idx) => (
                  <div
                    key={order._id}
                    style={{
                      padding: '1.5rem',
                      borderBottom: idx < completedOrders.length - 1 ? '1px solid #e5e7eb' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#333', marginBottom: '0.25rem' }}>
                        {order.orderNumber}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {order.customerName} • {order.deliveryAddress?.substring(0, 30)}...
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>
                        +{formatPrice(order.deliveryFee || 200)}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        {calculateTimeSince(order.createdAt)}
                      </div>
                    </div>
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: '#10b981',
                      color: 'white',
                      borderRadius: '50px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      ✅ Delivered
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#333', marginBottom: '0.25rem' }}>
                  {selectedOrder.orderNumber}
                </h2>
                <p style={{ color: '#666' }}>📍 {selectedOrder.deliveryAddress}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  color: '#666',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            <div
              ref={mapContainer}
              style={{
                flex: 1,
                minHeight: '500px'
              }}
            />

            <div style={{ padding: '1.5rem', background: '#f9fafb' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Customer</div>
                  <div style={{ fontWeight: 600, color: '#333' }}>{selectedOrder.customerName}</div>
                  <div style={{ fontSize: '0.9rem', color: '#667eea' }}>📞 {selectedOrder.deliveryPhone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Order Total</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#667eea' }}>
                    {formatPrice(selectedOrder.total)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.deliveryLat},${selectedOrder.deliveryLng}`, '_blank')}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                🗺️ Open in Google Maps
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverApp;