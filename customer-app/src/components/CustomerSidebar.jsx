// customer-app/src/components/CustomerSidebar.jsx  — COMPLETE FILE
import React, { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import {
  Home,
  UtensilsCrossed,
  Truck,
  Package,
  Calendar,
  Bell,
  ChevronLeft,
  ChevronRight,
  Utensils,
  User,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import '../styles/customer-sidebar.css';

const CustomerSidebar = ({ currentPage, onNavigate, isExpanded, setIsExpanded }) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const { theme, toggleTheme }        = useTheme();
  const { unreadCount }               = useNotifications();

  const menuItems = [
    { id: 'home',          icon: Home,            label: 'Home',             color: '#dc2626' },
    { id: 'menu',          icon: UtensilsCrossed,  label: 'Menu',             color: '#ef4444' },
    { id: 'order',         icon: Truck,            label: 'Pickup & Delivery', color: '#f87171' },
    { id: 'my-orders',     icon: Package,          label: 'My Orders',        color: '#dc2626' },
    { id: 'reservations',  icon: Calendar,         label: 'Reservations',     color: '#ef4444' },
    { id: 'notifications', icon: Bell,             label: 'Notifications',    color: '#dc2626', badge: unreadCount },
  ];

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const handleNavClick = (id) => {
    onNavigate(id);
    if (window.innerWidth <= 768) setIsExpanded(false);
  };

  return (
    <>
      {/* Mobile Hamburger */}
      <button className="mobile-hamburger" onClick={toggleSidebar} aria-label="Toggle menu">
        {isExpanded ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Unread dot on hamburger (mobile, sidebar closed) */}
      {!isExpanded && unreadCount > 0 && (
        <span className="hamburger-notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
      )}

      {/* Sidebar */}
      <div className={`customer-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>

        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-icon">
              <Utensils size={28} strokeWidth={2} />
            </div>
            {isExpanded && (
              <div className="logo-text">
                <h2>DineSmart</h2>
                <span>Order & Dine</span>
              </div>
            )}
          </div>

          <button className="toggle-btn desktop-only" onClick={toggleSidebar}>
            <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>
              {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''} ${hoveredItem === item.id ? 'hovered' : ''}`}
                onClick={() => handleNavClick(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ '--item-index': index, '--item-color': item.color }}
              >
                <div className="nav-item-content">
                  {/* Icon with optional badge bubble */}
                  <div className="nav-icon" style={{ position: 'relative' }}>
                    <IconComponent size={22} strokeWidth={2} />
                    {item.badge > 0 && (
                      <span className="nav-badge">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>

                  {isExpanded && <span className="nav-label">{item.label}</span>}

                  {/* Count pill shown in expanded state */}
                  {isExpanded && item.badge > 0 && (
                    <span className="nav-badge-pill">{item.badge > 99 ? '99+' : item.badge}</span>
                  )}

                  {currentPage === item.id && <div className="active-indicator" />}
                </div>

                {/* Tooltip for collapsed desktop */}
                {!isExpanded && (
                  <div className="nav-tooltip">
                    {item.label}
                    {item.badge > 0 && ` (${item.badge})`}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Theme toggle */}
          <button
            className="theme-toggle-sidebar"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <div className="theme-icon">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </div>
            {isExpanded && (
              <span className="theme-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            )}
          </button>

          {/* Signed-in user info */}
          <SignedIn>
            <div className="user-profile">
              <div className="user-avatar">
                <User size={20} strokeWidth={2} />
              </div>
              {isExpanded && (
                <div className="user-info">
                  <span className="user-name">My Account</span>
                  <span className="user-role">Customer</span>
                </div>
              )}
            </div>
          </SignedIn>

          {/* Sign-in button (signed out) */}
          <SignedOut>
            {isExpanded ? (
              <SignInButton mode="modal">
                <button className="signin-btn">
                  <User size={18} strokeWidth={2} />
                  <span>Sign In</span>
                </button>
              </SignInButton>
            ) : (
              <SignInButton mode="modal">
                <button className="signin-btn signin-btn-collapsed">
                  <User size={18} strokeWidth={2} />
                </button>
              </SignInButton>
            )}
          </SignedOut>

          {/* Clerk UserButton (signed in) */}
          <SignedIn>
            {isExpanded ? (
              <div className="clerk-user-button"><UserButton afterSignOutUrl="/" /></div>
            ) : (
              <div className="clerk-user-button-collapsed"><UserButton afterSignOutUrl="/" /></div>
            )}
          </SignedIn>
        </div>
      </div>
    </>
  );
};

export default CustomerSidebar;