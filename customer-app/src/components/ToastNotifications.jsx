// customer-app/src/components/ToastNotifications.jsx — COMPLETE FILE
import React, { useEffect, useRef } from 'react';
import { X, Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import '../styles/toast.css';

const TOAST_DURATION = 5000;

const ToastItem = ({ toast, onDismiss }) => {
  const progressRef = useRef(null);
  const timerRef    = useRef(null);

  useEffect(() => {
    // Animate the progress bar
    if (progressRef.current) {
      progressRef.current.style.transition = `width ${TOAST_DURATION}ms linear`;
      // Small rAF delay so the transition actually fires
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (progressRef.current) progressRef.current.style.width = '0%';
        });
      });
    }

    timerRef.current = setTimeout(() => onDismiss(toast.toastId), TOAST_DURATION);
    return () => clearTimeout(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const color  = toast.color  || '#dc2626';
  const emoji  = toast.emoji  || '🔔';
  const title  = toast.label  || toast.title || 'Notification';
  const msg    = toast.message || '';

  return (
    <div
      className="toast-item toast-enter"
      style={{ '--t-color': color }}
      role="alert"
      aria-live="polite"
    >
      {/* Left accent stripe */}
      <div className="toast-stripe" style={{ background: color }} />

      <div className="toast-body">
        {/* Icon */}
        <div className="toast-icon" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
          <span className="toast-emoji">{emoji}</span>
        </div>

        {/* Text */}
        <div className="toast-text">
          <div className="toast-title">{title}</div>
          {toast.orderNumber && (
            <span className="toast-order-badge">Order #{toast.orderNumber}</span>
          )}
          <div className="toast-message">{msg}</div>
        </div>

        {/* Close */}
        <button
          className="toast-close"
          onClick={() => onDismiss(toast.toastId)}
          aria-label="Dismiss notification"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="toast-progress-track">
        <div
          ref={progressRef}
          className="toast-progress-fill"
          style={{ background: color, width: '100%' }}
        />
      </div>
    </div>
  );
};

const ToastNotifications = () => {
  const { toasts, dismissToast } = useNotifications();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-portal" aria-label="Notifications">
      {toasts.map(toast => (
        <ToastItem
          key={toast.toastId}
          toast={toast}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
};

export default ToastNotifications;