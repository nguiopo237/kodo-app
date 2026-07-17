import React, { createContext, useState, useContext, useCallback, useRef } from 'react';

const NotificationContext = createContext();

let globalId = 0;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef({});

  const removeNotification = useCallback((id, animated = true) => {
    // Éviter les doublons de timer (ex: clic manuel + auto-dismiss simultané)
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }

    if (animated) {
      // Marquer comme "removing" pour l'animation de sortie
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, removing: true } : n));
      timersRef.current[id] = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        delete timersRef.current[id];
      }, 300);
    } else {
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    }
  }, []);

  const notify = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++globalId;
    const notification = { id, message, type, duration, removing: false };
    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        removeNotification(id, true);
      }, duration);
    }
    return id;
  }, [removeNotification]);

  const success = useCallback((msg, duration) => notify(msg, 'success', duration), [notify]);
  const error = useCallback((msg, duration) => notify(msg, 'error', duration), [notify]);
  const warning = useCallback((msg, duration) => notify(msg, 'warning', duration), [notify]);
  const info = useCallback((msg, duration) => notify(msg, 'info', duration), [notify]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      notify,
      success,
      error,
      warning,
      info,
      removeNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
