import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleMetadata } from '../../services/roleService';
import Notification from './Notification';
import ThemeToggle from './ThemeToggle';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleMeta = getRoleMetadata(user?.role);

  const adminMenu = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊', perm: 'admin:stats' },
    { path: '/admin/gestion-complete', label: 'Gestion Complète', icon: '🏪', perm: 'produits:lire' },
    { path: '/admin/produits', label: 'Produits', icon: '📦', perm: 'produits:lire' },
    { path: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👥', perm: 'utilisateurs:lire' },
    { path: '/admin/transport', label: 'Transport', icon: '🚚', perm: 'transport:lire' },
    { path: '/admin/comptabilite', label: 'Comptabilité', icon: '💰', perm: 'comptabilite:lire' },
    { path: '/admin/rapports', label: 'Rapports', icon: '📈', perm: 'rapports:lire' },
    { path: '/admin/roles', label: 'Rôles & Permissions', icon: '🔑', perm: 'utilisateurs:changer_role' },
    { path: '/admin/parametres', label: 'Paramètres', icon: '⚙️', perm: 'admin:parametres' },
  ];

  const vendeurMenu = [
    { path: '/vendeur/vente', label: 'Nouvelle vente', icon: '🛒' },
    { path: '/vendeur/mes-ventes', label: 'Mes ventes', icon: '🧾' },
    { path: '/vendeur/depenses', label: 'Dépenses', icon: '💸' },
    { path: '/vendeur/reception', label: 'Réception', icon: '📥' },
    { path: '/vendeur/comptabilite', label: 'Comptabilité', icon: '📊' },
    { path: '/vendeur/profil', label: 'Mon profil', icon: '👤' },
  ];

  const menuItems = user?.role === 'admin' || user?.role === 'super_admin' ? adminMenu : vendeurMenu;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="text-gradient-secondary">KodoMarket</h2>
          <div className="sidebar-role-badge" style={{
            backgroundColor: roleMeta.bgColor,
            color: roleMeta.color,
            border: '1px solid transparent'
          }}>
            {roleMeta.icon} {roleMeta.label}
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
          <div className="theme-toggle-container">
            <ThemeToggle />
          </div>
          
          <div className="user-info">
            <div className="user-avatar">
              {user?.nomComplet?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.prenom ? (user.prenom + ' ' + user.nom) : (user?.nomComplet || user?.username)}</div>
              <div className="user-email">
                <span className="role-badge" style={{
                  backgroundColor: roleMeta.bgColor,
                  color: roleMeta.color,
                  padding: '2px 10px',
                  borderRadius: '100px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}>
                  {roleMeta.icon} {roleMeta.label}
                </span>
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
          <div className="main-header-content">
            <h1 className="typo-h3">
              {roleMeta.icon} {menuItems.find(m => m.path === location.pathname)?.label || 'Tableau de bord'}
            </h1>
            <div className="main-header-meta">
              <span className="current-date typo-body-xs">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </header>
        
        <div className="content-wrapper fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
