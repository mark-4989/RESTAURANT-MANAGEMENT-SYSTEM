import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import MenuManagement from './pages/MenuManagement';
import Analytics from './pages/Analytics';
import QRCodeManager from './pages/QRCodeManager';
import StaffManagement from './pages/StaffManagement';
import DriverManagement from './pages/DriverManagement';
import ReservationManagement from './pages/ReservationManagement';
import DeliveryManagement from './pages/DeliveryManagement';

import './styles/global.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'orders':
        return <Orders />;
      case 'menu':
        return <MenuManagement />;
      case 'analytics':
        return <Analytics />;
      case 'qr-codes':
        return <QRCodeManager />;
      case 'staff':
        return <StaffManagement />;
      case 'drivers':
        return <DriverManagement />;
      case 'deliveries':
        return <DeliveryManagement />;
      case 'reservations':
        return <ReservationManagement />;
      default:
        return <Dashboard />;
    }
  };

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

      {/* Sidebar Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        isExpanded={sidebarExpanded}
        setIsExpanded={setSidebarExpanded}
      />

      {/* Main Content Area */}
      <div className={`main-content ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;