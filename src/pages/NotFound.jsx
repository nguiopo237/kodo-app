import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found">
      <div className="not-found-particles">
        <div className="not-found-particle" style={{top:'20%', left:'15%', animationDelay:'0s'}}></div>
        <div className="not-found-particle" style={{top:'40%', right:'20%', animationDelay:'1s'}}></div>
        <div className="not-found-particle" style={{bottom:'30%', left:'25%', animationDelay:'2s'}}></div>
        <div className="not-found-particle" style={{bottom:'50%', right:'30%', animationDelay:'0.5s'}}></div>
      </div>
      <div className="not-found-content">
        <div className="not-found-code">
          <span className="not-found-digit">4</span>
          <span className="not-found-zero">0</span>
          <span className="not-found-digit">4</span>
        </div>
        <div className="not-found-icon">🔍</div>
        <h2>Page non trouvée</h2>
        <p>Désolé, la page que vous recherchez n'existe pas ou a été déplacée.</p>
        <div className="not-found-actions">
          <button onClick={() => navigate(-1)} className="not-found-btn not-found-btn-back">
            ← Retour
          </button>
          <Link to="/" className="not-found-btn not-found-btn-home">
            🏠 Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
