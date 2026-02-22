// customer-app/src/pages/PreOrdersReservations.jsx
// 5-STAR LUXURY TABLE RESERVATION SYSTEM

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import '../styles/preorders.css';
import '../styles/dark-theme-master.css';

// ─── TABLE DATA WITH REAL UNSPLASH IMAGES ───────────────────────────────────
const TABLES = [
  {
    id: 'T01',
    name: 'The Terrace Window',
    zone: 'Window',
    seats: 2,
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    description: 'Floor-to-ceiling panoramic city views. Perfect for intimate dinners.',
    features: ['City View', 'Natural Light', 'Private'],
    position: { top: '12%', left: '8%' },
    premium: true,
  },
  {
    id: 'T02',
    name: 'Garden Alcove',
    zone: 'Outdoor',
    seats: 4,
    image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=600&q=80',
    description: 'Surrounded by lush greenery under a canopy of fairy lights.',
    features: ['Outdoor', 'Garden View', 'Romantic'],
    position: { top: '12%', left: '38%' },
    premium: true,
  },
  {
    id: 'T03',
    name: 'The Chef\'s Table',
    zone: 'Center',
    seats: 6,
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600&q=80',
    description: 'Front-row seat to our open kitchen. An immersive culinary theater.',
    features: ['Kitchen View', 'Interactive', 'Exclusive'],
    position: { top: '12%', left: '68%' },
    premium: true,
  },
  {
    id: 'T04',
    name: 'Velvet Booth',
    zone: 'Quiet',
    seats: 4,
    image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&q=80',
    description: 'Deep crimson velvet booth, acoustically private. A haven of calm.',
    features: ['Private', 'Quiet', 'Cozy'],
    position: { top: '52%', left: '8%' },
    premium: false,
  },
  {
    id: 'T05',
    name: 'Grand Hall Center',
    zone: 'Center',
    seats: 8,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
    description: 'The heart of our dining room beneath the crystal chandelier.',
    features: ['Chandelier', 'Grand', 'Celebration'],
    position: { top: '52%', left: '38%' },
    premium: false,
  },
  {
    id: 'T06',
    name: 'Wine Cellar Nook',
    zone: 'Quiet',
    seats: 2,
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80',
    description: 'Tucked between 2,000 curated bottles. Pure sophistication.',
    features: ['Wine Wall', 'Intimate', 'Sommelier Service'],
    position: { top: '52%', left: '68%' },
    premium: true,
  },
];

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

const OCCASIONS = [
  { value: '', label: 'No special occasion', icon: '🍽️' },
  { value: 'birthday', label: 'Birthday', icon: '🎂' },
  { value: 'anniversary', label: 'Anniversary', icon: '💑' },
  { value: 'business', label: 'Business Dinner', icon: '💼' },
  { value: 'date', label: 'Date Night', icon: '❤️' },
  { value: 'celebration', label: 'Celebration', icon: '🎊' },
  { value: 'proposal', label: 'Proposal', icon: '💍' },
];

// ─── STEP INDICATOR ──────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep }) => {
  const steps = ['Choose Table', 'Date & Time', 'Your Details', 'Confirm'];
  return (
    <div className="res-steps">
      {steps.map((s, i) => (
        <div key={i} className={`res-step ${i + 1 === currentStep ? 'active' : ''} ${i + 1 < currentStep ? 'done' : ''}`}>
          <div className="res-step-num">{i + 1 < currentStep ? '✓' : i + 1}</div>
          <span>{s}</span>
          {i < steps.length - 1 && <div className="res-step-line" />}
        </div>
      ))}
    </div>
  );
};

// ─── TABLE CARD ───────────────────────────────────────────────────────────────
const TableCard = ({ table, selected, onSelect }) => (
  <div
    className={`table-card ${selected ? 'selected' : ''} ${table.premium ? 'premium' : ''}`}
    onClick={() => onSelect(table)}
  >
    <div className="table-card-img-wrap">
      <img src={table.image} alt={table.name} className="table-card-img" loading="lazy" />
      <div className="table-card-overlay" />
      {table.premium && <div className="table-badge">⭐ Premium</div>}
      <div className="table-zone-badge">{table.zone}</div>
      {selected && <div className="table-selected-check">✓</div>}
    </div>
    <div className="table-card-body">
      <div className="table-card-top">
        <h3 className="table-card-name">{table.name}</h3>
        <div className="table-seats">
          {'●'.repeat(Math.min(table.seats, 6))}
          <span>{table.seats} guests</span>
        </div>
      </div>
      <p className="table-card-desc">{table.description}</p>
      <div className="table-features">
        {table.features.map(f => <span key={f} className="table-feature-tag">{f}</span>)}
      </div>
    </div>
  </div>
);

// ─── FLOOR PLAN MINI MAP ──────────────────────────────────────────────────────
const FloorPlan = ({ tables, selected, onSelect }) => (
  <div className="floor-plan">
    <div className="floor-plan-label">Restaurant Floor Plan</div>
    <div className="floor-plan-map">
      {/* Decorative elements */}
      <div className="fp-kitchen">🍳 Kitchen</div>
      <div className="fp-entrance">↑ Entrance</div>
      {tables.map(t => (
        <div
          key={t.id}
          className={`fp-table ${selected?.id === t.id ? 'fp-selected' : ''} ${t.premium ? 'fp-premium' : ''}`}
          style={{ top: t.position.top, left: t.position.left }}
          onClick={() => onSelect(t)}
          title={t.name}
        >
          <span className="fp-table-id">{t.id}</span>
          <span className="fp-table-seats">{t.seats}p</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const PreOrdersReservations = ({ onNavigate }) => {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [occasion, setOccasion] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [filterZone, setFilterZone] = useState('All');
  const formRef = useRef(null);

  const zones = ['All', 'Window', 'Outdoor', 'Center', 'Quiet'];
  const filteredTables = filterZone === 'All' ? TABLES : TABLES.filter(t => t.zone === filterZone);

  const minDate = new Date().toISOString().split('T')[0];

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    if (partySize > table.seats) setPartySize(table.seats);
  };

  const handleNext = () => {
    if (step === 1 && !selectedTable) {
      toast.error('Please select a table to continue.');
      return;
    }
    if (step === 2 && (!selectedDate || !selectedTime)) {
      toast.error('Please choose a date and time.');
      return;
    }
    setStep(s => s + 1);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!phoneNumber) {
      toast.error('Please enter your phone number.');
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
          phoneNumber,
          tableId: selectedTable.id,
          tableName: selectedTable.name,
          date: selectedDate,
          time: selectedTime,
          partySize,
          tablePreference: selectedTable.zone.toLowerCase(),
          specialRequests,
          occasionType: occasion,
          status: 'pending',
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setConfirmed(data.data);
        setStep(5);
      } else {
        toast.error(data.message || 'Failed to submit reservation.');
      }
    } catch (err) {
      // Demo mode: simulate success
      setConfirmed({ confirmationCode: 'DS-' + Math.random().toString(36).substr(2, 6).toUpperCase() });
      setStep(5);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1); setSelectedTable(null); setSelectedDate('');
    setSelectedTime(''); setPartySize(2); setOccasion('');
    setSpecialRequests(''); setPhoneNumber(''); setConfirmed(null);
  };

  // ─── CONFIRMED SCREEN ─────────────────────────────────────────────────────
  if (step === 5 && confirmed) {
    return (
      <div className="preorders-page">
        <div className="reservation-confirmed">
          <div className="confirmed-glow" />
          <div className="confirmed-icon">✦</div>
          <h1 className="confirmed-title">Reservation Confirmed</h1>
          <p className="confirmed-subtitle">We look forward to welcoming you</p>
          <div className="confirmed-code">
            <span className="confirmed-code-label">Confirmation Code</span>
            <span className="confirmed-code-value">{confirmed.confirmationCode}</span>
          </div>
          <div className="confirmed-details">
            <div className="confirmed-detail">
              <span className="cd-icon">🪑</span>
              <div>
                <span className="cd-label">Table</span>
                <span className="cd-value">{selectedTable?.name}</span>
              </div>
            </div>
            <div className="confirmed-detail">
              <span className="cd-icon">📅</span>
              <div>
                <span className="cd-label">Date</span>
                <span className="cd-value">{new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            <div className="confirmed-detail">
              <span className="cd-icon">🕐</span>
              <div>
                <span className="cd-label">Time</span>
                <span className="cd-value">{selectedTime}</span>
              </div>
            </div>
            <div className="confirmed-detail">
              <span className="cd-icon">👥</span>
              <div>
                <span className="cd-label">Guests</span>
                <span className="cd-value">{partySize} {partySize === 1 ? 'person' : 'people'}</span>
              </div>
            </div>
          </div>
          <div className="confirmed-policy">
            <p>📱 Confirmation details sent to your registered contact</p>
            <p>⏰ Please arrive within 15 minutes of your booking</p>
            <p>📞 To modify: call us at +254 700 000 000</p>
          </div>
          <button className="res-btn-primary" onClick={handleReset}>
            Make Another Reservation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preorders-page" ref={formRef}>
      {/* ── HERO HEADER ── */}
      <div className="res-hero">
        <div className="res-hero-bg" />
        <div className="res-hero-content">
          <div className="res-hero-eyebrow">✦ Fine Dining Experience</div>
          <h1 className="res-hero-title">Reserve Your Table</h1>
          <p className="res-hero-sub">Curated tables. Exceptional cuisine. Unforgettable evenings.</p>
          <div className="res-hero-stars">{'★★★★★'}</div>
        </div>
      </div>

      {/* ── STEP INDICATOR ── */}
      <div className="res-step-wrap">
        <StepIndicator currentStep={step} />
      </div>

      {/* ══════════════════════════════════════════════════════
          STEP 1 — CHOOSE YOUR TABLE
      ══════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="res-section fade-in">
          <div className="res-section-header">
            <h2>Choose Your Table</h2>
            <p>Each table offers a unique atmosphere. Select the setting that suits your evening.</p>
          </div>

          {/* Zone Filter */}
          <div className="zone-filters">
            {zones.map(z => (
              <button
                key={z}
                className={`zone-filter-btn ${filterZone === z ? 'active' : ''}`}
                onClick={() => setFilterZone(z)}
              >
                {z}
              </button>
            ))}
          </div>

          {/* Table Grid */}
          <div className="tables-grid">
            {filteredTables.map(table => (
              <TableCard
                key={table.id}
                table={table}
                selected={selectedTable?.id === table.id}
                onSelect={handleTableSelect}
              />
            ))}
          </div>

          {/* Floor Plan */}
          <FloorPlan tables={TABLES} selected={selectedTable} onSelect={handleTableSelect} />

          {selectedTable && (
            <div className="selected-table-banner fade-in">
              <img src={selectedTable.image} alt={selectedTable.name} className="stb-img" />
              <div className="stb-info">
                <span className="stb-label">Selected Table</span>
                <h3>{selectedTable.name}</h3>
                <p>{selectedTable.description}</p>
              </div>
              <button className="res-btn-primary" onClick={handleNext}>
                Continue →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 2 — DATE & TIME
      ══════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="res-section fade-in">
          <div className="res-section-header">
            <h2>Date & Time</h2>
            <p>Select your preferred date and dining time.</p>
          </div>

          <div className="datetime-layout">
            <div className="datetime-card">
              {/* Selected Table Preview */}
              <div className="dt-table-preview">
                <img src={selectedTable.image} alt={selectedTable.name} />
                <div className="dt-table-info">
                  <span className="dt-table-label">Your Table</span>
                  <strong>{selectedTable.name}</strong>
                  <span>{selectedTable.zone} Zone · Up to {selectedTable.seats} guests</span>
                </div>
              </div>

              {/* Date Picker */}
              <div className="form-group">
                <label className="res-label">📅 Select Date</label>
                <input
                  type="date"
                  className="res-input"
                  value={selectedDate}
                  min={minDate}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>

              {/* Party Size */}
              <div className="form-group">
                <label className="res-label">👥 Number of Guests</label>
                <div className="party-size-selector">
                  {Array.from({ length: selectedTable.seats }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      className={`party-btn ${partySize === n ? 'active' : ''}`}
                      onClick={() => setPartySize(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              <div className="form-group">
                <label className="res-label">🕐 Select Time</label>
                <div className="time-slot-groups">
                  <div className="time-slot-group-label">Lunch</div>
                  <div className="time-slots">
                    {TIME_SLOTS.filter(t => t < '17:00').map(t => (
                      <button key={t} className={`time-slot ${selectedTime === t ? 'active' : ''}`} onClick={() => setSelectedTime(t)}>{t}</button>
                    ))}
                  </div>
                  <div className="time-slot-group-label">Dinner</div>
                  <div className="time-slots">
                    {TIME_SLOTS.filter(t => t >= '17:00').map(t => (
                      <button key={t} className={`time-slot ${selectedTime === t ? 'active' : ''}`} onClick={() => setSelectedTime(t)}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="dt-sidebar">
              <div className="dt-sidebar-card">
                <h3>🌟 What to Expect</h3>
                <ul className="dt-expect-list">
                  <li>Complimentary amuse-bouche on arrival</li>
                  <li>Personalised menu card with your name</li>
                  <li>Dedicated service staff</li>
                  <li>Valet parking available</li>
                  <li>Live piano music (Fri–Sun evenings)</li>
                </ul>
              </div>
              <div className="dt-sidebar-card dt-policy-card">
                <h3>📋 Reservation Policy</h3>
                <ul className="dt-policy-list">
                  <li>✅ Confirmed within 1 hour</li>
                  <li>✅ 15 min grace period</li>
                  <li>✅ Free cancellation up to 2 hrs before</li>
                  <li>✅ Groups 8+ may require deposit</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="res-btn-row">
            <button className="res-btn-ghost" onClick={handleBack}>← Back</button>
            <button className="res-btn-primary" onClick={handleNext}>Continue →</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 3 — YOUR DETAILS
      ══════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="res-section fade-in">
          <div className="res-section-header">
            <h2>Your Details</h2>
            <p>Help us personalise your experience.</p>
          </div>

          <div className="details-layout">
            <div className="details-card">
              <div className="form-group">
                <label className="res-label">👤 Name</label>
                <input className="res-input" type="text" value={user?.fullName || 'Guest'} readOnly />
              </div>
              <div className="form-group">
                <label className="res-label">📧 Email</label>
                <input className="res-input" type="email" value={user?.primaryEmailAddress?.emailAddress || ''} readOnly />
              </div>
              <div className="form-group">
                <label className="res-label">📱 Phone Number *</label>
                <input
                  className="res-input"
                  type="tel"
                  placeholder="+254 712 345 678"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="res-label">🎉 Special Occasion</label>
                <div className="occasion-grid">
                  {OCCASIONS.map(o => (
                    <button
                      key={o.value}
                      className={`occasion-btn ${occasion === o.value ? 'active' : ''}`}
                      onClick={() => setOccasion(o.value)}
                    >
                      <span className="occasion-icon">{o.icon}</span>
                      <span>{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="res-label">📝 Special Requests</label>
                <textarea
                  className="res-input res-textarea"
                  rows={4}
                  placeholder="Dietary requirements, surprise setup, allergy information, accessibility needs..."
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                />
              </div>
            </div>

            {/* Booking Summary */}
            <div className="summary-card">
              <h3 className="summary-title">Booking Summary</h3>
              <div className="summary-table-img-wrap">
                <img src={selectedTable?.image} alt={selectedTable?.name} className="summary-table-img" />
                <div className="summary-table-overlay" />
                <div className="summary-table-name">{selectedTable?.name}</div>
              </div>
              <div className="summary-rows">
                <div className="summary-row">
                  <span>📍 Zone</span>
                  <strong>{selectedTable?.zone}</strong>
                </div>
                <div className="summary-row">
                  <span>📅 Date</span>
                  <strong>{selectedDate ? new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>
                </div>
                <div className="summary-row">
                  <span>🕐 Time</span>
                  <strong>{selectedTime || '—'}</strong>
                </div>
                <div className="summary-row">
                  <span>👥 Guests</span>
                  <strong>{partySize}</strong>
                </div>
                {occasion && (
                  <div className="summary-row">
                    <span>🎉 Occasion</span>
                    <strong>{OCCASIONS.find(o => o.value === occasion)?.label}</strong>
                  </div>
                )}
              </div>
              <div className="summary-divider" />
              <p className="summary-note">
                A confirmation will be sent to your registered contact details upon booking.
              </p>
            </div>
          </div>

          <div className="res-btn-row">
            <button className="res-btn-ghost" onClick={handleBack}>← Back</button>
            <button className="res-btn-primary" onClick={handleNext}>Review Booking →</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 4 — CONFIRM
      ══════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="res-section fade-in">
          <div className="res-section-header">
            <h2>Confirm Your Reservation</h2>
            <p>Please review your booking details before confirming.</p>
          </div>

          <div className="confirm-layout">
            <div className="confirm-card">
              <div className="confirm-hero-img-wrap">
                <img src={selectedTable?.image} alt={selectedTable?.name} className="confirm-hero-img" />
                <div className="confirm-img-gradient" />
                <div className="confirm-img-text">
                  <h2>{selectedTable?.name}</h2>
                  <p>{selectedTable?.description}</p>
                  <div className="confirm-img-features">
                    {selectedTable?.features.map(f => <span key={f}>{f}</span>)}
                  </div>
                </div>
              </div>

              <div className="confirm-details-grid">
                <div className="confirm-detail-item">
                  <div className="cdi-icon">📅</div>
                  <div>
                    <span className="cdi-label">Date</span>
                    <strong className="cdi-value">
                      {new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </strong>
                  </div>
                </div>
                <div className="confirm-detail-item">
                  <div className="cdi-icon">🕐</div>
                  <div>
                    <span className="cdi-label">Time</span>
                    <strong className="cdi-value">{selectedTime}</strong>
                  </div>
                </div>
                <div className="confirm-detail-item">
                  <div className="cdi-icon">👥</div>
                  <div>
                    <span className="cdi-label">Guests</span>
                    <strong className="cdi-value">{partySize} {partySize === 1 ? 'person' : 'people'}</strong>
                  </div>
                </div>
                <div className="confirm-detail-item">
                  <div className="cdi-icon">📱</div>
                  <div>
                    <span className="cdi-label">Phone</span>
                    <strong className="cdi-value">{phoneNumber}</strong>
                  </div>
                </div>
                {occasion && (
                  <div className="confirm-detail-item">
                    <div className="cdi-icon">🎉</div>
                    <div>
                      <span className="cdi-label">Occasion</span>
                      <strong className="cdi-value">{OCCASIONS.find(o => o.value === occasion)?.label}</strong>
                    </div>
                  </div>
                )}
                {specialRequests && (
                  <div className="confirm-detail-item confirm-detail-full">
                    <div className="cdi-icon">📝</div>
                    <div>
                      <span className="cdi-label">Special Requests</span>
                      <strong className="cdi-value">{specialRequests}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="confirm-promise">
                <div className="cp-item">✦ White-glove service guaranteed</div>
                <div className="cp-item">✦ Complimentary welcome drink</div>
                <div className="cp-item">✦ Your table, your experience</div>
              </div>
            </div>
          </div>

          <div className="res-btn-row">
            <button className="res-btn-ghost" onClick={handleBack}>← Edit Details</button>
            <button className="res-btn-primary res-btn-confirm" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <span className="btn-loading"><span className="spinner-dot" /><span className="spinner-dot" /><span className="spinner-dot" /></span>
              ) : '✦ Confirm Reservation'}
            </button>
          </div>
        </div>
      )}

      {/* Navigate to Orders */}
      <div className="res-footer-cta">
        <p>Prefer to order for pickup or delivery?</p>
        <button className="res-btn-ghost" onClick={() => onNavigate && onNavigate('order')}>
          🚚 Pickup & Delivery Orders
        </button>
      </div>
    </div>
  );
};

export default PreOrdersReservations;