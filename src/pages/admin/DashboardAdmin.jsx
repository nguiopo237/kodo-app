import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService, statsService } from '../../services/dataService';
import { formatCFA } from '../../utils/formatters';
import StatCard from '../../components/common/StatCard';
import './DashboardAdmin.css';

const DashboardAdmin = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [ventesRecent, setVentesRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSummary, setResetSummary] = useState(null);

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = () => {
    setLoading(true);
    
    const statsData = statsService.get();
    setStats(statsData);
    
    const toutesVentes = dataService.getTable('ventes') || [];
    const ventesTriees = [...toutesVentes].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    ).slice(0, 5);
    
    const produits = dataService.getTable('produits') || [];
    const utilisateurs = dataService.getTable('utilisateurs') || [];
    
    const ventesEnrichies = ventesTriees.map(vente => {
      const vendeur = utilisateurs.find(u => u.idUser === vente.idVendeur);
      const premierProduit = vente.produitsVendus?.[0];
      const produit = produits.find(p => p.idProduit === premierProduit?.idProduit);
      
      return {
        ...vente,
        vendeurNom: vendeur?.nomComplet || 'Vendeur',
        produitNom: produit?.nomProduit || 'Produit',
        prix: produit?.prix || '0',
        quantite: premierProduit?.quantite || 0,
        dateFormatee: new Date(vente.date).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    });
    
    setVentesRecent(ventesEnrichies);
    setLoading(false);
  };

  const handleOpenResetModal = () => {
    const summary = dataService.getResetSummary();
    setResetSummary(summary);
    setShowResetModal(true);
  };

  const handleConfirmReset = async () => {
    setShowResetModal(false);
    await dataService.reinitialiser();
    chargerDonnees();
  };

  const handleCancelReset = () => {
    setShowResetModal(false);
    setResetSummary(null);
  };

  const totalResetItems = resetSummary
    ? resetSummary.produits + resetSummary.ventes + resetSummary.transport + resetSummary.depenses
    : 0;

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="dashboard-admin">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Bonjour, {user?.nomComplet || 'Administrateur'} 👋</h1>
          <p className="date">{new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-reset-dashboard" onClick={handleOpenResetModal}>
            🔄 Remettre les stats à zéro
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Chiffre d'affaires"
          value={formatCFA(stats.totalCA)}
          icon="💰"
          color="green"
        />
        <StatCard
          title="Ventes"
          value={stats.totalVentes}
          icon="📈"
          color="blue"
        />
        <StatCard
          title="Bénéfices"
          value={formatCFA(stats.benefices)}
          icon="💎"
          color="purple"
        />
        <StatCard
          title="Stock faible"
          value={stats.stockFaible}
          icon="⚠️"
          color="orange"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>🛒 Ventes récentes</h2>
          {ventesRecent.length > 0 && (
            <span className="badge-count">{ventesRecent.length}</span>
          )}
        </div>
        <div className="table-responsive">
          {ventesRecent.length > 0 ? (
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Prix</th>
                  <th>Qté</th>
                  <th>Total</th>
                  <th>Paiement</th>
                  <th>Date</th>
                  <th>Vendeur</th>
                </tr>
              </thead>
              <tbody>
                {ventesRecent.map((vente) => (
                  <tr key={vente.idVente}>
                    <td>
                      <div className="product-info">
                        <span>📦</span>
                        <span className="product-name">{vente.produitNom}</span>
                      </div>
                    </td>
                    <td>
                      <div className="product-info">
                        <span className="product-name">{vente.prix}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge">{vente.quantite}</span>
                    </td>
                    <td className="amount">{formatCFA(vente.totalVente)}</td>
                    <td>
                      <span className="payment-method">
                        {vente.typePaiement || 'Espèces'}
                      </span>
                    </td>
                    <td className="date">{vente.dateFormatee}</td>
                    <td>
                      <span className="vendeur-badge">{vente.vendeurNom}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-alerts">
              <p>Aucune vente enregistrée</p>
              <small>Les ventes récentes apparaîtront ici</small>
            </div>
          )}
        </div>
      </div>
      {/* Modal de confirmation de réinitialisation */}
      {showResetModal && resetSummary && (
        <div className="modal-overlay" onClick={handleCancelReset}>
          <div className="modal modal-reset" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirmer la réinitialisation</h2>
              <button className="modal-close" onClick={handleCancelReset}>×</button>
            </div>

            <div className="modal-body">
              <p className="reset-warning">
                Cette action va <strong>supprimer définitivement</strong> toutes les données
                métier. Les utilisateurs et catégories seront conservés.
              </p>

              <div className="reset-summary">
                {resetSummary.produits > 0 && (
                  <div className="summary-row">
                    <span className="summary-icon">📦</span>
                    <span className="summary-label">Produits</span>
                    <span className="summary-count">{resetSummary.produits}</span>
                  </div>
                )}
                {resetSummary.ventes > 0 && (
                  <div className="summary-row">
                    <span className="summary-icon">🧾</span>
                    <span className="summary-label">Ventes</span>
                    <span className="summary-count">{resetSummary.ventes}</span>
                  </div>
                )}
                {resetSummary.transport > 0 && (
                  <div className="summary-row">
                    <span className="summary-icon">🚚</span>
                    <span className="summary-label">Envois transport</span>
                    <span className="summary-count">{resetSummary.transport}</span>
                  </div>
                )}
                {resetSummary.depenses > 0 && (
                  <div className="summary-row">
                    <span className="summary-icon">💸</span>
                    <span className="summary-label">Dépenses</span>
                    <span className="summary-count">{resetSummary.depenses}</span>
                  </div>
                )}

                {totalResetItems === 0 && (
                  <div className="summary-empty">
                    <p>Aucune donnée métier à supprimer.</p>
                  </div>
                )}
              </div>

              {resetSummary.totalCA > 0 && (
                <div className="reset-totals">
                  <div className="totals-row">
                    <span>Chiffre d'affaires total :</span>
                    <strong>{formatCFA(resetSummary.totalCA)}</strong>
                  </div>
                  <div className="totals-row">
                    <span>Total dépenses :</span>
                    <strong>{formatCFA(resetSummary.totalDepenses)}</strong>
                  </div>
                </div>
              )}

              <p className="reset-note">
                <strong>⚠️ Action irréversible.</strong> Les statistiques et le
                tableau de bord seront remis à zéro.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCancelReset}>
                Annuler
              </button>
              <button className="btn btn-danger" onClick={handleConfirmReset}>
                🗑️ Remettre à zéro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;