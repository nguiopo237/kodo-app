import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Notification from './Notification';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Menu pour administrateur
  const adminMenu = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/gestion-complete', label: 'Gestion Complète', icon: '🏪' },
    { path: '/admin/produits', label: 'Produits', icon: '📦' },
    { path: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👥' },
    { path: '/admin/transport', label: 'Transport', icon: '🚚' },
    { path: '/admin/comptabilite', label: 'Comptabilité', icon: '💰' },
    { path: '/admin/rapports', label: 'Rapports', icon: '📈' },
    { path: '/admin/parametres', label: 'Paramètres', icon: '⚙️' },
  ];

  // Menu pour vendeur
  const vendeurMenu = [
    { path: '/vendeur/vente', label: 'Nouvelle vente', icon: '🛒' },
    { path: '/vendeur/mes-ventes', label: 'Mes ventes', icon: '🧾' },
    { path: '/vendeur/depenses', label: 'Dépenses', icon: '💸' },
    { path: '/vendeur/reception', label: 'Réception', icon: '📥' },
    { path: '/vendeur/comptabilite', label: 'Comptabilité', icon: '📊' },
  ];

  const menuItems = user?.role === 'admin' ? adminMenu : vendeurMenu;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>KodoMarket</h2>
          <div className="user-role-badge">
            {user?.role === 'admin' ? 'Administrateur' : 'Vendeur'}
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.nomComplet?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.nomComplet || user?.username}</div>
              <div className="user-email">
                {user?.role === 'admin' ? 'Administrateur' : 'Vendeur'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <span>🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <Notification />
      <main className="main-content">
        <header className="main-header">
          <h1>Tableau de bord</h1>
          <div className="header-info">
            <span className="current-date">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </header>
        
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;