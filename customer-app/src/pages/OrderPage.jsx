// customer-app/src/pages/OrderPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Truck, Package, Calendar, Search, Phone, MapPin, Plus, Minus, Trash2, ShoppingCart, Navigation } from 'lucide-react';
import { formatPrice } from '../data/menuData';
import { useNotifications } from '../context/NotificationContext';
import '../styles/orderpage.css';

// ── Lightweight in-page toast (replaces react-toastify) ─────────────────────
// Used for cart feedback & validation. Order-event toasts come from NotificationContext.
let _showSimpleToast = null;

const SimpleToast = () => {
  const [items, setItems] = useState([]);
  const timers = useRef({});

  useEffect(() => {
    _showSimpleToast = (message, type = 'info') => {
      const id = `st_${Date.now()}_${Math.random()}`;
      setItems(prev => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== id));
        delete timers.current[id];
      }, 3000);
    };
    return () => {
      _showSimpleToast = null;
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  if (items.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: '5.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 8888, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', pointerEvents: 'none' }}>
      {items.map(item => (
        <div key={item.id} style={{
          background: colors[item.type] || colors.info,
          color: '#fff',
          padding: '10px 22px',
          borderRadius: '100px',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
          animation: 'st-fadeup 0.25s ease',
        }}>
          {item.message}
        </div>
      ))}
      <style>{`@keyframes st-fadeup { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

const showToast = (message, type = 'info') => {
  if (_showSimpleToast) _showSimpleToast(message, type);
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
// Strip trailing /api — prevents /api/api/ double-prefix when Vercel env includes it
const API_URL = (import.meta.env.VITE_API_URL || 'https://restaurant-management-system-1-7v0m.onrender.com').replace(/\/api\/?$/, '');

const OrderPage = () => {
  const { user } = useUser();
  const { addNotification } = useNotifications();
  const [orderType, setOrderType] = useState('pickup');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  
  const [orderDetails, setOrderDetails] = useState({
    pickupDate: '', pickupTime: '', pickupPhone: '',
    deliveryAddress: '', deliveryPhone: '', deliveryDate: '', deliveryTime: '', 
    deliveryInstructions: '', deliveryLat: null, deliveryLng: null,
    preorderDate: '', preorderTime: '', preorderType: 'dine-in', 
    tableNumber: '', specialInstructions: ''
  });

  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    if (orderType === 'delivery' && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [orderType]);

  useEffect(() => {
    return () => {
      if (marker.current) {
        try { marker.current.remove(); } catch (e) { /* ignore */ }
      }
      if (map.current) {
        try { map.current.remove(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/menu`);
      const data = await response.json();
      
      let items = [];
      if (data.success && data.menuItems) items = data.menuItems;
      else if (data.success && data.data) items = data.data;
      else if (Array.isArray(data)) items = data;
      else if (data.menuItems) items = data.menuItems;
      
      setMenuItems(items);
      const cats = ['all', ...new Set(items.map(item => item.category || 'uncategorized'))];
      setCategories(cats);
      setLoading(false);
    } catch (error) {
      showToast('Failed to load menu', 'error');
      setLoading(false);
    }
  };

  const initializeMap = () => {
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
    script.async = true;
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    script.onload = () => {
      const mapboxgl = window.mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [36.8219, -1.2921],
        zoom: 13,
        pitch: 40,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      map.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: false,
      }), 'top-right');

      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        
        if (marker.current) marker.current.remove();

        // Styled drop pin marker
        const el = document.createElement('div');
        el.innerHTML = `
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
              padding:3px 8px;border-radius:10px;white-space:nowrap;
              box-shadow:0 2px 8px rgba(0,0,0,0.2);
            ">DROP HERE</div>
          </div>
        `;
        el.style.cursor = 'pointer';

        marker.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map.current);

        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`)
          .then(res => res.json())
          .then(data => {
            const address = data.features[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            
            marker.current.setPopup(
              new mapboxgl.Popup({ offset: 30, closeButton: false }).setHTML(`
                <div style="
                  padding:14px 16px;background:#fff;border-radius:12px;
                  font-family:system-ui,sans-serif;min-width:220px;
                  box-shadow:0 8px 30px rgba(0,0,0,0.12);
                ">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <div style="width:10px;height:10px;background:#ef4444;border-radius:50%;"></div>
                    <strong style="color:#111;font-size:13px;">Delivery Location Set ✓</strong>
                  </div>
                  <div style="color:#555;font-size:12px;line-height:1.5;">${address}</div>
                </div>
              `)
            ).togglePopup();

            setOrderDetails(prev => ({
              ...prev,
              deliveryAddress: address,
              deliveryLat: lat,
              deliveryLng: lng
            }));

            showToast('📍 Delivery location set!', 'success');
          })
          .catch(err => {
            console.error('Geocoding error:', err);
            setOrderDetails(prev => ({
              ...prev,
              deliveryAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              deliveryLat: lat,
              deliveryLng: lng
            }));
            showToast('📍 Delivery location set!', 'success');
          });
      });

      setMapLoaded(true);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude, latitude } = position.coords;
            map.current.flyTo({ 
              center: [longitude, latitude], 
              zoom: 15,
              duration: 2000
            });
          },
          (error) => {
            console.log('Could not get user location:', error);
          }
        );
      }
    };
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        
        if (map.current) {
          map.current.flyTo({ 
            center: [longitude, latitude], 
            zoom: 16,
            duration: 2000
          });

          if (marker.current) {
            marker.current.remove();
          }

          marker.current = new window.mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat([longitude, latitude])
            .addTo(map.current);

          fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`)
            .then(res => res.json())
            .then(data => {
              const address = data.features[0]?.place_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
              
              setOrderDetails(prev => ({
                ...prev,
                deliveryAddress: address,
                deliveryLat: latitude,
                deliveryLng: longitude
              }));

              showToast('📍 Current location set!', 'success');
            });
        }
      },
      (error) => {
        showToast('Could not get your location. Please click on the map to set delivery location.', 'error');
      }
    );
  };

  const addToCart = (item) => {
    const existing = cart.find(i => i._id === item._id);
    if (existing) {
      setCart(cart.map(i => 
        i._id === item._id ? {...i, quantity: i.quantity + 1} : i
      ));
      showToast(`+1 ${item.name} added!`, 'success');
    } else {
      setCart([...cart, {...item, quantity: 1}]);
      showToast(`${item.name} added to cart!`, 'success');
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(i => i._id !== itemId));
    showToast('Item removed', 'info');
  };

  const updateQuantity = (itemId, change) => {
    setCart(cart.map(i => {
      if (i._id === itemId) {
        const newQty = i.quantity + change;
        return newQty > 0 ? {...i, quantity: newQty} : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.16);
  const deliveryFee = orderType === 'delivery' ? 200 : 0;
  const total = subtotal + tax + deliveryFee;

  const placeOrder = async () => {
    if (cart.length === 0) {
      showToast('⚠️ Please add items to your cart', 'warning');
      return;
    }

    if (orderType === 'pickup') {
      if (!orderDetails.pickupDate || !orderDetails.pickupTime || !orderDetails.pickupPhone) {
        showToast('⚠️ Please fill in all pickup details', 'warning');
        return;
      }
    }

    if (orderType === 'delivery') {
      if (!orderDetails.deliveryAddress || !orderDetails.deliveryPhone || !orderDetails.deliveryLat || !orderDetails.deliveryLng) {
        showToast('⚠️ Please set delivery location on the map and provide phone number', 'warning');
        return;
      }
      if (!orderDetails.deliveryDate || !orderDetails.deliveryTime) {
        showToast('⚠️ Please select delivery date and time', 'warning');
        return;
      }
    }

    if (orderType === 'preorder') {
      if (!orderDetails.preorderDate || !orderDetails.preorderTime) {
        showToast('⚠️ Please select pre-order date and time', 'warning');
        return;
      }
    }

    const orderData = {
      customerName: user?.fullName || 'Guest',
      customerEmail: user?.primaryEmailAddress?.emailAddress || '',
      customerId: user?.id || null, // ← NEW: Clerk user ID for notifications
      items: cart.map(item => ({
        menuItem: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal, 
      tax, 
      total, 
      orderType,
      status: 'pending',
      paymentStatus: 'pending'
    };

    if (orderType === 'pickup') {
      orderData.pickupDate = orderDetails.pickupDate;
      orderData.pickupTime = orderDetails.pickupTime;
      orderData.pickupPhone = orderDetails.pickupPhone;
    }

    if (orderType === 'delivery') {
      orderData.deliveryAddress = orderDetails.deliveryAddress;
      orderData.deliveryPhone = orderDetails.deliveryPhone;
      orderData.deliveryDate = orderDetails.deliveryDate;
      orderData.deliveryTime = orderDetails.deliveryTime;
      orderData.deliveryInstructions = orderDetails.deliveryInstructions;
      orderData.deliveryLat = orderDetails.deliveryLat;
      orderData.deliveryLng = orderDetails.deliveryLng;
      orderData.deliveryFee = deliveryFee;
      orderData.deliveryStatus = 'pending';
    }

    if (orderType === 'preorder') {
      orderData.preorderDate = orderDetails.preorderDate;
      orderData.preorderTime = orderDetails.preorderTime;
      orderData.preorderType = orderDetails.preorderType;
      if (orderDetails.preorderType === 'dine-in') {
        orderData.tableNumber = orderDetails.tableNumber;
      }
      orderData.specialInstructions = orderDetails.specialInstructions;
    }

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // ── Immediate in-app notification (before socket round-trip) ──────────
        // FIX: removed `if (user?.id)` guard — addNotification always fires so
        // the toast shows instantly regardless of Clerk state or socket connection.
        addNotification('ORDER_PLACED', {
          orderId:     data.data._id,
          orderNumber: data.data.orderNumber,
          orderType,   // message says "your delivery order" vs "your pickup order"
        });

        showToast(`🎉 Order #${data.data.orderNumber} placed!`, 'success');

        setCart([]);
        setOrderDetails({
          pickupDate: '', pickupTime: '', pickupPhone: '',
          deliveryAddress: '', deliveryPhone: '', deliveryDate: '', deliveryTime: '', 
          deliveryInstructions: '', deliveryLat: null, deliveryLng: null,
          preorderDate: '', preorderTime: '', preorderType: 'dine-in', 
          tableNumber: '', specialInstructions: ''
        });
        if (marker.current) marker.current.remove();
      } else {
        showToast(`❌ ${data.message || 'Failed to place order'}`, 'error');
      }
    } catch (error) {
      console.error('Order error:', error);
      showToast('❌ Failed to place order. Please try again.', 'error');
    }
  };

  const filteredMenu = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Styles moved to orderpage.css (op-* classes)

  const getDecorationIcons = (item) => {
    const spicyIcons = ['🌶️', '🔥', '💥', '⚡'];
    const vegIcons = ['🥬', '🌱', '🥗', '🍃'];
    const meatIcons = ['🍖', '🥩', '🍗', '🥓'];
    const dessertIcons = ['🍰', '🍧', '🍪', '🍩'];
    
    if (item.spicy) return spicyIcons;
    if (item.dietary?.includes('vegetarian')) return vegIcons;
    if (item.category === 'desserts') return dessertIcons;
    return meatIcons;
  };

  return (
    <div className="order-page">
      <SimpleToast />
      <div className="op-inner">

        <div className="op-header">
          <h1 className="op-title">Place Your Order</h1>
          <p className="op-subtitle">Choose your order type and select from our menu</p>
        </div>

        <div className="op-tabs">
          <button onClick={() => setOrderType('pickup')} className={`op-tab${orderType === 'pickup' ? ' active' : ''}`}>
            <Package size={20} /> Pickup
          </button>
          <button onClick={() => setOrderType('delivery')} className={`op-tab${orderType === 'delivery' ? ' active' : ''}`}>
            <Truck size={20} /> Delivery
          </button>
          <button onClick={() => setOrderType('preorder')} className={`op-tab${orderType === 'preorder' ? ' active' : ''}`}>
            <Calendar size={20} /> Pre-Order
          </button>
        </div>

        <div className="op-layout">

          <div className="op-menu-col">
            <div className="op-search-wrap">
              <Search size={20} className="op-search-icon" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="op-search-input"
              />
            </div>

            <div className="op-category-strip">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`op-cat-btn${selectedCategory === cat ? ' active' : ''}`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-primary)'}}>
                <div className="spinner" style={{margin: '0 auto 1rem'}}></div>
                <p>Loading menu...</p>
              </div>
            ) : (
              <div className="menu-grid">
                {filteredMenu.map(item => {
                  const decorIcons = getDecorationIcons(item);
                  const isHovered = hoveredItem === item._id;

                  return (
                    <div 
                      key={item._id} 
                      className="menu-item-wrapper"
                      onMouseEnter={() => setHoveredItem(item._id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className="menu-item-image-circle">
                        <img src={item.image} alt={item.name} className="menu-item-image" />
                        <div className="menu-item-decorations">
                          <span className="decoration-icon">{decorIcons[0]}</span>
                          <span className="decoration-icon">{decorIcons[1]}</span>
                          <span className="decoration-icon">{decorIcons[2]}</span>
                          <span className="decoration-icon">{decorIcons[3]}</span>
                        </div>
                      </div>

                      <div className="menu-item-card">
                        <div className="menu-item-content">
                          <h3 className="menu-item-name">{item.name}</h3>
                          <div className="menu-item-meta">
                            <span className="menu-item-calories">{item.calories || '180'} cal</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                            <div className="menu-item-price">{formatPrice(item.price)}</div>
                          </div>
                        </div>

                        {isHovered && (
                          <div className="menu-item-hover-details">
                            <p className="hover-card-description">{item.description}</p>

                            {item.ingredients && (
                              <div className="hover-card-ingredients">
                                <h4>Ingredients</h4>
                                <p>{item.ingredients}</p>
                              </div>
                            )}

                            <div className="menu-item-badges">
                              {item.popular && <span className="badge badge-popular">Popular</span>}
                              {item.spicy && <span className="badge badge-spicy">🌶️ Spicy</span>}
                              {item.dietary?.includes('vegetarian') && (
                                <span className="badge badge-vegetarian">🥬 Veg</span>
                              )}
                            </div>

                            <button 
                              className="add-to-cart-btn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(item);
                                setHoveredItem(null);
                              }}
                            >
                              <span>Add to Cart</span>
                              <Plus size={18} strokeWidth={2.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="op-sidebar-col">

            <div className="op-panel">
              <h2 className="op-panel-title">
                {orderType === 'pickup' ? <><Package size={20} /> Pickup Details</> :
                 orderType === 'delivery' ? <><Truck size={20} /> Delivery Details</> :
                 <><Calendar size={20} /> Pre-Order Details</>}
              </h2>

              {orderType === 'pickup' && (
                <>
                  <input
                    type="date"
                    value={orderDetails.pickupDate}
                    onChange={e => setOrderDetails({...orderDetails, pickupDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="op-input"
                  />
                  <input
                    type="time"
                    value={orderDetails.pickupTime}
                    onChange={e => setOrderDetails({...orderDetails, pickupTime: e.target.value})}
                    className="op-input"
                  />
                  <div className="op-input-icon-wrap">
                    <Phone size={18} className="op-input-icon" />
                    <input
                      type="tel"
                      placeholder="+44 7700 900000"
                      value={orderDetails.pickupPhone}
                      onChange={e => setOrderDetails({...orderDetails, pickupPhone: e.target.value})}
                      className="op-input"
                    />
                  </div>
                </>
              )}

              {orderType === 'delivery' && (
                <>
                  <div className="op-map-label">
                    <span className="op-map-label-left">
                      <MapPin size={16} /> Click on map to drop your pin
                    </span>
                    <button onClick={useCurrentLocation} className="op-location-btn">
                      <Navigation size={14} /> Use My Location
                    </button>
                  </div>
                  <div ref={mapContainer} className="op-map-container" />
                  <style>{`
                    .mapboxgl-popup-content { padding:0!important;border-radius:12px!important;box-shadow:0 8px 30px rgba(0,0,0,0.15)!important;overflow:hidden; }
                    .mapboxgl-popup-tip { display:none!important; }
                    .mapboxgl-ctrl-logo { display:none!important; }
                  `}</style>

                  {orderDetails.deliveryAddress && (
                    <div className="op-address-badge">
                      📍 {orderDetails.deliveryAddress}
                    </div>
                  )}

                  <div className="op-input-icon-wrap">
                    <Phone size={18} className="op-input-icon" />
                    <input
                      type="tel"
                      placeholder="+44 7700 900000"
                      value={orderDetails.deliveryPhone}
                      onChange={e => setOrderDetails({...orderDetails, deliveryPhone: e.target.value})}
                      className="op-input"
                    />
                  </div>
                  <input
                    type="date"
                    value={orderDetails.deliveryDate}
                    onChange={e => setOrderDetails({...orderDetails, deliveryDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="op-input"
                  />
                  <input
                    type="time"
                    value={orderDetails.deliveryTime}
                    onChange={e => setOrderDetails({...orderDetails, deliveryTime: e.target.value})}
                    className="op-input"
                  />
                  <textarea
                    placeholder="Delivery instructions (optional)"
                    value={orderDetails.deliveryInstructions}
                    onChange={e => setOrderDetails({...orderDetails, deliveryInstructions: e.target.value})}
                    className="op-input"
                    style={{minHeight: '80px', resize: 'vertical'}}
                  />
                </>
              )}

              {orderType === 'preorder' && (
                <>
                  <input
                    type="date"
                    value={orderDetails.preorderDate}
                    onChange={e => setOrderDetails({...orderDetails, preorderDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="op-input"
                  />
                  <input
                    type="time"
                    value={orderDetails.preorderTime}
                    onChange={e => setOrderDetails({...orderDetails, preorderTime: e.target.value})}
                    className="op-input"
                  />
                  <select
                    value={orderDetails.preorderType}
                    onChange={e => setOrderDetails({...orderDetails, preorderType: e.target.value})}
                    className="op-input"
                  >
                    <option value="dine-in">Dine-In</option>
                    <option value="pickup">Pickup</option>
                  </select>
                  {orderDetails.preorderType === 'dine-in' && (
                    <input
                      type="text"
                      placeholder="Table Number"
                      value={orderDetails.tableNumber}
                      onChange={e => setOrderDetails({...orderDetails, tableNumber: e.target.value})}
                      className="op-input"
                    />
                  )}
                  <textarea
                    placeholder="Special instructions (optional)"
                    value={orderDetails.specialInstructions}
                    onChange={e => setOrderDetails({...orderDetails, specialInstructions: e.target.value})}
                    className="op-input"
                    style={{minHeight: '80px', resize: 'vertical'}}
                  />
                </>
              )}
            </div>

            <div className="op-panel">
              <h2 className="op-panel-title">
                <ShoppingCart size={20} /> Your Cart ({cart.length})
              </h2>

              {cart.length === 0 ? (
                <div className="op-cart-empty">
                  <ShoppingCart size={48} />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="op-cart-scroll">
                    {cart.map(item => (
                      <div key={item._id} className="cart-item">
                        <img src={item.image} alt={item.name} className="cart-item-image" />
                        <div className="cart-item-details">
                          <h4 className="cart-item-name">{item.name}</h4>
                          <p className="cart-item-price">{formatPrice(item.price)} each</p>
                          <div className="cart-item-controls">
                            <button className="quantity-btn" onClick={() => updateQuantity(item._id, -1)}><Minus size={14} /></button>
                            <span className="quantity">{item.quantity}</span>
                            <button className="quantity-btn" onClick={() => updateQuantity(item._id, 1)}><Plus size={14} /></button>
                            <button className="remove-btn" onClick={() => removeFromCart(item._id)} title="Remove"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <div className="cart-item-line-total">{formatPrice(item.price * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="op-cart-totals">
                    <div className="op-cart-row">
                      <span>Subtotal:</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="op-cart-row">
                      <span>Tax (20% VAT):</span>
                      <span>{formatPrice(tax)}</span>
                    </div>
                    {orderType === 'delivery' && (
                      <div className="op-cart-row">
                        <span>Delivery Fee:</span>
                        <span>{formatPrice(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="op-cart-total-row">
                      <span>Total:</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <button className="op-checkout-btn" onClick={placeOrder}>
                      Place {orderType === 'pickup' ? 'Pickup' : orderType === 'delivery' ? 'Delivery' : 'Pre-Order'} Order
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPage;