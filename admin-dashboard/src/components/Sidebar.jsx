import React, { useState } from 'react';
import { 
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  TrendingUp,
  QrCode,
  Users,
  Car,
  Truck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  User,
  Menu,
  X
} from 'lucide-react';
import '../styles/sidebar.css';

const Sidebar = ({ currentPage, setCurrentPage, isExpanded, setIsExpanded }) => {
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#4f7cac' },
    { id: 'orders', icon: Package, label: 'Orders', color: '#5a8bc4' },
    { id: 'menu', icon: UtensilsCrossed, label: 'Menu', color: '#6b9bd8' },
    { id: 'analytics', icon: TrendingUp, label: 'Analytics', color: '#7eb3e8' },
    { id: 'qr-codes', icon: QrCode, label: 'QR Codes', color: '#4f7cac' },
    { id: 'staff', icon: Users, label: 'Staff', color: '#5a8bc4' },
    { id: 'drivers', icon: Car, label: 'Drivers', color: '#6b9bd8' },
    { id: 'deliveries', icon: Truck, label: 'Deliveries', color: '#7eb3e8' },
    { id: 'reservations', icon: Calendar, label: 'Reservations', color: '#4f7cac' },
  ];

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const handleNavClick = (id) => {
    setCurrentPage(id);
    // Auto-close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
      setIsExpanded(false);
    }
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button 
        className="mobile-hamburger"
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        {isExpanded ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">
              <Shield size={28} strokeWidth={2} />
            </div>
            {isExpanded && (
              <div className="logo-text">
                <h2>DineSmart</h2>
                <span>Admin Portal</span>
              </div>
            )}
          </div>
          
          {/* Desktop Toggle Button */}
          <button className="toggle-btn desktop-only" onClick={toggleSidebar}>
            <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>
              {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''} ${
                  hoveredItem === item.id ? 'hovered' : ''
                }`}
                onClick={() => handleNavClick(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  '--item-index': index,
                  '--item-color': item.color,
                }}
              >
                <div className="nav-item-content">
                  <div className="nav-icon">
                    <IconComponent size={22} strokeWidth={2} />
                  </div>
                  {isExpanded && (
                    <span className="nav-label">{item.label}</span>
                  )}
                  {currentPage === item.id && (
                    <div className="active-indicator"></div>
                  )}
                </div>
                
                {/* Tooltip for collapsed state (desktop only) */}
                {!isExpanded && (
                  <div className="nav-tooltip">{item.label}</div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <User size={20} strokeWidth={2} />
            </div>
            {isExpanded && (
              <div className="user-info">
                <span className="user-name">Admin User</span>
                <span className="user-role">Administrator</span>
              </div>
            )}
          </div>
          {isExpanded ? (
            <button className="logout-btn">
              <LogOut size={18} strokeWidth={2} />
              <span>Logout</span>
            </button>
          ) : (
            <button className="logout-btn logout-btn-collapsed">
              <LogOut size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;