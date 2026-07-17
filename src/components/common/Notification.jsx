import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import './Notification.css';

const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const Notification = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`notification-toast notification-${notif.type}${notif.removing ? ' removing' : ''}`}
        >
          <span className="notification-icon">{ICONS[notif.type]}</span>
          <span className="notification-message">{notif.message}</span>
          <button
            className="notification-close"
            onClick={() => removeNotification(notif.id)}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default Notification;
