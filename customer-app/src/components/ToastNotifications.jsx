// customer-app/src/components/ToastNotifications.jsx  — COMPLETE FILE
import React from 'react';
import { X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import '../styles/toast.css';

const ToastItem = ({ toast, onDismiss }) => (
  <div
    className="toast-item"
    style={{ '--t-color': toast.color || '#dc2626' }}
  >
    <div className="toast-accent-bar" />

    <div className="toast-body">
      <div className="toast-icon-wrap">
        <span className="toast-emoji">{toast.emoji || '🔔'}</span>
      </div>

      <div className="toast-content">
        <div className="toast-title">{toast.label || toast.title || 'Notification'}</div>
        {toast.orderNumber && (
          <span className="toast-order">Order #{toast.orderNumber}</span>
        )}
        <div className="toast-message">{toast.message}</div>
      </div>

      <button className="toast-close" onClick={() => onDismiss(toast.toastId)}>
        <X size={14} />
      </button>
    </div>

    {/* 5-second progress bar */}
    <div className="toast-progress">
      <div className="toast-progress-bar" />
    </div>
  </div>
);

const ToastNotifications = () => {
  const { toasts, dismissToast } = useNotifications();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => (
        <ToastItem key={toast.toastId} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};

export default ToastNotifications;