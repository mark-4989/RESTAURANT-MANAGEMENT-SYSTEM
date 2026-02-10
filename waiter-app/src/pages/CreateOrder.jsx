// waiter-app/src/pages/CreateOrder.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import '../styles/create-order.css';

const CreateOrder = ({ staff, onNavigate }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Order details
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState('dine-in');

  const categories = [
    { id: 'all', name: 'All', icon: '🍽️' },
    { id: 'appetizers', name: 'Appetizers', icon: '🥗' },
    { id: 'mains', name: 'Mains', icon: '🍖' },
    { id: 'desserts', name: 'Desserts', icon: '🍰' },
    { id: 'beverages', name: 'Beverages', icon: '🥤' }
  ];

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/menu');
      const data = await response.json();
      
      if (data.success) {
        setMenuItems(data.data.filter(item => item.available));
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem._id === item._id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
      toast.success(`Added another ${item.name}`);
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
      toast.success(`${item.name} added to cart`);
    }
  };

  const updateQuantity = (itemId, change) => {
    setCart(cart.map(item => {
      if (item._id === itemId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeItem = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
    toast.info('Item removed from cart');
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.16);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.warning('Cart is empty!');
      return;
    }

    if (!tableNumber) {
      toast.warning('Please enter table number');
      return;
    }

    if (!customerName) {
      toast.warning('Please enter customer name');
      return;
    }

    const { subtotal, tax, total } = calculateTotal();

    const orderData = {
      tableNumber,
      customerName,
      items: cart.map(item => ({
        menuItem: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      tax,
      total,
      orderType,
      paymentStatus: 'pending',
      status: 'pending',
      createdBy: staff._id,
      createdByName: `${staff.firstName} ${staff.lastName}`,
      createdByEmployeeId: staff.employeeId
    };

    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ Order ${data.data.orderNumber} created successfully!`);
        
        // Reset form
        setCart([]);
        setTableNumber('');
        setCustomerName('');
        
        // Navigate to My Orders
        setTimeout(() => {
          onNavigate('my-orders');
        }, 1500);
      } else {
        toast.error(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    }
  };

  const filteredMenu = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const { subtotal, tax, total } = calculateTotal();
  const formatPrice = (price) => `KSh ${price.toLocaleString()}`;

  return (
    <div className="create-order-page">
      <div className="create-order-container">
        {/* Left Side - Menu */}
        <div className="menu-section">
          <div className="menu-header">
            <h2>📋 Menu</h2>
            <div className="search-box">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Menu Items */}
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading menu...</p>
            </div>
          ) : (
            <div className="menu-grid">
              {filteredMenu.map(item => (
                <div key={item._id} className="menu-item-card">
                  <img src={item.image} alt={item.name} />
                  <div className="menu-item-info">
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <div className="menu-item-footer">
                      <span className="price">{formatPrice(item.price)}</span>
                      <button 
                        onClick={() => addToCart(item)}
                        className="add-btn"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side - Cart & Order Details */}
        <div className="cart-section">
          <div className="order-details-card">
            <h2>📝 Order Details</h2>
            
            <div className="form-group">
              <label>Table Number *</label>
              <input
                type="text"
                placeholder="e.g., T-5"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                placeholder="e.g., John Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Order Type</label>
              <select 
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="dine-in">🍽️ Dine In</option>
                <option value="takeaway">📦 Takeaway</option>
              </select>
            </div>
          </div>

          <div className="cart-card">
            <h2>🛒 Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</h2>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <span className="empty-icon">🛒</span>
                <p>Cart is empty</p>
                <small>Add items from the menu</small>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item._id} className="cart-item">
                      <div className="cart-item-info">
                        <h4>{item.name}</h4>
                        <p>{formatPrice(item.price)} each</p>
                      </div>
                      <div className="cart-item-controls">
                        <button 
                          onClick={() => updateQuantity(item._id, -1)}
                          className="qty-btn"
                        >
                          −
                        </button>
                        <span className="qty">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item._id, 1)}
                          className="qty-btn"
                        >
                          +
                        </button>
                        <button 
                          onClick={() => removeItem(item._id)}
                          className="remove-btn"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="cart-item-total">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax (16%):</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total:</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <button 
                  onClick={handlePlaceOrder}
                  className="place-order-btn"
                >
                  🍽️ Place Order
                </button>
              </>
            )}
          </div>

          <div className="waiter-info">
            <small>
              Order will be assigned to:<br />
              <strong>{staff.firstName} {staff.lastName}</strong> ({staff.employeeId})
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;