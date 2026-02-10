// customer-app/src/components/Navbar.jsx
import React, { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Home, UtensilsCrossed, Truck, Package, Calendar, X, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ currentPage, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme } = useTheme();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavClick = (page) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'order', label: 'Pickup & Delivery', icon: Truck },
    { id: 'my-orders', label: 'My Orders', icon: Package },
    { id: 'reservations', label: 'Reservations', icon: Calendar }
  ];

  const navButtonStyle = (page) => ({
    padding: '0.875rem 1.5rem',
    background: currentPage === page 
      ? 'var(--gradient-primary)' 
      : 'rgba(var(--brand-primary-rgb), 0.1)',
    color: currentPage === page ? 'var(--text-inverse)' : 'var(--text-secondary)',
    border: currentPage === page ? 'none' : '1px solid var(--border-primary)',
    borderRadius: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.95rem',
    whiteSpace: 'nowrap'
  });

  return (
    <>
      {/* Fixed Navigation Bar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-elevated)',
        backdropFilter: 'blur(20px)',
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1000,
        borderBottom: '1px solid var(--border-primary)'
      }}>
        {/* Logo/Brand - Visible on Mobile */}
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          display: 'none'
        }}
        className="mobile-logo">
          DineSmart
        </div>

        {/* Desktop Navigation Buttons - Hidden on Mobile */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }} className="desktop-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={navButtonStyle(item.id)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.background = 'var(--btn-secondary-bg)';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.background = 'rgba(var(--brand-primary-rgb), 0.1)';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                <Icon size={18} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Theme Toggle + User Profile + Mobile Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThemeToggle />
          
          {/* Desktop Sign In */}
          <div className="desktop-auth">
            <SignedOut>
              <SignInButton mode="modal">
                <button 
                  className="btn-primary"
                  style={{
                    padding: '0.875rem 1.75rem',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = 'var(--shadow-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'var(--shadow-md)';
                  }}
                >
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={toggleMenu}
            className="mobile-menu-toggle"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--gradient-primary)',
              color: 'var(--text-inverse)',
              cursor: 'pointer',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: 'var(--shadow-md)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
            }}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          onClick={toggleMenu}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--overlay-heavy)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
            animation: 'fadeIn 0.3s ease'
          }}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isMenuOpen ? 0 : '-100%',
          width: '85%',
          maxWidth: '400px',
          height: '100vh',
          background: 'var(--bg-elevated)',
          backdropFilter: 'blur(30px)',
          boxShadow: 'var(--shadow-xl)',
          transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border-primary)',
          overflowY: 'auto'
        }}
      >
        {/* Menu Header */}
        <div style={{
          padding: '2rem 1.5rem',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0
          }}>Menu</h2>
          <button
            onClick={toggleMenu}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid var(--border-primary)',
              background: 'rgba(var(--brand-primary-rgb), 0.05)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'rotate(90deg)';
              e.target.style.background = 'rgba(239, 68, 68, 0.15)';
              e.target.style.borderColor = 'var(--status-error)';
              e.target.style.color = 'var(--status-error)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'rotate(0deg)';
              e.target.style.background = 'rgba(var(--brand-primary-rgb), 0.05)';
              e.target.style.borderColor = 'var(--border-primary)';
              e.target.style.color = 'var(--text-primary)';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Links */}
        <div style={{
          flex: 1,
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  padding: '1.25rem 1.5rem',
                  background: isActive ? 'var(--gradient-primary)' : 'transparent',
                  color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.background = 'rgba(var(--brand-primary-rgb), 0.1)';
                    e.target.style.transform = 'translateX(5px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.background = 'transparent';
                    e.target.style.transform = 'translateX(0)';
                  }
                }}
              >
                <Icon size={24} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Menu Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid var(--border-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Mobile Sign In */}
          <SignedOut>
            <SignInButton mode="modal">
              <button
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--gradient-primary)',
                  color: 'var(--text-inverse)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: 'var(--shadow-md)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = 'var(--shadow-hover)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'var(--shadow-md)';
                }}
              >
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              background: 'rgba(var(--brand-primary-rgb), 0.1)',
              borderRadius: '12px',
              border: '1px solid var(--border-primary)'
            }}>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          
          <div style={{
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            fontSize: '0.85rem',
            paddingTop: '0.5rem'
          }}>
            © 2024 DineSmart. All rights reserved.
          </div>
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Desktop styles (default) */
        .mobile-logo {
          display: none !important;
        }

        .mobile-menu-toggle {
          display: none !important;
        }

        .desktop-nav {
          display: flex !important;
        }

        .desktop-auth {
          display: flex !important;
        }

        /* Mobile styles */
        @media (max-width: 968px) {
          .mobile-logo {
            display: block !important;
          }

          .mobile-menu-toggle {
            display: flex !important;
          }

          .desktop-nav {
            display: none !important;
          }

          .desktop-auth {
            display: none !important;
          }

          /* Hide nav labels on smaller tablets */
          @media (max-width: 768px) and (min-width: 481px) {
            .nav-label {
              display: none;
            }
          }
        }

        /* Tablet adjustments */
        @media (max-width: 1024px) and (min-width: 969px) {
          .nav-label {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;