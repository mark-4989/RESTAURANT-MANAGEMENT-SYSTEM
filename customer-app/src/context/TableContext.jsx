// customer-app/src/context/TableContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const TableContext = createContext();

export const useTable = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTable must be used within TableProvider');
  }
  return context;
};

export const TableProvider = ({ children }) => {
  const [tableNumber, setTableNumber] = useState(() => {
    // Try to get from localStorage first
    return localStorage.getItem('dinesmart_table_number') || '';
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    if (tableNumber) {
      localStorage.setItem('dinesmart_table_number', tableNumber);
    } else {
      localStorage.removeItem('dinesmart_table_number');
    }
  }, [tableNumber]);

  const clearTable = () => {
    setTableNumber('');
    localStorage.removeItem('dinesmart_table_number');
  };

  return (
    <TableContext.Provider value={{ tableNumber, setTableNumber, clearTable }}>
      {children}
    </TableContext.Provider>
  );
};