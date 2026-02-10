import React, { useState } from 'react';
import { Package, Search, AlertCircle } from 'lucide-react';
import '../styles/dark-theme-master.css';

const OrderTracking = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTrackOrder = async () => {
    if (!orderNumber) {
      alert('Please enter an order number');
      return;
    }

    setLoading(true);
    setError(null);
    
    // In a real app, you'd search by order number
    // For now, this is a placeholder
    setTimeout(() => {
      setLoading(false);
      setError('Order tracking coming soon!');
    }, 1000);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '100px 20px 40px',
      background: 'var(--gradient-bg-primary)',
      position: 'relative'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="glass-card" style={{ padding: '40px' }}>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Package size={64} style={{ color: 'var(--brand-primary)' }} />
            <h1 style={{ 
              color: 'var(--text-primary)', 
              fontSize: '32px', 
              fontWeight: 700,
              margin: 0
            }}>
              Track Your Order
            </h1>
          </div>
          
          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <Search 
              size={20} 
              style={{ 
                position: 'absolute', 
                left: '16px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none'
              }} 
            />
            <input
              type="text"
              placeholder="Enter order number (e.g., ORD-0001)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTrackOrder()}
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          <button
            onClick={handleTrackOrder}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '16px', 
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                Searching...
              </>
            ) : (
              <>
                <Search size={20} />
                Track Order
              </>
            )}
          </button>

          {error && (
            <div style={{ 
              marginTop: '24px', 
              padding: '16px', 
              background: 'var(--status-error-bg)',
              border: '1px solid var(--status-error-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-error)',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;