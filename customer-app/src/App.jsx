// customer-app/src/App.jsx
import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TableProvider } from './context/TableContext';
import { ThemeProvider } from './context/ThemeContext';
import CustomerSidebar from './components/CustomerSidebar';
import HomePage from './pages/Home';
import Menu from './pages/Menu';
import MyOrders from './pages/MyOrders';
import PreOrdersReservations from './pages/PreOrdersReservations';
import OrderPage from './pages/OrderPage';
import './styles/global.css';
import './styles/dark-theme-master.css';
import './styles/light-theme.css';
import './styles/customer-sidebar.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'menu':
        return <Menu onNavigate={setCurrentPage} />;
      case 'my-orders':
        return <MyOrders onNavigate={setCurrentPage} />;
      case 'order':
        return <OrderPage onNavigate={setCurrentPage} />;
      case 'reservations':
        return <PreOrdersReservations onNavigate={setCurrentPage} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <ThemeProvider>
      <TableProvider>
        <div className="app">
          {/* Sidebar Navigation */}
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

          {/* Toast Notifications */}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </div>
      </TableProvider>
    </ThemeProvider>
  );
}

export default App;