// customer-app/src/pages/PreOrdersReservations.jsx
// TABLE RESERVATIONS ONLY (Orders moved to OrderPage.jsx)

import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import '../styles/preorders.css';
import '../styles/dark-theme-master.css'

const PreOrdersReservations = ({ onNavigate }) => {
  const { user } = useUser();
  
  // Reservation State
  const [reservationForm, setReservationForm] = useState({
    date: '',
    time: '',
    partySize: 2,
    tablePreference: 'any',
    specialRequests: '',
    occasionType: '',
    phoneNumber: ''
  });
  
  const [loading, setLoading] = useState(false);

  // Handle Reservation Submission
  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    
    if (!reservationForm.date || !reservationForm.time || !reservationForm.phoneNumber) {
      toast.error('⚠️ Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: user?.fullName || 'Guest',
          customerEmail: user?.primaryEmailAddress?.emailAddress || '',
          phoneNumber: reservationForm.phoneNumber,
          date: reservationForm.date,
          time: reservationForm.time,
          partySize: reservationForm.partySize,
          tablePreference: reservationForm.tablePreference,
          specialRequests: reservationForm.specialRequests,
          occasionType: reservationForm.occasionType,
          status: 'pending'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('🎉 Reservation request submitted!');
        toast.info(`Confirmation Code: ${data.data.confirmationCode}`);
        
        // Reset form
        setReservationForm({
          date: '', time: '', partySize: 2,
          tablePreference: 'any', specialRequests: '', occasionType: '', phoneNumber: ''
        });
      } else {
        toast.error(`❌ ${data.message || 'Failed to submit reservation'}`);
      }
    } catch (error) {
      console.error('Reservation error:', error);
      toast.error('❌ Failed to submit reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="preorders-page">
      {/* Header */}
      <div className="preorders-header">
        <h1>📅 Table Reservations</h1>
        <p>Reserve your table for a special dining experience</p>
      </div>

      {/* Reservation Form */}
      <div className="form-container" style={{gridTemplateColumns: '1fr', maxWidth: '800px', margin: '0 auto'}}>
        <div className="form-card">
          <h2>📋 Reserve Your Table</h2>
          <p className="form-description">
            Secure your spot! Book a table for your next visit.
          </p>
          
          <form onSubmit={handleReservationSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>📅 Date *</label>
                <input
                  type="date"
                  value={reservationForm.date}
                  onChange={(e) => setReservationForm({...reservationForm, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>🕐 Time *</label>
                <input
                  type="time"
                  value={reservationForm.time}
                  onChange={(e) => setReservationForm({...reservationForm, time: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>👥 Party Size *</label>
                <select
                  value={reservationForm.partySize}
                  onChange={(e) => setReservationForm({...reservationForm, partySize: parseInt(e.target.value)})}
                  required
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>📱 Phone Number *</label>
                <input
                  type="tel"
                  placeholder="+254 712 345 678"
                  value={reservationForm.phoneNumber}
                  onChange={(e) => setReservationForm({...reservationForm, phoneNumber: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>🪑 Table Preference</label>
                <select
                  value={reservationForm.tablePreference}
                  onChange={(e) => setReservationForm({...reservationForm, tablePreference: e.target.value})}
                >
                  <option value="any">Any Available</option>
                  <option value="window">Window Seat</option>
                  <option value="outdoor">Outdoor Patio</option>
                  <option value="quiet">Quiet Corner</option>
                  <option value="center">Center Area</option>
                </select>
              </div>

              <div className="form-group">
                <label>🎉 Occasion (Optional)</label>
                <select
                  value={reservationForm.occasionType}
                  onChange={(e) => setReservationForm({...reservationForm, occasionType: e.target.value})}
                >
                  <option value="">Select occasion...</option>
                  <option value="birthday">🎂 Birthday</option>
                  <option value="anniversary">💑 Anniversary</option>
                  <option value="business">💼 Business Meeting</option>
                  <option value="date">❤️ Date Night</option>
                  <option value="celebration">🎊 Celebration</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>📝 Special Requests</label>
              <textarea
                rows="4"
                placeholder="High chair needed, dietary restrictions, surprise setup, etc."
                value={reservationForm.specialRequests}
                onChange={(e) => setReservationForm({...reservationForm, specialRequests: e.target.value})}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '⏳ Submitting...' : '📋 Submit Reservation Request'}
            </button>
          </form>

          {/* Info Box */}
          <div style={{marginTop: '2rem', padding: '1.5rem', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '15px'}}>
            <h3 style={{fontSize: '1.2rem', color: '#333', marginBottom: '1rem'}}>ℹ️ Reservation Policy</h3>
            <ul style={{listStyle: 'none', padding: 0, color: '#666'}}>
              <li style={{marginBottom: '0.5rem'}}>✅ Reservations confirmed within 1 hour</li>
              <li style={{marginBottom: '0.5rem'}}>✅ Hold table for 15 minutes past reservation time</li>
              <li style={{marginBottom: '0.5rem'}}>✅ Cancel anytime up to 2 hours before</li>
              <li style={{marginBottom: '0.5rem'}}>✅ Special occasion setups available on request</li>
              <li style={{marginBottom: '0.5rem'}}>✅ Large groups (8+) may require deposit</li>
            </ul>
          </div>

          {/* Navigate to Orders */}
          <div style={{marginTop: '1.5rem', textAlign: 'center'}}>
            <p style={{color: '#666', marginBottom: '1rem'}}>
              Want to order food for pickup or delivery?
            </p>
            <button 
              onClick={() => onNavigate && onNavigate('order')}
              style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              🚚 Go to Pickup & Delivery Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreOrdersReservations;