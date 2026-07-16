import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService';
import { venteService } from '../../services/venteService';
import './DashboardVendeur.css';

const DashboardVendeur = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalVentes: 0,
    totalCA: 0,
    caAujourdhui: 0,
    ventesAujourdhui: 0,
    produitsPopulaires: []
  });
  const [ventesRecent, setVentesRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = () => {
    setLoading(true);
    setTimeout(() => {
      const data = dashboardService.loadData();
      const ventes = data.ventes || [];
      const utilisateurs = data.utilisateurs || [];
      const produits = data.produits || [];

      // Filtrer les ventes du vendeur
      const mesVentes = ventes.filter(v => v.idVendeur === user?.idUser);
      
      // Statistiques
      const totalVentes = mesVentes.length;
      const totalCA = mesVentes.reduce((sum, v) => sum + v.totalVente, 0);
      
      const aujourdhui = new Date().toDateString();
      const ventesAujourdhui = mesVentes.filter(v => 
        new Date(v.date).toDateString() === aujourdhui
      );
      const caAujourdhui = ventesAujourdhui.reduce((sum, v) => sum + v.totalVente, 0);

      // Produits les plus vendus par ce vendeur
      const produitsVendus = {};
      mesVentes.forEach(vente => {
        vente.produitsVendus.forEach(item => {
          if (!produitsVendus[item.idProduit]) {
            produitsVendus[item.idProduit] = {
              idProduit: item.idProduit,
              quantite: 0,
              chiffreAffaires: 0
            };
          }
          produitsVendus[item.idProduit].quantite += item.quantite;
          produitsVendus[item.idProduit].chiffreAffaires += item.prixTotal;
        });
      });

      const produitsPopulaires = Object.values(produitsVendus)
        .sort((a, b) => b.quantite - a.quantite)
        .slice(0, 5)
        .map(item => {
          const produit = produits.find(p => p.idProduit === item.idProduit);
          return {
            ...item,
            nomProduit: produit?.nomProduit || 'Produit inconnu',
            categorie: produit?.categorie || 'Non catégorisé',
            prixBoutique: produit?.prixBoutique || 0
          };
        });

      // Ventes récentes
      const recentes = mesVentes
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
        .map(vente => {
          const vendeur = utilisateurs.find(u => u.idUser === vente.idVendeur);
          const produitPrincipal = vente.produitsVendus[0];
          const produit = produits.find(p => p.idProduit === produitPrincipal?.idProduit);
          return {
            ...vente,
            vendeurNom: vendeur?.nomComplet || 'Vendeur',
            produitNom: produit?.nomProduit || 'Produit',
            quantite: produitPrincipal?.quantite || 0,
            dateFormatee: new Date(vente.date).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
        });

      setStats({
        totalVentes,
        totalCA,
        caAujourdhui,
        ventesAujourdhui: ventesAujourdhui.length,
        produitsPopulaires
      });
      setVentesRecent(recentes);
      setLoading(false);
    }, 500);
  };

  const formatCFA = (montant) => {
    if (!montant && montant !== 0) return '0 FCFA';
    return `${montant.toLocaleString('fr-FR')} FCFA`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement de votre tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-vendeur">
      {/* En-tête */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>👋 Bonjour, {user?.nomComplet || 'Vendeur'} !</h1>
          <p className="header-subtitle">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <div className="header-badges">
            <span className="badge badge-success">
              ✅ Compte actif
            </span>
            <span className="badge badge-info">
              📍 {user?.localisation || 'Cameroun'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <Link to="/vendeur/vente" className="btn btn-primary btn-lg">
            🛒 Nouvelle vente
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Chiffre d'affaires</h3>
            <div className="stat-value">{formatCFA(stats.totalCA)}</div>
            <span className="stat-label">Total des ventes</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Ventes totales</h3>
            <div className="stat-value">{stats.totalVentes}</div>
            <span className="stat-label">Transactions effectuées</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Aujourd'hui</h3>
            <div className="stat-value">{stats.ventesAujourdhui}</div>
            <span className="stat-label">Ventes du jour</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💎</div>
          <div className="stat-content">
            <h3>CA du jour</h3>
            <div className="stat-value">{formatCFA(stats.caAujourdhui)}</div>
            <span className="stat-label">Chiffre d'affaires</span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="dashboard-content">
        {/* Colonne gauche - Ventes récentes */}
        <div className="content-left">
          <div className="card">
            <div className="card-header">
              <h2>🛒 Vos dernières ventes</h2>
              <Link to="/vendeur/mes-ventes" className="view-all">
                Voir tout →
              </Link>
            </div>
            
            <div className="table-responsive">
              {ventesRecent.length > 0 ? (
                <table className="ventes-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Qté</th>
                      <th>Total</th>
                      <th>Date</th>
                      <th>Paiement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventesRecent.map((vente) => (
                      <tr key={vente.idVente}>
                        <td>
                          <div className="produit-cell">
                            <span className="produit-icon">📦</span>
                            <span className="produit-nom">{vente.produitNom}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge-quantite">{vente.quantite}</span>
                        </td>
                        <td className="montant">{formatCFA(vente.totalVente)}</td>
                        <td className="date-cell">{vente.dateFormatee}</td>
                        <td>
                          <span className={`paiement-badge ${vente.typePaiement}`}>
                            {vente.typePaiement || 'Espèces'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🛒</div>
                  <h3>Aucune vente enregistrée</h3>
                  <p>Commencez à vendre en cliquant sur "Nouvelle vente"</p>
                  <Link to="/vendeur/vente" className="btn btn-primary">
                    + Nouvelle vente
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="content-right">
          {/* Actions rapides */}
          <div className="card">
            <div className="card-header">
              <h2>⚡ Actions rapides</h2>
            </div>
            <div className="quick-actions">
              <Link to="/vendeur/vente" className="quick-action">
                <div className="action-icon">🛒</div>
                <div className="action-text">
                  <h4>Nouvelle vente</h4>
                  <p>Créer une nouvelle facture</p>
                </div>
              </Link>
              
              <Link to="/vendeur/mes-ventes" className="quick-action">
                <div className="action-icon">📋</div>
                <div className="action-text">
                  <h4>Mes ventes</h4>
                  <p>Historique complet</p>
                </div>
              </Link>
              
              <Link to="/vendeur/depenses" className="quick-action">
                <div className="action-icon">💸</div>
                <div className="action-text">
                  <h4>Déclarer dépense</h4>
                  <p>Frais de douane, logistique...</p>
                </div>
              </Link>
              
              <Link to="/vendeur/reception" className="quick-action">
                <div className="action-icon">📦</div>
                <div className="action-text">
                  <h4>Confirmer réception</h4>
                  <p>Vérifier les arrivages</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Produits populaires */}
          {stats.produitsPopulaires.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2>🏆 Vos produits les plus vendus</h2>
              </div>
              <div className="popular-products">
                {stats.produitsPopulaires.map((produit, index) => (
                  <div key={produit.idProduit} className="popular-item">
                    <div className="popular-rank">
                      <span className={`rank rank-${index + 1}`}>
                        #{index + 1}
                      </span>
                    </div>
                    <div className="popular-info">
                      <div className="popular-nom">{produit.nomProduit}</div>
                      <div className="popular-details">
                        <span className="popular-categorie">{produit.categorie}</span>
                        <span className="popular-quantite">{produit.quantite} vendus</span>
                      </div>
                    </div>
                    <div className="popular-ca">
                      {formatCFA(produit.chiffreAffaires)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pied de page */}
      <div className="dashboard-footer">
        <div className="footer-info">
          <span>👤 Vendeur : {user?.nomComplet}</span>
          <span>📅 Dernière mise à jour : {new Date().toLocaleTimeString('fr-FR')}</span>
        </div>
        <div className="footer-stats">
          <span>
            Total ventes : <strong>{stats.totalVentes}</strong>
          </span>
          <span>
            CA total : <strong>{formatCFA(stats.totalCA)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardVendeur;