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
  User
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

  return (
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
        <button className="toggle-btn" onClick={toggleSidebar}>
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
              onClick={() => setCurrentPage(item.id)}
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
              
              {/* Tooltip for collapsed state */}
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
  );
};

export default Sidebar;