// customer-app/src/pages/NotificationsPage.jsx  — COMPLETE FILE
import React, { useState } from 'react';
import { useNotifications, NOTIFICATION_TYPES } from '../context/NotificationContext';
import { Bell, BellOff, CheckCheck, Trash2, Filter, Package, ChefHat, CreditCard, Truck, Clock } from 'lucide-react';
import '../styles/notifications.css';

const TYPE_FILTERS = [
  { key: 'all',      label: 'All',      Icon: Bell        },
  { key: 'order',    label: 'Orders',   Icon: Package     },
  { key: 'chef',     label: 'Chef',     Icon: ChefHat     },
  { key: 'payment',  label: 'Payments', Icon: CreditCard  },
  { key: 'delivery', label: 'Delivery', Icon: Truck       },
];

const ORDER_TYPES    = new Set(['ORDER_PLACED','ORDER_CONFIRMED','PREPARING','READY','CANCELLED']);
const CHEF_TYPES     = new Set(['CHEF_MESSAGE','PREPARING','READY']);
const PAYMENT_TYPES  = new Set(['PAYMENT_SUCCESS','PAYMENT_FAILED']);
const DELIVERY_TYPES = new Set(['ON_THE_WAY','DELIVERED']);

const matchesFilter = (notif, filter) => {
  if (filter === 'all')      return true;
  if (filter === 'order')    return ORDER_TYPES.has(notif.type);
  if (filter === 'chef')     return CHEF_TYPES.has(notif.type);
  if (filter === 'payment')  return PAYMENT_TYPES.has(notif.type);
  if (filter === 'delivery') return DELIVERY_TYPES.has(notif.type);
  return true;
};

const timeAgo = (isoString) => {
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Order progress stages for the inline timeline
const STAGES = ['ORDER_PLACED','ORDER_CONFIRMED','PREPARING','READY','ON_THE_WAY','DELIVERED'];

const StatusTimeline = ({ type }) => {
  const idx = STAGES.indexOf(type);
  if (idx === -1) return null;
  return (
    <div className="notif-timeline">
      {STAGES.map((s, i) => {
        const meta = NOTIFICATION_TYPES[s];
        return (
          <div key={s} className={`timeline-dot ${i <= idx ? 'done' : ''} ${i === idx ? 'current' : ''}`}>
            <span className="timeline-emoji">{meta?.emoji}</span>
            {i < STAGES.length - 1 && <div className={`timeline-line ${i < idx ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
};

const NotificationCard = ({ notif, onRead }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = NOTIFICATION_TYPES[notif.type] || {};

  const handleClick = () => {
    setExpanded(e => !e);
    if (!notif.read) onRead(notif._id);
  };

  return (
    <div
      className={`notif-card ${notif.read ? 'read' : 'unread'} ${expanded ? 'expanded' : ''}`}
      style={{ '--accent': meta.color || notif.color || '#dc2626' }}
      onClick={handleClick}
    >
      {!notif.read && <div className="unread-dot" />}

      <div className="notif-card-inner">
        {/* Icon */}
        <div
          className="notif-icon-wrap"
          style={{
            background: `${meta.color || notif.color || '#dc2626'}22`,
            borderColor: `${meta.color || notif.color || '#dc2626'}44`,
          }}
        >
          <span className="notif-emoji">{meta.emoji || notif.emoji || '🔔'}</span>
        </div>

        {/* Body */}
        <div className="notif-body">
          <div className="notif-top-row">
            <span className="notif-title">{meta.label || notif.title || 'Notification'}</span>
            <span className="notif-time">
              <Clock size={11} />
              {timeAgo(notif.createdAt)}
            </span>
          </div>

          {notif.orderNumber && (
            <span className="notif-order-badge">Order #{notif.orderNumber}</span>
          )}

          <p className="notif-message">{notif.message}</p>

          {expanded && (
            <div className="notif-expanded">
              <StatusTimeline type={notif.type} />
              <div className="notif-meta-row">
                {new Date(notif.createdAt).toLocaleString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ filter }) => (
  <div className="notif-empty">
    <div className="notif-empty-icon"><BellOff size={40} strokeWidth={1.5} /></div>
    <h3>No notifications yet</h3>
    <p>
      {filter === 'all'
        ? "When you place an order, you'll see real-time updates here."
        : `No ${filter} notifications to show.`}
    </p>
  </div>
);

const NotificationsPage = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [activeFilter,    setActiveFilter]    = useState('all');
  const [showUnreadOnly,  setShowUnreadOnly]  = useState(false);

  let filtered = notifications.filter(n => matchesFilter(n, activeFilter));
  if (showUnreadOnly) filtered = filtered.filter(n => !n.read);

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notif-page-header">
        <div className="notif-header-left">
          <div className="notif-header-icon">
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="header-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          <div>
            <h1 className="notif-page-title">Notifications</h1>
            <p className="notif-page-subtitle">
              {loading
                ? 'Loading…'
                : unreadCount > 0
                  ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}`
                  : "You're all caught up"}
            </p>
          </div>
        </div>

        <div className="notif-header-actions">
          {unreadCount > 0 && (
            <button className="notif-action-btn" onClick={markAllAsRead} title="Mark all read">
              <CheckCheck size={16} />
              <span>Mark all read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button className="notif-action-btn danger" onClick={clearAll} title="Clear all">
              <Trash2 size={16} />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="notif-filters">
        <div className="notif-type-filters">
          {TYPE_FILTERS.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`notif-filter-pill ${activeFilter === key ? 'active' : ''}`}
              onClick={() => setActiveFilter(key)}
            >
              <Icon size={14} />
              {label}
              {key === 'all' && unreadCount > 0 && (
                <span className="pill-badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <button
          className={`notif-unread-toggle ${showUnreadOnly ? 'active' : ''}`}
          onClick={() => setShowUnreadOnly(s => !s)}
        >
          <Filter size={14} />
          Unread only
        </button>
      </div>

      {/* List */}
      <div className="notif-list">
        {loading ? (
          <div className="notif-empty">
            <div className="notif-empty-icon"><Bell size={36} strokeWidth={1.5} /></div>
            <h3>Loading notifications…</h3>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          filtered.map(notif => (
            <NotificationCard key={notif._id} notif={notif} onRead={markAsRead} />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;