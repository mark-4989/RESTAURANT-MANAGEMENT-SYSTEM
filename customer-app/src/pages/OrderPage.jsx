// customer-app/src/pages/OrderPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import { Truck, Package, Calendar, Search, Phone, MapPin, Plus, Minus, Trash2, ShoppingCart, Navigation } from 'lucide-react';
import { formatPrice } from '../data/menuData';
import '../styles/orderpage.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const OrderPage = () => {
  const { user } = useUser();
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
      const response = await fetch(`${API_URL}/menu`);
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
      toast.error('Failed to load menu');
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
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [36.8219, -1.2921],
        zoom: 12
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        
        if (marker.current) {
          marker.current.remove();
        }

        marker.current = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([lng, lat])
          .addTo(map.current);

        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`)
          .then(res => res.json())
          .then(data => {
            const address = data.features[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            
            setOrderDetails(prev => ({
              ...prev,
              deliveryAddress: address,
              deliveryLat: lat,
              deliveryLng: lng
            }));

            toast.success('📍 Delivery location set!');
          })
          .catch(err => {
            console.error('Geocoding error:', err);
            setOrderDetails(prev => ({
              ...prev,
              deliveryAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              deliveryLat: lat,
              deliveryLng: lng
            }));
            toast.success('📍 Delivery location set!');
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
      toast.error('Geolocation is not supported by your browser');
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

              toast.success('📍 Current location set!');
            });
        }
      },
      (error) => {
        toast.error('Could not get your location. Please click on the map to set delivery location.');
      }
    );
  };

  const addToCart = (item) => {
    const existing = cart.find(i => i._id === item._id);
    if (existing) {
      setCart(cart.map(i => 
        i._id === item._id ? {...i, quantity: i.quantity + 1} : i
      ));
      toast.success(`Added another ${item.name}!`);
    } else {
      setCart([...cart, {...item, quantity: 1}]);
      toast.success(`${item.name} added to cart!`);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(i => i._id !== itemId));
    toast.info('Item removed');
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
      toast.error('⚠️ Please add items to your cart');
      return;
    }

    if (orderType === 'pickup') {
      if (!orderDetails.pickupDate || !orderDetails.pickupTime || !orderDetails.pickupPhone) {
        toast.error('⚠️ Please fill in all pickup details');
        return;
      }
    }

    if (orderType === 'delivery') {
      if (!orderDetails.deliveryAddress || !orderDetails.deliveryPhone || !orderDetails.deliveryLat || !orderDetails.deliveryLng) {
        toast.error('⚠️ Please set delivery location on the map and provide phone number');
        return;
      }
      if (!orderDetails.deliveryDate || !orderDetails.deliveryTime) {
        toast.error('⚠️ Please select delivery date and time');
        return;
      }
    }

    if (orderType === 'preorder') {
      if (!orderDetails.preorderDate || !orderDetails.preorderTime) {
        toast.error('⚠️ Please select pre-order date and time');
        return;
      }
    }

    const orderData = {
      customerName: user?.fullName || 'Guest',
      customerEmail: user?.primaryEmailAddress?.emailAddress || '',
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
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('🎉 Order placed successfully!');
        setCart([]);
        setOrderDetails({
          pickupDate: '', pickupTime: '', pickupPhone: '',
          deliveryAddress: '', deliveryPhone: '', deliveryDate: '', deliveryTime: '', 
          deliveryInstructions: '', deliveryLat: null, deliveryLng: null,
          preorderDate: '', preorderTime: '', preorderType: 'dine-in', 
          tableNumber: '', specialInstructions: ''
        });
        if (marker.current) marker.current.remove();
        toast.info(`Order Number: ${data.data.orderNumber}`);
      } else {
        toast.error(`❌ ${data.message || 'Failed to place order'}`);
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error('❌ Failed to place order');
    }
  };

  const filteredMenu = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const btnStyle = (active) => ({
    padding: '1rem 2rem',
    background: active ? 'var(--gradient-primary)' : 'rgba(var(--brand-primary-rgb), 0.1)',
    color: active ? 'var(--text-inverse)' : 'var(--text-secondary)',
    border: active ? 'none' : '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-full)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  });

  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    marginBottom: '1rem'
  };

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
      <div style={{maxWidth: '1600px', margin: '0 auto'}}>
        
        <div style={{textAlign: 'center', color: 'var(--text-primary)', marginBottom: '3rem'}}>
          <h1 style={{fontSize: '3rem', fontWeight: 800, marginBottom: '0.75rem', background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
            Place Your Order
          </h1>
          <p style={{fontSize: '1.25rem', color: 'var(--text-secondary)'}}>
            Choose your order type and select from our menu
          </p>
        </div>

        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap'}}>
          <button onClick={() => setOrderType('pickup')} style={btnStyle(orderType === 'pickup')}>
            <Package size={20} /> Pickup
          </button>
          <button onClick={() => setOrderType('delivery')} style={btnStyle(orderType === 'delivery')}>
            <Truck size={20} /> Delivery
          </button>
          <button onClick={() => setOrderType('preorder')} style={btnStyle(orderType === 'preorder')}>
            <Calendar size={20} /> Pre-Order
          </button>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: window.innerWidth > 1024 ? '2fr 1fr' : '1fr', gap: '2rem'}}>
          
          <div>
            <div style={{marginBottom: '1.5rem', position: 'relative'}}>
              <Search size={20} style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)'}} />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{...inputStyle, paddingLeft: '3rem', marginBottom: 0}}
              />
            </div>

            <div style={{display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', overflowX: 'auto'}}>
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)} 
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: selectedCategory === cat ? 'var(--gradient-primary)' : 'rgba(var(--brand-primary-rgb), 0.1)',
                    color: selectedCategory === cat ? 'var(--text-inverse)' : 'var(--text-secondary)',
                    border: selectedCategory === cat ? 'none' : '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    whiteSpace: 'nowrap'
                  }}
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

          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            
            <div style={{background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--border-primary)'}}>
              <h2 style={{fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
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
                    style={inputStyle} 
                  />
                  <input 
                    type="time" 
                    value={orderDetails.pickupTime} 
                    onChange={e => setOrderDetails({...orderDetails, pickupTime: e.target.value})} 
                    style={inputStyle} 
                  />
                  <div style={{position: 'relative'}}>
                    <Phone size={18} style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)'}} />
                    <input 
                      type="tel" 
                      placeholder="Phone Number" 
                      value={orderDetails.pickupPhone} 
                      onChange={e => setOrderDetails({...orderDetails, pickupPhone: e.target.value})} 
                      style={{...inputStyle, paddingLeft: '3rem'}} 
                    />
                  </div>
                </>
              )}

              {orderType === 'delivery' && (
                <>
                  <div style={{marginBottom: '1rem'}}>
                    <label style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 600}}>
                      <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <MapPin size={16} /> Click on map to set location
                      </span>
                      <button
                        onClick={useCurrentLocation}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--gradient-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <Navigation size={14} /> Use My Location
                      </button>
                    </label>
                    <div 
                      ref={mapContainer} 
                      style={{
                        width: '100%', 
                        height: '300px', 
                        borderRadius: '10px', 
                        overflow: 'hidden', 
                        border: '1px solid var(--border-primary)',
                        cursor: 'crosshair'
                      }} 
                    />
                  </div>

                  {orderDetails.deliveryAddress && (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '1rem',
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)'
                    }}>
                      📍 {orderDetails.deliveryAddress}
                    </div>
                  )}

                  <div style={{position: 'relative'}}>
                    <Phone size={18} style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)'}} />
                    <input 
                      type="tel" 
                      placeholder="Phone Number" 
                      value={orderDetails.deliveryPhone} 
                      onChange={e => setOrderDetails({...orderDetails, deliveryPhone: e.target.value})} 
                      style={{...inputStyle, paddingLeft: '3rem'}} 
                    />
                  </div>
                  <input 
                    type="date" 
                    value={orderDetails.deliveryDate} 
                    onChange={e => setOrderDetails({...orderDetails, deliveryDate: e.target.value})} 
                    min={new Date().toISOString().split('T')[0]} 
                    style={inputStyle} 
                  />
                  <input 
                    type="time" 
                    value={orderDetails.deliveryTime} 
                    onChange={e => setOrderDetails({...orderDetails, deliveryTime: e.target.value})} 
                    style={inputStyle} 
                  />
                  <textarea
                    placeholder="Delivery instructions (optional)"
                    value={orderDetails.deliveryInstructions}
                    onChange={e => setOrderDetails({...orderDetails, deliveryInstructions: e.target.value})}
                    style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
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
                    style={inputStyle} 
                  />
                  <input 
                    type="time" 
                    value={orderDetails.preorderTime} 
                    onChange={e => setOrderDetails({...orderDetails, preorderTime: e.target.value})} 
                    style={inputStyle} 
                  />
                  <select 
                    value={orderDetails.preorderType} 
                    onChange={e => setOrderDetails({...orderDetails, preorderType: e.target.value})} 
                    style={inputStyle}
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
                      style={inputStyle} 
                    />
                  )}
                  <textarea
                    placeholder="Special instructions (optional)"
                    value={orderDetails.specialInstructions}
                    onChange={e => setOrderDetails({...orderDetails, specialInstructions: e.target.value})}
                    style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
                  />
                </>
              )}
            </div>

            <div style={{background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '1.5rem', border: '1px solid var(--border-primary)'}}>
              <h2 style={{fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <ShoppingCart size={20} /> Your Cart ({cart.length})
              </h2>
              
              {cart.length === 0 ? (
                <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>
                  <ShoppingCart size={48} style={{margin: '0 auto 1rem', opacity: 0.3}} />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div style={{maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem'}}>
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
                  <div style={{borderTop: '1px solid var(--border-primary)', paddingTop: '1rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>
                      <span>Subtotal:</span>
                      <span style={{fontWeight: 600}}>{formatPrice(subtotal)}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>
                      <span>Tax (16%):</span>
                      <span style={{fontWeight: 600}}>{formatPrice(tax)}</span>
                    </div>
                    {orderType === 'delivery' && (
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>
                        <span>Delivery Fee:</span>
                        <span style={{fontWeight: 600}}>{formatPrice(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="cart-total">
                      <span>Total:</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <button className="checkout-btn" onClick={placeOrder}>
                      <span>Place {orderType === 'pickup' ? 'Pickup' : orderType === 'delivery' ? 'Delivery' : 'Pre-Order'} Order</span>
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