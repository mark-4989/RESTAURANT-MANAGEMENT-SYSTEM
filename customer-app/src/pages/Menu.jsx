import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTable } from '../context/TableContext';
import { menuCategories, formatPrice } from '../data/menuData';
import { getAllMenuItems, seedMenuItems } from '../api/menuApi';
import { createOrder } from '../api/orderApi';
import { useNotifications } from '../context/NotificationContext';
import { Search, ShoppingCart, MapPin, Edit2, X, Plus, Minus, Trash2, Utensils } from 'lucide-react';
import menuBgLeft from '../assets/menu-bg-left.png';
import menuBgRight from '../assets/menu-bg-right.png';
import '../styles/menu.css';

const Menu = () => {
  const { user } = useUser();
  const { tableNumber, setTableNumber } = useTable();
  const { addNotification } = useNotifications();

  // Simple in-component toast — replaces react-toastify (not installed on Vercel)
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Fetch menu items on component mount
  useEffect(() => {
    fetchMenuItems();
  }, [selectedCategory, searchQuery]);

  const fetchMenuItems = async () => {
    setLoading(true);
    setError(null);
    
    const result = await getAllMenuItems(selectedCategory, searchQuery);
    
    if (result.success) {
      setMenuItems(result.data);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  // Seed database helper
  const handleSeedDatabase = async () => {
    const result = await seedMenuItems();
    if (result.success) {
      showToast(`✅ Added ${result.count} menu items!`);
      fetchMenuItems();
    } else {
      showToast(`❌ Error: ${result.error}`, 'error');
    }
  };

  // Add item to cart
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem._id === item._id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
      showToast(`Added another ${item.name}!`);
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
      showToast(`${item.name} added to cart!`);
    }
  };

  // Update quantity
  const updateQuantity = (itemId, change) => {
    setCart(cart.map(item => {
      if (item._id === itemId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Remove item
  const removeItem = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
    showToast('Item removed from cart', 'info');
  };

  // Calculate total
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Handle checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty!', 'warning');
      return;
    }

    let finalTableNumber = tableNumber;
    if (!finalTableNumber) {
      const inputTable = prompt('Enter table number (or type "Takeaway"):');
      if (inputTable) {
        finalTableNumber = inputTable;
        setTableNumber(inputTable);
      } else {
        finalTableNumber = 'Walk-in';
      }
    }

    const customerName  = user?.fullName || user?.firstName || prompt('Enter your name:') || 'Guest';
    const customerId    = user?.id || null; // ← Clerk user ID for notifications
    const customerEmail = user?.primaryEmailAddress?.emailAddress || '';
    const orderType     = finalTableNumber === 'Takeaway' ? 'pickup' : 'dine-in';

    const subtotal = Math.round(cartTotal);
    const tax      = Math.round(cartTotal * 0.16);
    const total    = subtotal + tax;

    const orderData = {
      tableNumber: finalTableNumber,
      customerName,
      customerEmail,
      customerId,   // ← was missing — this is why notifications were silently skipped
      items: cart.map(item => ({
        menuItem: item._id,
        name:     item.name,
        quantity: item.quantity,
        price:    item.price,
      })),
      subtotal,
      tax,
      total,
      orderType,
      paymentStatus: 'pending',
      status:        'pending',
    };

    console.log('📦 Creating order:', orderData);

    const result = await createOrder(orderData);

    if (result.success) {
      const orderNumber = result.data.orderNumber;
      showToast(`✅ Order ${orderNumber} placed for Table ${finalTableNumber}!`);

      // Instant local notification — shows toast + updates bell badge immediately
      // Backend socket notification will also arrive shortly after
      addNotification('ORDER_PLACED', {
        orderId:     result.data._id,
        orderNumber,
        orderType,
      });

      setCart([]);
      setIsCartOpen(false);
    } else {
      showToast(`❌ Error: ${result.error}`, 'error');
    }
  };

  // Get random decoration icons based on item type
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
    <div className="menu-page">
      {/* Inline toast — replaces react-toastify */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
          background: toastMsg.type === 'error' ? '#ef4444' : toastMsg.type === 'warning' ? '#f59e0b' : toastMsg.type === 'info' ? '#3b82f6' : '#10b981',
          color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '100px',
          fontWeight: 600, fontSize: '0.9rem', zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
          animation: 'fadeup 0.25s ease',
        }}>
          {toastMsg.msg}
        </div>
      )}
      <style>{`@keyframes fadeup { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      {/* Background Images - Using imported assets */}
      <div 
        className="menu-bg-left" 
        style={{ backgroundImage: `url(${menuBgLeft})` }}
      ></div>
      <div 
        className="menu-bg-right" 
        style={{ backgroundImage: `url(${menuBgRight})` }}
      ></div>

      <div className="container">
        {/* Header */}
        <div className="menu-header fade-in">
          <h1 className="menu-title">Our Menu</h1>
          <p className="menu-subtitle">
            {tableNumber 
              ? `Ordering for Table ${tableNumber}` 
              : 'Discover delicious dishes crafted with care'}
          </p>
        </div>

        {/* Table Number Display */}
        {tableNumber && (
          <div style={{
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{
              display: 'inline-block',
              background: 'rgba(16, 185, 129, 0.1)',
              backdropFilter: 'blur(10px)',
              padding: '0.75rem 1.5rem',
              borderRadius: '50px',
              border: '2px solid #10b981',
              color: '#10b981',
              fontWeight: '600'
            }}>
              <MapPin size={18} className="inline-icon" /> Table {tableNumber}
              <button
                onClick={() => {
                  if (window.confirm('Change table number?')) {
                    const newTable = prompt('Enter new table number:', tableNumber);
                    if (newTable) setTableNumber(newTable);
                  }
                }}
                style={{
                  marginLeft: '1rem',
                  background: 'none',
                  border: 'none',
                  color: '#10b981',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <Edit2 size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Search and Cart */}
        <div className="search-filter-bar fade-in-delay-1">
          <div className="search-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="cart-trigger" onClick={() => setIsCartOpen(true)}>
            <ShoppingCart size={20} />
            <span>Cart</span>
            {cartItemCount > 0 && <span className="cart-count">{cartItemCount}</span>}
          </button>
        </div>

        {/* Category Filters */}
        <div className="category-filters fade-in-delay-2">
          {menuCategories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="cart-empty">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p style={{ color: 'white' }}>Loading menu...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="cart-empty">
            <div className="cart-empty-icon">❌</div>
            <p style={{ color: 'white' }}>Error: {error}</p>
            <button className="btn btn-primary mt-3" onClick={fetchMenuItems}>
              Retry
            </button>
          </div>
        )}

        {/* Empty - Seed Helper */}
        {!loading && !error && menuItems.length === 0 && (
          <div className="cart-empty">
            <div className="cart-empty-icon">
              <Utensils size={80} strokeWidth={1.5} style={{ opacity: 0.3 }} />
            </div>
            <p style={{ color: 'white', fontSize: '18px', marginBottom: '16px' }}>
              No menu items found
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '24px' }}>
              Database is empty. Add sample items?
            </p>
            <button className="btn btn-primary" onClick={handleSeedDatabase}>
              Add Sample Menu Items
            </button>
          </div>
        )}

        {/* Menu Grid - CIRCLE + SQUARE DESIGN */}
        {!loading && menuItems.length > 0 && (
          <div className="menu-grid fade-in-delay-3">
            {menuItems.map(item => {
              const decorIcons = getDecorationIcons(item);
              const isHovered = hoveredItem === item._id;

              return (
                <div 
                  key={item._id} 
                  className="menu-item-wrapper"
                  onMouseEnter={() => setHoveredItem(item._id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Circular Image at Top */}
                  <div className="menu-item-image-circle">
                    <img src={item.image} alt={item.name} className="menu-item-image" />
                    
                    {/* Decorative Icons (floating around circle) */}
                    <div className="menu-item-decorations">
                      <span className="decoration-icon">{decorIcons[0]}</span>
                      <span className="decoration-icon">{decorIcons[1]}</span>
                      <span className="decoration-icon">{decorIcons[2]}</span>
                      <span className="decoration-icon">{decorIcons[3]}</span>
                    </div>
                  </div>

                  {/* Square Card Below (overlapping circle) */}
                  <div className="menu-item-card">
                    {/* Basic Info (Always Visible) */}
                    <div className="menu-item-content">
                      <h3 className="menu-item-name">{item.name}</h3>
                      <div className="menu-item-meta">
                        <span className="menu-item-calories">{item.calories || '180'} cal</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                        <div className="menu-item-price">{formatPrice(item.price)}</div>
                      </div>
                    </div>

                    {/* Hover Details */}
                    {isHovered && (
                      <div className="menu-item-hover-details">
                        {/* Description */}
                        <p className="hover-card-description">{item.description}</p>

                        {/* Ingredients */}
                        {item.ingredients && (
                          <div className="hover-card-ingredients">
                            <h4>Ingredients</h4>
                            <p>{item.ingredients}</p>
                          </div>
                        )}

                        {/* Badges */}
                        <div className="menu-item-badges">
                          {item.popular && <span className="badge badge-popular">Popular</span>}
                          {item.spicy && <span className="badge badge-spicy">🌶️ Spicy</span>}
                          {item.dietary?.includes('vegetarian') && (
                            <span className="badge badge-vegetarian">🥬 Veg</span>
                          )}
                          {item.dietary?.includes('vegan') && (
                            <span className="badge badge-vegan">🌱 Vegan</span>
                          )}
                        </div>

                        {/* Add to Cart Button */}
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

      {/* Cart Overlay */}
      <div
        className={`cart-overlay ${isCartOpen ? 'active' : ''}`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Cart Sidebar */}
      <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2 className="cart-title">Your Cart ({cartItemCount})</h2>
          <button className="cart-close" onClick={() => setIsCartOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Table Number in Cart */}
        {tableNumber && (
          <div style={{
            padding: '1rem',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '10px',
            margin: '0 1rem 1rem',
            textAlign: 'center',
            color: '#10b981',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <MapPin size={18} />
            <span>Table {tableNumber}</span>
          </div>
        )}

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">
                <ShoppingCart size={80} strokeWidth={1.5} style={{ opacity: 0.3 }} />
              </div>
              <p>Your cart is empty</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Add some delicious items!
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item._id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-image" />
                <div className="cart-item-details">
                  <h4 className="cart-item-name">{item.name}</h4>
                  <p className="cart-item-price">{formatPrice(item.price)} each</p>
                  <div className="cart-item-controls">
                    <button
                      className="quantity-btn"
                      onClick={() => updateQuantity(item._id, -1)}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="quantity-display">{item.quantity}</span>
                    <button
                      className="quantity-btn"
                      onClick={() => updateQuantity(item._id, 1)}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      className="remove-item-btn"
                      onClick={() => removeItem(item._id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>
              <Utensils size={20} />
              <span>Place Order {tableNumber && `(Table ${tableNumber})`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;