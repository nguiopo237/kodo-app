import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { venteService } from '../../services/venteService';
import { useVentes, useInvalidateQueries, queryKeys } from '../../hooks/useDataQueries';
import FactureVente from '../../components/FactureVente';
import './MesVentes.css';

const MesVentes = () => {
  const { user, hasPermission } = useAuth();
  const { success, error: showError, warning } = useNotification();

  const peutVoirVentes = hasPermission('ventes:lire');

  useEffect(() => {
    if (!peutVoirVentes) {
      warning('⛔ Vous n\'avez pas la permission de consulter les ventes.');
    }
  }, [peutVoirVentes, warning]);

  const { data: allVentes = [], isLoading } = useVentes();
  const invalidate = useInvalidateQueries();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterPeriode, setFilterPeriode] = useState('tout');
  const [selectedVente, setSelectedVente] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFacture, setShowFacture] = useState(false);
  const [selectedFactureVente, setSelectedFactureVente] = useState(null);

  const ventes = (allVentes || []).filter(v => v.idVendeur === user?.idUser);
  const stats = useMemo(() => ({
    totalVentes: ventes.length,
    totalCA: ventes.reduce((sum, v) => sum + v.totalVente, 0),
    totalProduits: ventes.reduce((sum, v) => sum + (v.produitsVendus || []).length, 0),
    moyenneVente: ventes.length > 0 ? ventes.reduce((sum, v) => sum + v.totalVente, 0) / ventes.length : 0,
  }), [ventes]);

  if (!peutVoirVentes) {
    return (
      <div className="mes-ventes">
        <div className="page-header">
          <div className="header-content">
            <h1>📋 Mes ventes</h1>
            <p className="header-subtitle">Historique complet de toutes vos transactions</p>
          </div>
        </div>
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon" style={{ fontSize: '4rem' }}>🚫</div>
          <h3>Permission refusee</h3>
          <p style={{ color: '#6b7280', maxWidth: 400, margin: '0 auto' }}>
            Vous n&rsquo;avez pas la permission de consulter les ventes.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acces necessaire.
          </p>
        </div>
      </div>
    );
  }

  const formatCFA = (montant) => {
    if (!montant && montant !== 0) return '0 FCFA';
    return `${montant.toLocaleString('fr-FR')} FCFA`;
  };

  // Filtrer les ventes
  const ventesFiltrees = ventes.filter(vente => {
    // Recherche par produit ou vendeur
    const matchSearch = searchTerm === '' || 
      vente.produitsDetails.some(p => 
        p.nomProduit.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      vente.vendeurNom.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrer par statut
    const matchStatut = filterStatut === 'tous' || vente.statut === filterStatut;
    
    // Filtrer par période
    let matchPeriode = true;
    const now = new Date();
    const dateVente = new Date(vente.date);
    
    if (filterPeriode === 'aujourdhui') {
      matchPeriode = dateVente.toDateString() === now.toDateString();
    } else if (filterPeriode === 'semaine') {
      const semaine = new Date(now);
      semaine.setDate(now.getDate() - 7);
      matchPeriode = dateVente >= semaine;
    } else if (filterPeriode === 'mois') {
      matchPeriode = dateVente.getMonth() === now.getMonth() && 
                     dateVente.getFullYear() === now.getFullYear();
    } else if (filterPeriode === 'trimestre') {
      const trimestre = new Date(now);
      trimestre.setMonth(now.getMonth() - 3);
      matchPeriode = dateVente >= trimestre;
    }
    
    return matchSearch && matchStatut && matchPeriode;
  });

  // Préparer les données d'une vente pour le composant FactureVente
  const prepareVenteFacture = (vente) => {
    // Utiliser produitsDetails s'il existe (enrichi avec nomProduit), sinon produitsVendus
    const produits = vente.produitsDetails || vente.produitsVendus || [];
    
    return {
      ...vente,
      produitsVendus: produits.map(p => ({
        idProduit: p.idProduit,
        nomProduit: p.nomProduit || p.nom || 'Produit',
        quantite: p.quantite,
        prixUnitaire: p.prixUnitaire,
        prixTotal: p.prixTotal || (p.prixUnitaire * p.quantite)
      })),
      typePaiement: vente.typePaiement,
      totalVente: vente.totalVente,
      vendeurNom: vente.vendeurNom || 'Vendeur'
    };
  };

  const handleVoirDetails = (vente) => {
    setSelectedVente(vente);
    setShowDetailModal(true);
  };

  const handleVoirFacture = (vente) => {
    setSelectedFactureVente(prepareVenteFacture(vente));
    setShowFacture(true);
  };

  const handleFermerFacture = () => {
    setShowFacture(false);
    setSelectedFactureVente(null);
  };

  const exportCSV = () => {
    if (ventesFiltrees.length === 0) {
      showError('❌ Aucune donnée à exporter');
      return;
    }
    success('📥 Fichier CSV téléchargé avec succès !');

    const headers = ['ID', 'Date', 'Vendeur', 'Produits', 'Total', 'Paiement', 'Statut'];
    const rows = ventesFiltrees.map(v => [
      v.idVente,
      v.dateFormatee,
      v.vendeurNom,
      v.produitsDetails.map(p => `${p.nomProduit}(${p.quantite})`).join('; '),
      v.totalVente,
      v.typePaiement,
      v.statut
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mes_ventes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement de vos ventes...</p>
      </div>
    );
  }

  return (
    <div className="mes-ventes">
      {/* En-tête */}
      <div className="page-header">
        <div className="header-content">
          <h1>📋 Mes ventes</h1>
          <p className="header-subtitle">
            Historique complet de toutes vos transactions
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportCSV}>
            📥 Exporter CSV
          </button>
          <button className="btn btn-primary" onClick={() => invalidate(queryKeys.ventes)}>
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total ventes</h3>
            <div className="stat-value">{stats.totalVentes}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Chiffre d'affaires</h3>
            <div className="stat-value">{formatCFA(stats.totalCA)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Produits vendus</h3>
            <div className="stat-value">{stats.totalProduits}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Panier moyen</h3>
            <div className="stat-value">{formatCFA(stats.moyenneVente)}</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>🔍 Rechercher</label>
            <input
              type="text"
              placeholder="Produit ou vendeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>📌 Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="filter-select"
            >
              <option value="tous">Tous les statuts</option>
              <option value="completée">✅ Completée</option>
              <option value="annulée">❌ Annulée</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>📅 Période</label>
            <select
              value={filterPeriode}
              onChange={(e) => setFilterPeriode(e.target.value)}
              className="filter-select"
            >
              <option value="tout">Toutes</option>
              <option value="aujourdhui">Aujourd'hui</option>
              <option value="semaine">7 derniers jours</option>
              <option value="mois">Ce mois</option>
              <option value="trimestre">3 derniers mois</option>
            </select>
          </div>
          
          <div className="filter-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setFilterStatut('tous');
                setFilterPeriode('tout');
              }}
            >
              Réinitialiser
            </button>
          </div>
        </div>
        
        <div className="filter-info">
          <span>
            {ventesFiltrees.length} vente(s) sur {ventes.length} au total
          </span>
        </div>
      </div>

      {/* Tableau des ventes */}
      <div className="table-container">
        {ventesFiltrees.length > 0 ? (
          <table className="ventes-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Produits</th>
                <th>Quantité</th>
                <th>Total</th>
                <th>Paiement</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ventesFiltrees.map((vente, index) => (
                <tr key={vente.idVente} className={vente.statut === 'annulée' ? 'row-annulee' : ''}>
                  <td className="vente-id">#{vente.idVente}</td>
                  <td className="vente-date">{vente.dateFormatee}</td>
                  <td className="vente-produits">
                    <div className="produits-list">
                      {vente.produitsDetails.slice(0, 3).map((p, i) => (
                        <span key={i} className="produit-tag">
                          {p.nomProduit}
                          {i < vente.produitsDetails.length - 1 && ', '}
                        </span>
                      ))}
                      {vente.produitsDetails.length > 3 && (
                        <span className="produit-more">
                          +{vente.produitsDetails.length - 3} autres
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="vente-quantite">
                    {vente.produitsDetails.reduce((sum, p) => sum + p.quantite, 0)}
                  </td>
                  <td className="vente-total">{formatCFA(vente.totalVente)}</td>
                  <td>
                    <span className={`paiement-badge ${vente.typePaiement}`}>
                      {vente.typePaiement}
                    </span>
                  </td>
                  <td>
                    <span className={`statut-badge ${vente.statut}`}>
                      {vente.statut === 'completée' ? '✅ Completée' : '❌ Annulée'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="actions-group">
                      <button 
                        className="btn-action btn-details"
                        onClick={() => handleVoirDetails(vente)}
                        title="Voir les détails"
                      >
                        👁️
                      </button>
                      <button 
                        className="btn-action btn-facture"
                        onClick={() => handleVoirFacture(vente)}
                        title="Voir la facture"
                      >
                        🧾
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Aucune vente trouvée</h3>
            <p>
              {searchTerm || filterStatut !== 'tous' || filterPeriode !== 'tout' 
                ? 'Ajustez vos filtres pour voir plus de résultats'
                : 'Vous n\'avez pas encore effectué de vente'}
            </p>
            {!searchTerm && filterStatut === 'tous' && filterPeriode === 'tout' && (
              <button 
                className="btn btn-primary"
                onClick={() => window.location.href = '/vendeur/vente'}
              >
                🛒 Commencer une vente
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Détails */}
      {showDetailModal && selectedVente && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 Détail de la vente #{selectedVente.idVente}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-section">
                  <h4>Informations générales</h4>
                  <div className="detail-item">
                    <span>Date :</span>
                    <strong>{selectedVente.dateFormatee}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Vendeur :</span>
                    <strong>{selectedVente.vendeurNom}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Statut :</span>
                    <strong className={`statut-text ${selectedVente.statut}`}>
                      {selectedVente.statut}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span>Paiement :</span>
                    <strong>{selectedVente.typePaiement}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Total :</span>
                    <strong className="total-text">{formatCFA(selectedVente.totalVente)}</strong>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Produits vendus</h4>
                  <div className="produits-detail">
                    {selectedVente.produitsDetails.map((p, index) => (
                      <div key={index} className="produit-detail-item">
                        <div className="produit-detail-info">
                          <span className="produit-detail-nom">{p.nomProduit}</span>
                          <span className="produit-detail-categorie">{p.categorie}</span>
                        </div>
                        <div className="produit-detail-prix">
                          <span>{p.quantite} × {formatCFA(p.prixUnitaire)}</span>
                          <span className="produit-detail-total">{formatCFA(p.prixTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-primary btn-facture-footer" 
                onClick={() => {
                  setShowDetailModal(false);
                  handleVoirFacture(selectedVente);
                }}
              >
                🧾 Voir la facture
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDetailModal(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Facture */}
      {showFacture && selectedFactureVente && (
        <FactureVente 
          vente={selectedFactureVente}
          utilisateur={user}
          onFermer={handleFermerFacture}
        />
      )}
    </div>
  );
};

export default MesVentes;