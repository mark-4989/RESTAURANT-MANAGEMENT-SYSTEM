// waiter-app/src/App.jsx
import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from './pages/LoginPage';
import WaiterDashboard from './pages/WaiterDashboard';
import CreateOrder from './pages/CreateOrder';
import MyOrders from './pages/MyOrders';
import ReadyOrders from './pages/ReadyOrders';
import './styles/global.css';

function App() {
  const [currentStaff, setCurrentStaff] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Check if staff is already logged in (from localStorage)
    const savedStaff = localStorage.getItem('waiter_staff');
    if (savedStaff) {
      setCurrentStaff(JSON.parse(savedStaff));
    }
  }, []);

  const handleLogin = (staff) => {
    setCurrentStaff(staff);
    localStorage.setItem('waiter_staff', JSON.stringify(staff));
  };

  const handleLogout = () => {
    setCurrentStaff(null);
    localStorage.removeItem('waiter_staff');
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard':
        return <WaiterDashboard staff={currentStaff} onNavigate={setCurrentPage} />;
      case 'ready-orders':
        return <ReadyOrders staff={currentStaff} onNavigate={setCurrentPage} />;
      case 'create-order':
        return <CreateOrder staff={currentStaff} onNavigate={setCurrentPage} />;
      case 'my-orders':
        return <MyOrders staff={currentStaff} onNavigate={setCurrentPage} />;
      default:
        return <WaiterDashboard staff={currentStaff} onNavigate={setCurrentPage} />;
    }
  };

  if (!currentStaff) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      {/* Waiter Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px',
        background: 'rgba(16, 185, 129, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>
            🍽️ Waiter Station
          </span>
          
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`btn ${currentPage === 'dashboard' ? 'btn-white' : 'btn-glass'}`}
            style={{ padding: '10px 20px' }}
          >
            📊 Dashboard
          </button>
          
          <button
            onClick={() => setCurrentPage('ready-orders')}
            className={`btn ${currentPage === 'ready-orders' ? 'btn-white' : 'btn-glass'}`}
            style={{ 
              padding: '10px 20px',
              position: 'relative',
              animation: currentPage !== 'ready-orders' ? 'pulse 2s infinite' : 'none'
            }}
          >
            🔔 Ready Orders
          </button>
          
          <button
            onClick={() => setCurrentPage('create-order')}
            className={`btn ${currentPage === 'create-order' ? 'btn-white' : 'btn-glass'}`}
            style={{ padding: '10px 20px' }}
          >
            ➕ New Order
          </button>
          
          <button
            onClick={() => setCurrentPage('my-orders')}
            className={`btn ${currentPage === 'my-orders' ? 'btn-white' : 'btn-glass'}`}
            style={{ padding: '10px 20px' }}
          >
            📦 My Orders
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ 
            color: 'white', 
            fontSize: '14px',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '8px 16px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '24px' }}>
              {currentStaff.role === 'waiter' ? '🍽️' : '👤'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 'bold' }}>
                {currentStaff.firstName} {currentStaff.lastName}
              </span>
              <span style={{ fontSize: '11px', opacity: 0.9 }}>
                {currentStaff.employeeId} • {currentStaff.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-glass"
            style={{ padding: '10px 20px', color: 'white' }}
          >
            🚪 Logout
          </button>
        </div>
      </nav>

      <div style={{ paddingTop: '80px' }}>
        {renderPage()}
      </div>

      {/* Add pulse animation for Ready Orders button */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </div>
  );
}

export default App;