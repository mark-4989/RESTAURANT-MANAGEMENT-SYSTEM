import React, { useEffect, useRef, useState } from 'react';
import { Navigation, Radio } from 'lucide-react';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'https://restaurant-management-system-1-7v0m.onrender.com/api';

const LocationTracker = ({ driverId, currentDelivery, isActive }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  const watchIdRef = useRef(null);

  const updateLocation = async (latitude, longitude) => {
    if (!currentDelivery) return;

    try {
      const response = await fetch(`${API_URL}/drivers/${driverId}/location/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          orderId: currentDelivery._id
        })
      });

      const data = await response.json();

      if (data.success) {
        setLastUpdate(new Date());
        console.log('📍 Location updated:', { latitude, longitude });
      }
    } catch (error) {
      console.error('❌ Location update failed:', error);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    setIsTracking(true);
    toast.success('📍 Location tracking started');

    // Use watchPosition for continuous tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateLocation(latitude, longitude);
      },
      (error) => {
        console.error('Location error:', error);
        toast.error('Failed to get location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Also update every 5 seconds as backup
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateLocation(latitude, longitude);
        },
        (error) => console.error('Backup location error:', error),
        { enableHighAccuracy: true }
      );
    }, 5000);
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
    toast.info('Location tracking stopped');
  };

  useEffect(() => {
    if (isActive && currentDelivery && !isTracking) {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, currentDelivery]);

  if (!currentDelivery) return null;

  return (
    <div style={{
      padding: '1rem',
      background: isTracking ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      border: `2px solid ${isTracking ? '#10b981' : '#ef4444'}`,
      borderRadius: '12px',
      marginBottom: '1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isTracking ? (
            <>
              <Radio size={20} style={{ color: '#10b981', animation: 'pulse 2s infinite' }} />
              <span style={{ fontWeight: 600, color: '#10b981' }}>Live Tracking Active</span>
            </>
          ) : (
            <>
              <Navigation size={20} style={{ color: '#ef4444' }} />
              <span style={{ fontWeight: 600, color: '#ef4444' }}>Tracking Inactive</span>
            </>
          )}
        </div>
        
        {!isTracking && (
          <button
            onClick={startTracking}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Start Tracking
          </button>
        )}
      </div>
      
      {lastUpdate && (
        <div style={{ fontSize: '0.85rem', color: '#666' }}>
          Last update: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default LocationTracker;