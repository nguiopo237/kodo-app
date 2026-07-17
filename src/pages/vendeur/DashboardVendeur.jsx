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
    produitsPopulaires: [],
    // Nouvelles statistiques détaillées
    moyenneParVente: 0,
    meilleurJour: { jour: '-', montant: 0 },
    meilleurProduit: { nom: '-', quantite: 0 },
    paiementRepartition: {},
    ventesParMois: []
  });
  const [ventesRecent, setVentesRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

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

      // --- STATISTIQUES DÉTAILLÉES ---

      // Moyenne par vente
      const moyenneParVente = totalVentes > 0 ? Math.round(totalCA / totalVentes) : 0;

      // Meilleur jour de vente
      const ventesParJour = {};
      mesVentes.forEach(v => {
        const jour = new Date(v.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (!ventesParJour[jour]) ventesParJour[jour] = 0;
        ventesParJour[jour] += v.totalVente;
      });
      let meilleurJour = { jour: '-', montant: 0 };
      Object.entries(ventesParJour).forEach(([jour, montant]) => {
        if (montant > meilleurJour.montant) meilleurJour = { jour, montant };
      });

      // Meilleur produit
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

      const meilleurProduit = produitsPopulaires.length > 0 
        ? { nom: produitsPopulaires[0].nomProduit, quantite: produitsPopulaires[0].quantite }
        : { nom: '-', quantite: 0 };

      // Répartition par mode de paiement
      const paiementRepartition = {};
      mesVentes.forEach(v => {
        const type = v.typePaiement || 'espèces';
        if (!paiementRepartition[type]) paiementRepartition[type] = { nombre: 0, montant: 0 };
        paiementRepartition[type].nombre += 1;
        paiementRepartition[type].montant += v.totalVente;
      });

      // Ventes par mois (pour graphique)
      const ventesParMois = {};
      mesVentes.forEach(v => {
        const mois = new Date(v.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        if (!ventesParMois[mois]) ventesParMois[mois] = { mois, nombre: 0, montant: 0 };
        ventesParMois[mois].nombre += 1;
        ventesParMois[mois].montant += v.totalVente;
      });
      const ventesParMoisArray = Object.values(ventesParMois).slice(-6);

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
        produitsPopulaires,
        moyenneParVente,
        meilleurJour,
        meilleurProduit,
        paiementRepartition,
        ventesParMois: ventesParMoisArray
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
          <div className="header-profil-row">
            <div className="header-avatar">
              {(user?.prenom?.charAt(0) || user?.nomComplet?.charAt(0) || 'V').toUpperCase()}
            </div>
            <div>
              <h1>👋 Bonjour, {user?.prenom || user?.nomComplet || 'Vendeur'} !</h1>
              <p className="header-subtitle">
                {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <div className="header-badges">
            <span className="badge badge-success">
              ✅ Compte actif
            </span>
            <span className="badge badge-info" onClick={() => setShowProfile(!showProfile)} style={{cursor: 'pointer'}}>
              📍 {user?.localisation || 'Cameroun'}
            </span>
            <span className="badge badge-info" onClick={() => setShowProfile(!showProfile)} style={{cursor: 'pointer'}}>
              👤 Mon profil
            </span>
          </div>
        </div>
        <div className="header-actions">
          <Link to="/vendeur/vente" className="btn btn-primary btn-lg">
            🛒 Nouvelle vente
          </Link>
        </div>
      </div>

      {/* Carte Profil détaillé */}
      {showProfile && (
        <div className="profil-card">
          <div className="profil-card-header">
            <h2>👤 Mon profil</h2>
            <button className="profil-close" onClick={() => setShowProfile(false)}>✕</button>
          </div>
          <div className="profil-card-body">
            <div className="profil-avatar-large">
              {(user?.prenom?.charAt(0) || user?.nomComplet?.charAt(0) || 'V').toUpperCase()}
              {(user?.nom?.charAt(0) || '').toUpperCase()}
            </div>
            <div className="profil-details">
              <div className="profil-row">
                <span className="profil-label">Nom complet</span>
                <span className="profil-value">{user?.nomComplet || '-'}</span>
              </div>
              <div className="profil-row">
                <span className="profil-label">Prénom</span>
                <span className="profil-value">{user?.prenom || '-'}</span>
              </div>
              <div className="profil-row">
                <span className="profil-label">Nom</span>
                <span className="profil-value">{user?.nom || '-'}</span>
              </div>
              <div className="profil-row">
                <span className="profil-label">Identifiant</span>
                <span className="profil-value">@{user?.username}</span>
              </div>
              <div className="profil-row">
                <span className="profil-label">Rôle</span>
                <span className="profil-value"><span className="role-badge vendeur">🛒 Vendeur</span></span>
              </div>
              <div className="profil-row">
                <span className="profil-label">Email</span>
                <span className="profil-value">{user?.email || 'Non renseigné'}</span>
              </div>
              <div className="profil-row">
                <span className="profil-label">Localisation</span>
                <span className="profil-value">📍 {user?.localisation || 'Non renseigné'}</span>
              </div>
              <div className="profil-row">
                <span className="profil-label">Date création</span>
                <span className="profil-value">{user?.dateCreation || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Statistiques détaillées */}
      <div className="detailed-stats-grid">
        <div className="stat-card-detailed">
          <div className="stat-icon-detailed">📊</div>
          <div className="stat-detailed-content">
            <span className="stat-detailed-label">Moyenne par vente</span>
            <span className="stat-detailed-value">{formatCFA(stats.moyenneParVente)}</span>
          </div>
        </div>
        <div className="stat-card-detailed">
          <div className="stat-icon-detailed">🏆</div>
          <div className="stat-detailed-content">
            <span className="stat-detailed-label">Meilleur jour</span>
            <span className="stat-detailed-value">{formatCFA(stats.meilleurJour.montant)}</span>
            <span className="stat-detailed-sub">{stats.meilleurJour.jour}</span>
          </div>
        </div>
        <div className="stat-card-detailed">
          <div className="stat-icon-detailed">🥇</div>
          <div className="stat-detailed-content">
            <span className="stat-detailed-label">Meilleur produit</span>
            <span className="stat-detailed-value">{stats.meilleurProduit.nom}</span>
            <span className="stat-detailed-sub">{stats.meilleurProduit.quantite} vendus</span>
          </div>
        </div>
        <div className="stat-card-detailed">
          <div className="stat-icon-detailed">💳</div>
          <div className="stat-detailed-content">
            <span className="stat-detailed-label">Paiements</span>
            <div className="paiement-repartition">
              {Object.entries(stats.paiementRepartition).map(([type, data]) => (
                <span key={type} className="paiement-chip">
                  {type === 'espèces' ? '💵' : type === 'carte' ? '💳' : type === 'mobile money' ? '📱' : '📝'} 
                  {data.nombre} ({formatCFA(data.montant)})
                </span>
              ))}
              {Object.keys(stats.paiementRepartition).length === 0 && (
                <span className="stat-detailed-sub">Aucune vente</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Évolution mensuelle */}
      {stats.ventesParMois.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>📈 Évolution mensuelle</h2>
          </div>
          <div className="mois-evolution">
            {stats.ventesParMois.map((mois, i) => {
              const maxMontant = Math.max(...stats.ventesParMois.map(m => m.montant), 1);
              const hauteur = (mois.montant / maxMontant) * 100;
              return (
                <div key={i} className="mois-barre-container">
                  <div className="mois-barre-label">{mois.montant.toLocaleString('fr-FR')}</div>
                  <div className="mois-barre">
                    <div 
                      className="mois-barre-fill" 
                      style={{ height: `${hauteur}%` }}
                    ></div>
                  </div>
                  <div className="mois-barre-mois">{mois.mois}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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