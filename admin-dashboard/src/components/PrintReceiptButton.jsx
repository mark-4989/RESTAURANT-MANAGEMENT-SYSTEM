// admin-dashboard/src/components/PrintReceiptButton.jsx
import React, { useState } from 'react';

const PrintReceiptButton = ({ order }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePrintReceipt = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📄 Downloading receipt for order:', order.orderNumber);

      // Fetch PDF from backend
      const response = await fetch(`http://localhost:5000/api/receipts/${order._id}`);

      if (!response.ok) {
        throw new Error('Failed to generate receipt');
      }

      // Get PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Receipt downloaded successfully');

    } catch (err) {
      console.error('❌ Print receipt error:', err);
      setError('Failed to generate receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="print-receipt-container">
      <button
        onClick={handlePrintReceipt}
        disabled={loading}
        className="print-receipt-btn"
        title="Download Receipt PDF"
      >
        {loading ? (
          <>
            <span className="spinner-small"></span>
            Generating...
          </>
        ) : (
          <>
            🖨️ Print Receipt
          </>
        )}
      </button>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
};

export default PrintReceiptButton;