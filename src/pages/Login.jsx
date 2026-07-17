import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { error: showError, success } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      success('✅ Connexion réussie ! Bienvenue sur KodoMarket.');
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      showError('❌ ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Particules décoratives */}
      <div className="login-particles">
        <div className="particle" style={{top:'15%', left:'10%', width:'8px', height:'8px', animationDelay:'0s', background:'rgba(255,255,255,0.3)'}}></div>
        <div className="particle" style={{top:'25%', right:'15%', width:'12px', height:'12px', animationDelay:'1s', background:'rgba(255,255,255,0.2)'}}></div>
        <div className="particle" style={{bottom:'30%', left:'20%', width:'6px', height:'6px', animationDelay:'2s', background:'rgba(255,255,255,0.25)'}}></div>
        <div className="particle" style={{bottom:'40%', right:'25%', width:'10px', height:'10px', animationDelay:'0.5s', background:'rgba(255,255,255,0.2)'}}></div>
        <div className="particle" style={{top:'60%', left:'5%', width:'14px', height:'14px', animationDelay:'1.5s', background:'rgba(255,255,255,0.15)'}}></div>
        <div className="particle" style={{top:'10%', right:'35%', width:'5px', height:'5px', animationDelay:'3s', background:'rgba(255,255,255,0.35)'}}></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">KM</div>
          <h1>KodoMarket</h1>
          <p className="subtitle">Gestion de supermarché premium</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          
          <div className="form-group">
            <label htmlFor="username">
              <span>👤</span> Nom d'utilisateur
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin ou vendeur1"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <span>🔒</span> Mot de passe
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Connexion en cours...
              </>
            ) : (
              'Se connecter →'
            )}
          </button>
        </form>

        <div className="login-info">
          <p className="demo-info">
            <strong>🔑 Accès démo</strong><br/>
            • <code>admin</code> — Administrateur<br/>
            • <code>vendeur1</code> — Vendeur<br/>
            • Mot de passe : <code>admin123</code>
          </p>
        </div>

        <div className="login-footer">
          <p>© {new Date().getFullYear()} KodoMarket — Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
};

export default Login;