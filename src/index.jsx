import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { HashRouter } from 'react-router-dom';
import { initFromFirestore } from './services/dashboardService'; // Changement ici

const FirebaseLoader = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initFromFirestore().then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        background: '#f5f7fa'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #e5e7eb',
          borderTop: '5px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280', fontFamily: 'Arial, sans-serif' }}>
          Connexion à Firebase...
        </p>
      </div>
    );
  }

  return children;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <NotificationProvider>
          <FirebaseLoader>
            <App />
          </FirebaseLoader>
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);