import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import { TypographyProvider } from './services/typographyService';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { HashRouter } from 'react-router-dom';
import { initFromFirestore } from './services/dashboardService';

const FirebaseLoader = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initFromFirestore().then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="loading-screen-spinner"></div>
        <p className="loading-screen-text">Connexion à Firebase...</p>
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
        <ThemeProvider>
          <RoleProvider>
            <TypographyProvider>
              <NotificationProvider>
                <FirebaseLoader>
                  <App />
                </FirebaseLoader>
              </NotificationProvider>
            </TypographyProvider>
          </RoleProvider>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
