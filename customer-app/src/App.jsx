// customer-app/src/App.jsx  — COMPLETE FILE
import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { TableProvider }  from './context/TableContext';
import { ThemeProvider }  from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext'; // ← NEW

import CustomerSidebar       from './components/CustomerSidebar';
import ToastNotifications    from './components/ToastNotifications'; // ← NEW

import HomePage              from './pages/Home';
import Menu                  from './pages/Menu';
import MyOrders              from './pages/MyOrders';
import PreOrdersReservations from './pages/PreOrdersReservations';
import OrderPage             from './pages/OrderPage';
import NotificationsPage     from './pages/NotificationsPage';        // ← NEW

import './styles/global.css';
import './styles/dark-theme-master.css';
import './styles/light-theme.css';
import './styles/customer-sidebar.css';

// AppInner lives inside ClerkProvider so useUser() works
function AppInner() {
  const { user } = useUser();
  const userId   = user?.id || null; // Clerk user ID — null when signed out

  const [currentPage,     setCurrentPage]     = useState('home');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':          return <HomePage              onNavigate={setCurrentPage} />;
      case 'menu':          return <Menu                  onNavigate={setCurrentPage} />;
      case 'my-orders':     return <MyOrders              onNavigate={setCurrentPage} />;
      case 'order':         return <OrderPage             onNavigate={setCurrentPage} />;
      case 'reservations':  return <PreOrdersReservations onNavigate={setCurrentPage} />;
      case 'notifications': return <NotificationsPage />;                                // ← NEW
      default:              return <HomePage              onNavigate={setCurrentPage} />;
    }
  };

  return (
    <NotificationProvider userId={userId}>
      <div className="app">
        {/* Sidebar */}
        <CustomerSidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          isExpanded={sidebarExpanded}
          setIsExpanded={setSidebarExpanded}
        />

        {/* Main Content */}
        <main className={`main-content-customer ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
          {renderPage()}
        </main>

        {/* Floating toast notifications (replaces react-toastify for order updates) */}
        <ToastNotifications />
      </div>
    </NotificationProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TableProvider>
        <AppInner />
      </TableProvider>
    </ThemeProvider>
  );
}

export default App;