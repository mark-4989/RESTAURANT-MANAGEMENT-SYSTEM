import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2hlZmRyZWR6IiwiYSI6ImNtaDRwY2JhZzFvYXFmMXNiOTVmYnQ5aHkifQ.wdXtoBRNl0xYhiPAZxDRjA';
const API_URL = import.meta.env.VITE_API_URL || 'https://restaurant-management-system-1-7v0m.onrender.com/api';

// ─── Auth Screen ──────────────────────────────────────────────────────────────

const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    vehicleType: 'motorcycle',
    vehicleRegistration: '',
    vehicleModel: '',
    vehicleColor: ''
  });
  const [errors, setErrors] = useState({});

  const validateSignup = () => {
    const e = {};
    if (!signupForm.firstName.trim()) e.firstName = 'Required';
    if (!signupForm.lastName.trim()) e.lastName = 'Required';
    if (!signupForm.email.match(/^\S+@\S+\.\S+$/)) e.email = 'Valid email required';
    if (!signupForm.phone.match(/^\+?\d{9,15}$/)) e.phone = 'Valid phone required';
    if (signupForm.password.length < 6) e.password = 'Min 6 characters';
    if (signupForm.password !== signupForm.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!signupForm.licenseNumber.trim()) e.licenseNumber = 'Required';
    if (!signupForm.vehicleRegistration.trim()) e.vehicleRegistration = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!loginForm.phone || !loginForm.password) {
      toast.error('Please enter phone and password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/drivers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginForm.phone, password: loginForm.password })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('✅ Logged in successfully!');
        onLogin(data.data);
      } else {
        toast.error(data.message || 'Invalid credentials');
      }
    } catch {
      // Fallback mock login for dev
      if (loginForm.phone && loginForm.password) {
        toast.success('✅ Logged in (demo mode)');
        onLogin({
          _id: 'driver_' + Date.now(),
          firstName: 'Demo',
          lastName: 'Driver',
          phone: loginForm.phone,
          vehicleType: 'motorcycle',
          vehicleRegistration: 'KCB 000A',
          status: 'active'
        });
      } else {
        toast.error('Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateSignup()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: signupForm.firstName,
          lastName: signupForm.lastName,
          email: signupForm.email,
          phone: signupForm.phone,
          password: signupForm.password,
          licenseNumber: signupForm.licenseNumber,
          vehicleType: signupForm.vehicleType,
          vehicleRegistration: signupForm.vehicleRegistration,
          vehicleModel: signupForm.vehicleModel,
          vehicleColor: signupForm.vehicleColor,
          status: 'active',
          isAvailable: true
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`🎉 Welcome, ${data.data.firstName}! Account created — you're now logged in.`);
        onLogin(data.data);
      } else {
        toast.error(data.message || 'Sign-up failed');
      }
    } catch {
      toast.error('Could not reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '0.75rem',
    border: `2px solid ${errors[field] ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: '10px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none'
  });

  const labelStyle = {
    display: 'block',
    marginBottom: '0.4rem',
    fontWeight: 600,
    color: '#374151',
    fontSize: '0.9rem'
  };

  const fieldGroup = (label, field, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={signupForm[field]}
        onChange={e => {
          setSignupForm({ ...signupForm, [field]: e.target.value });
          if (errors[field]) setErrors({ ...errors, [field]: null });
        }}
        style={inputStyle(field)}
      />
      {errors[field] && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors[field]}</p>}
    </div>
  );

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
        padding: '2.5rem',
        width: '100%',
        maxWidth: mode === 'signup' ? '560px' : '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxHeight: '95vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🚗</div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>
            Driver Portal
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            {mode === 'login' ? 'Sign in to start delivering' : 'Create your driver account'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '2rem'
        }}>
          {['login', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setErrors({}); }}
              style={{
                flex: 1,
                padding: '0.65rem',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#667eea' : '#6b7280',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.12)' : 'none'
              }}
            >
              {m === 'login' ? '🔑 Sign In' : '📝 Sign Up'}
            </button>
          ))}
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>📱 Phone Number</label>
              <input
                type="tel"
                placeholder="+254712345678"
                value={loginForm.phone}
                onChange={e => setLoginForm({ ...loginForm, phone: e.target.value })}
                style={inputStyle('phone_login')}
              />
            </div>
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={labelStyle}>🔒 Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={inputStyle('password_login')}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: '#6b7280' }}>
              New driver?{' '}
              <span
                onClick={() => setMode('signup')}
                style={{ color: '#667eea', fontWeight: 600, cursor: 'pointer' }}
              >
                Create an account
              </span>
            </p>
          </>
        )}

        {/* SIGN-UP FORM */}
        {mode === 'signup' && (
          <>
            {/* Personal Info */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.25rem',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                👤 Personal Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {fieldGroup('First Name', 'firstName', 'text', 'John')}
                {fieldGroup('Last Name', 'lastName', 'text', 'Kamau')}
              </div>
              {fieldGroup('Email Address', 'email', 'email', 'john@example.com')}
              {fieldGroup('Phone Number', 'phone', 'tel', '+254712345678')}
            </div>

            {/* Password */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.25rem',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔒 Set Password
              </h3>
              {fieldGroup('Password', 'password', 'password', 'Min 6 characters')}
              {fieldGroup('Confirm Password', 'confirmPassword', 'password', 'Re-enter password')}
            </div>

            {/* Vehicle Info */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🚗 Vehicle Details
              </h3>
              {fieldGroup('Driver License Number', 'licenseNumber', 'text', 'DL123456')}
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Vehicle Type</label>
                <select
                  value={signupForm.vehicleType}
                  onChange={e => setSignupForm({ ...signupForm, vehicleType: e.target.value })}
                  style={{ ...inputStyle('vehicleType'), cursor: 'pointer' }}
                >
                  {['motorcycle', 'bicycle', 'car', 'scooter'].map(v => (
                    <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </div>
              {fieldGroup('Registration Plate', 'vehicleRegistration', 'text', 'KCB 123A')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {fieldGroup('Model (optional)', 'vehicleModel', 'text', 'Honda CB150')}
                {fieldGroup('Color (optional)', 'vehicleColor', 'text', 'Red')}
              </div>
            </div>

            <button
              onClick={handleSignup}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '1rem'
              }}
            >
              {loading ? 'Creating Account...' : '🎉 Create Driver Account'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
              Your account will immediately appear in the admin Driver Management panel.
            </p>

            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
              Already have an account?{' '}
              <span
                onClick={() => setMode('login')}
                style={{ color: '#667eea', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign In
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main Driver App ──────────────────────────────────────────────────────────

const DriverApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driver, setDriver] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const mapContainer = useRef(null);
  const map = useRef(null);
  const driverMarker = useRef(null);
  const destinationMarker = useRef(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const fetchOrders = async () => {
    try {
      const availableRes = await fetch(`${API_URL}/orders?orderType=delivery&deliveryStatus=pending`);
      const availableData = await availableRes.json();
      if (availableData.success) setAvailableOrders(availableData.data || []);

      if (driver) {
        const myRes = await fetch(`${API_URL}/orders?driver=${driver._id}`);
        const myData = await myRes.json();
        if (myData.success) setMyOrders(myData.data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleLogin = (driverData) => {
    setDriver(driverData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setDriver(null);
  };

  const acceptOrder = async (order) => {
    try {
      const response = await fetch(`${API_URL}/orders/${order._id}/assign-driver`, {
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
    } catch {
      toast.error('Failed to accept order');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/assign-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver._id, deliveryStatus: newStatus })
      });
      if (response.ok) {
        toast.success(`✅ Order ${newStatus}!`);
        fetchOrders();
      }
    } catch {
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
    if (order.deliveryLat && order.deliveryLng) {
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([order.deliveryLng, order.deliveryLat])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>📍 Delivery Location</strong><br/>${order.deliveryAddress}`))
        .addTo(map.current);
    }
    if (driver?.currentLocation) {
      new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat([driver.currentLocation.lng, driver.currentLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>🚗 Your Location</strong>'))
        .addTo(map.current);
    }
  };

  const calculateTimeSince = (date) => {
    const minutes = Math.floor((new Date() - new Date(date)) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
  };

  const formatPrice = (price) => `KSh ${price?.toLocaleString() || 0}`;

  const getUrgency = (orderTime) => {
    const minutes = Math.floor((new Date() - new Date(orderTime)) / 60000);
    if (minutes > 30) return { label: 'URGENT', color: '#ef4444' };
    if (minutes > 15) return { label: 'HIGH', color: '#f59e0b' };
    return { label: 'NORMAL', color: '#10b981' };
  };

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

  if (!isLoggedIn) return <AuthScreen onLogin={handleLogin} />;

  const activeOrders = myOrders.filter(o => ['assigned', 'picked-up', 'on-the-way'].includes(o.deliveryStatus));
  const completedOrders = myOrders.filter(o => o.deliveryStatus === 'delivered');

  const tabStyle = (tab) => ({
    padding: '1rem 2rem',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '3px solid #667eea' : '3px solid transparent',
    color: activeTab === tab ? '#667eea' : '#666',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s'
  });

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
              {driver.firstName} {driver.lastName}
              {driver.vehicleRegistration ? ` • ${driver.vehicleRegistration}` : ''}
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

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1rem' }}>
        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {[
            { emoji: '📦', value: availableOrders.length, label: 'Available Orders', border: '#f59e0b' },
            { emoji: '🚗', value: activeOrders.length, label: 'Active Deliveries', border: '#3b82f6' },
            { emoji: '✅', value: completedOrders.length, label: 'Completed Today', border: '#10b981' },
            {
              emoji: '💰',
              value: formatPrice(completedOrders.reduce((s, o) => s + (o.deliveryFee || 200), 0)),
              label: "Today's Earnings",
              border: '#667eea'
            }
          ].map(({ emoji, value, label, border }, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '15px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderLeft: `4px solid ${border}`
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{emoji}</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 700, color: '#1f2937' }}>{value}</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('available')} style={tabStyle('available')}>📦 Available ({availableOrders.length})</button>
          <button onClick={() => setActiveTab('active')} style={tabStyle('active')}>🚗 Active ({activeOrders.length})</button>
          <button onClick={() => setActiveTab('completed')} style={tabStyle('completed')}>✅ Completed ({completedOrders.length})</button>
        </div>

        {/* Available Orders */}
        {activeTab === 'available' && (
          <div>
            {availableOrders.length === 0 ? (
              <EmptyState emoji="📦" title="No available orders" sub="New orders will appear here" />
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {availableOrders.map(order => {
                  const urgency = getUrgency(order.createdAt);
                  return (
                    <div key={order._id} style={{
                      background: 'white',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      borderLeft: `4px solid ${urgency.color}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>{order.orderNumber}</h3>
                          <span style={{
                            display: 'inline-block', padding: '0.25rem 0.75rem',
                            background: urgency.color, color: 'white',
                            borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700
                          }}>{urgency.label}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#667eea' }}>{formatPrice(order.total)}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{calculateTimeSince(order.createdAt)}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '10px' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>👤 Customer</div>
                          <div style={{ fontWeight: 600, color: '#1f2937' }}>{order.customerName}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>📞 {order.deliveryPhone}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>📍 Distance</div>
                          <div style={{ fontWeight: 600, color: '#1f2937' }}>~3.5 km</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>~15 min drive</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '10px', borderLeft: '3px solid #f59e0b' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e', marginBottom: '0.5rem' }}>📍 Delivery Address:</div>
                        <div style={{ color: '#78350f' }}>{order.deliveryAddress}</div>
                        {order.deliveryInstructions && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#78350f', fontStyle: 'italic' }}>💬 "{order.deliveryInstructions}"</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button onClick={() => acceptOrder(order)} style={{
                          flex: 1, padding: '1rem', background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
                        }}>✅ Accept Order</button>
                        <button onClick={() => { setSelectedOrder(order); setTimeout(() => initializeMap(order), 100); }} style={{
                          padding: '1rem 1.5rem', background: '#667eea', color: 'white',
                          border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer'
                        }}>🗺️ View Map</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Active Orders */}
        {activeTab === 'active' && (
          <div>
            {activeOrders.length === 0 ? (
              <EmptyState emoji="🚗" title="No active deliveries" sub="Accept orders from Available tab" />
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {activeOrders.map(order => (
                  <div key={order._id} style={{
                    background: 'white', borderRadius: '15px', padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: '4px solid #3b82f6'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>{order.orderNumber}</h3>
                        <span style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600 }}>
                          {order.deliveryStatus?.toUpperCase() || 'IN PROGRESS'}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#667eea' }}>{formatPrice(order.total)}</div>
                        <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>+{formatPrice(order.deliveryFee || 200)} fee</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#0369a1', marginBottom: '0.5rem', fontWeight: 600 }}>👤 Customer</div>
                        <div style={{ fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>{order.customerName}</div>
                        <div style={{ fontSize: '0.9rem', color: '#0369a1' }}>📞 {order.deliveryPhone}</div>
                      </div>
                      <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.5rem', fontWeight: 600 }}>📍 Address</div>
                        <div style={{ color: '#78350f' }}>{order.deliveryAddress}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {order.deliveryStatus === 'assigned' && (
                        <button onClick={() => updateOrderStatus(order._id, 'picked-up')} style={{ flex: 1, padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>📦 Mark as Picked Up</button>
                      )}
                      {order.deliveryStatus === 'picked-up' && (
                        <button onClick={() => updateOrderStatus(order._id, 'on-the-way')} style={{ flex: 1, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>🚗 On The Way</button>
                      )}
                      {order.deliveryStatus === 'on-the-way' && (
                        <button onClick={() => updateOrderStatus(order._id, 'delivered')} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>✅ Delivered</button>
                      )}
                      <button onClick={() => { setSelectedOrder(order); setTimeout(() => initializeMap(order), 100); }} style={{ padding: '0.75rem 1.5rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>🗺️ Map</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Orders */}
        {activeTab === 'completed' && (
          <div>
            {completedOrders.length === 0 ? (
              <EmptyState emoji="✅" title="No completed deliveries" sub="Completed orders will appear here" />
            ) : (
              <div style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                {completedOrders.map((order, idx) => (
                  <div key={order._id} style={{
                    padding: '1.5rem',
                    borderBottom: idx < completedOrders.length - 1 ? '1px solid #e5e7eb' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>{order.orderNumber}</div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{order.customerName} • {order.deliveryAddress?.substring(0, 30)}...</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>+{formatPrice(order.deliveryFee || 200)}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{calculateTimeSince(order.createdAt)}</div>
                    </div>
                    <span style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 600 }}>✅ Delivered</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Modal */}
      {selectedOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }} onClick={() => setSelectedOrder(null)}>
          <div style={{
            background: 'white', borderRadius: '20px', width: '100%', maxWidth: '900px',
            maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem', borderBottom: '2px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>{selectedOrder.orderNumber}</h2>
                <p style={{ color: '#6b7280' }}>📍 {selectedOrder.deliveryAddress}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
            </div>
            <div ref={mapContainer} style={{ flex: 1, minHeight: '400px' }} />
            <div style={{ padding: '1.5rem', background: '#f9fafb' }}>
              <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.deliveryLat},${selectedOrder.deliveryLng}`, '_blank')} style={{
                width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
              }}>🗺️ Open in Google Maps</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ emoji, title, sub }) => (
  <div style={{ background: 'white', padding: '3rem', borderRadius: '15px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{emoji}</div>
    <h3 style={{ color: '#1f2937', marginBottom: '0.5rem' }}>{title}</h3>
    <p style={{ color: '#6b7280' }}>{sub}</p>
  </div>
);

export default DriverApp;