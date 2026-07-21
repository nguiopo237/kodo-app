import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { dataService } from '../../services/dataService';
import { dashboardService } from '../../services/dashboardService';
import { useAllData, useInvalidateQueries, queryKeys } from '../../hooks/useDataQueries';
import { formatCFA } from '../../utils/formatters';
import './ConfirmerReception.css';

const ConfirmerReception = () => {
  const { user, hasPermission } = useAuth();
  const { success, error: showError, warning } = useNotification();

  const peutConfirmer = hasPermission('transport:confirmer');

  useEffect(() => {
    if (!peutConfirmer) {
      warning('⛔ Vous n\'avez pas la permission de confirmer les réceptions.');
    }
  }, [peutConfirmer, warning]);

  const { data: allData = {}, isLoading } = useAllData();
  const invalidate = useInvalidateQueries();

  const envois = (allData.transport || []).sort((a, b) => new Date(b.dateEnvoi) - new Date(a.dateEnvoi));
  const produits = allData.produits || [];

  if (!peutConfirmer) {
    return (
      <div className="confirmer-reception">
        <div className="page-header reception-header">
          <div className="header-title">
            <h1>📥 Confirmer la reception</h1>
            <p>Geerez la reception de vos envois et la mise a jour du stock</p>
          </div>
        </div>
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon" style={{ fontSize: '4rem' }}>🚫</div>
          <h3>Permission refusee</h3>
          <p style={{ color: '#6b7280', maxWidth: 400, margin: '0 auto' }}>
            Vous n&rsquo;avez pas la permission de confirmer les receptions.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acces necessaire.
          </p>
        </div>
      </div>
    );
  }
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showDetModal, setShowDetModal] = useState(false);
  const [showDelModal, setShowDelModal] = useState(false);
  const [selectedEnvoi, setSelectedEnvoi] = useState(null);

  const envoisFiltres = envois.filter(e => {
    const matchSearch = !search ||
      `#${e.idEnvoi}`.includes(search) ||
      e.paysEnvoi?.toLowerCase().includes(search.toLowerCase()) ||
      e.paysReception?.toLowerCase().includes(search.toLowerCase());
    const matchStatut = !filterStatut || e.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const stats = {
    total: envois.length,
    preparation: envois.filter(e => e.statut === 'preparation').length,
    transit: envois.filter(e => e.statut === 'en transit').length,
    recus: envois.filter(e => e.confirmeReception).length
  };

  const getStatutClass = (statut) => {
    if (statut === 'preparation') return 'preparation';
    if (statut === 'en transit') return 'transit';
    return 'recu';
  };

  const getProduitNom = (idProduit) => {
    const p = produits.find(pr => pr.idProduit === idProduit);
    return p?.nomProduit || 'Produit #' + idProduit;
  };

  const handleConfirmerReception = (envoi) => {
    if (!window.confirm(`Confirmer la reception de l'envoi #${envoi.idEnvoi} ?\n\nLe stock sera automatiquement mis a jour.`)) return;

    try {
      // Mettre a jour le statut de l'envoi
      dataService.update('transport', envoi.idEnvoi, {
        statut: 'recu',
        confirmeReception: true,
        dateReception: new Date().toISOString().split('T')[0],
        confirmePar: user?.idUser
      });

      // Mettre a jour le stock pour chaque produit
      const allData = dataService.getAll();
      const stock = allData.stock || [];

      (envoi.produitsEnvoyes || []).forEach(produitEnvoye => {
        const existingStock = stock.find(s => s.idProduit === produitEnvoye.idProduit);
        if (existingStock) {
          existingStock.quantiteRestante += produitEnvoye.quantiteEnvoyee;
          existingStock.dateDerniereMaj = new Date().toISOString().split('T')[0];
        } else {
          const newId = Math.max(...stock.map(s => s.id || 0), 0) + 1;
          stock.push({
            id: newId,
            idProduit: produitEnvoye.idProduit,
            quantiteRestante: produitEnvoye.quantiteEnvoyee,
            quantiteVendue: 0,
            dateDerniereMaj: new Date().toISOString().split('T')[0],
            alerteSeuil: 10
          });
        }
      });

      dashboardService.saveData('stock', stock);
      invalidate(queryKeys.transport, queryKeys.stock, queryKeys.produits);
      success('✅ Reception confirmee ! Le stock a ete mis a jour.');
    } catch (err) {
      showError('Erreur: ' + err.message);
    }
  };

  const handleDelete = (envoi) => {
    setSelectedEnvoi(envoi);
    setShowDelModal(true);
  };

  const confirmDelete = () => {
    if (!selectedEnvoi) return;
    try {
      dataService.delete('transport', selectedEnvoi.idEnvoi);
      setShowDelModal(false);
      setSelectedEnvoi(null);
      invalidate(queryKeys.transport);
      success('Envoi supprime avec succes');
    } catch (err) {
      showError('Erreur: ' + err.message);
    }
  };

  const handleVoirDetails = (envoi) => {
    setSelectedEnvoi(envoi);
    setShowDetModal(true);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des envois...</p>
      </div>
    );
  }

  return (
    <div className="confirmer-reception">
      {/* Header */}
      <div className="page-header reception-header">
        <div className="header-title">
          <h1>📥 Confirmer la reception</h1>
          <p>Geerez la reception de vos envois et la mise a jour du stock</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>📦</div>
          <div className="stat-content">
            <h3>Total envois</h3>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>📋</div>
          <div className="stat-content">
            <h3>Preparation</h3>
            <div className="stat-value">{stats.preparation}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>🚚</div>
          <div className="stat-content">
            <h3>En transit</h3>
            <div className="stat-value">{stats.transit}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>✅</div>
          <div className="stat-content">
            <h3>Recus</h3>
            <div className="stat-value">{stats.recus}</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Rechercher</label>
            <input className="filter-input" type="text" placeholder="Envoi #, pays..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Statut</label>
            <select className="filter-select" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="preparation">Preparation</option>
              <option value="en transit">En transit</option>
            </select>
          </div>
          <div className="filter-group">
            <label>&nbsp;</label>
            <span className="filter-info">{envoisFiltres.length} envoi(s) trouve(s)</span>
          </div>
        </div>
      </div>

      {/* Grille envois */}
      {envoisFiltres.length > 0 ? (
        <div className="envois-grid">
          {envoisFiltres.map(envoi => (
            <div key={envoi.idEnvoi} className="envoi-card">
              <div className="envoi-header">
                <div className="envoi-ref">
                  <span className="envoi-id">#TR-{String(envoi.idEnvoi).padStart(3, '0')}</span>
                  <span className={'envoi-statut ' + getStatutClass(envoi.statut)}>
                    {envoi.statut === 'preparation' ? 'Preparation' : envoi.statut === 'en transit' ? 'En transit' : 'Recu'}
                  </span>
                </div>
                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{new Date(envoi.dateEnvoi).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="envoi-body">
                <div className="envoi-itineraire">
                  <div className="itineraire-point">
                    <span className="point-icon">🇫🇷</span>
                    <div className="point-info">
                      <span className="point-label">Depart</span>
                      <strong>{envoi.paysEnvoi}</strong>
                    </div>
                  </div>
                  <div className="itineraire-line">
                    <span className="line-dot"></span>
                    <span className="line-bar"></span>
                    <span className="line-dot end"></span>
                  </div>
                  <div className="itineraire-point">
                    <span className="point-icon">🇨🇲</span>
                    <div className="point-info">
                      <span className="point-label">Arrivee</span>
                      <strong>{envoi.paysReception}</strong>
                    </div>
                  </div>
                </div>
                <div className="envoi-infos">
                  <div className="info-item">
                    <span>Produits</span>
                    <strong>{envoi.produitsEnvoyes?.length || 0} reference(s)</strong>
                  </div>
                  <div className="info-item">
                    <span>Cout transport</span>
                    <strong>{formatCFA(envoi.coutTransport)}</strong>
                  </div>
                  <div className="info-item">
                    <span>Date envoi</span>
                    <strong>{new Date(envoi.dateEnvoi).toLocaleDateString('fr-FR')}</strong>
                  </div>
                  <div className="info-item">
                    <span>Date reception</span>
                    <strong>{envoi.dateReception ? new Date(envoi.dateReception).toLocaleDateString('fr-FR') : '-'}</strong>
                  </div>
                </div>
                <div className="envoi-actions">
                  {!envoi.confirmeReception && (
                    <button className="btn-rec" onClick={() => handleConfirmerReception(envoi)}>
                      ✅ Confirmer la reception
                    </button>
                  )}
                  {envoi.confirmeReception && (
                    <button className="btn-rec" disabled style={{ opacity: 0.5 }}>
                      ✅ Deja recu
                    </button>
                  )}
                  <button className="btn-det" onClick={() => handleVoirDetails(envoi)}>Details</button>
                  <button className="btn-del" onClick={() => handleDelete(envoi)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📥</div>
          <h3>Aucun envoi trouve</h3>
          <p>{search || filterStatut ? 'Ajustez vos filtres' : 'Aucun envoi pour le moment'}</p>
        </div>
      )}

      {/* Modal Details */}
      {showDetModal && selectedEnvoi && (
        <div className="modal-overlay" onClick={() => setShowDetModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📦 Details envoi #TR-{String(selectedEnvoi.idEnvoi).padStart(3, '0')}</h2>
              <button className="modal-close" onClick={() => setShowDetModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="detail-itineraire">
                <div className="detail-point"><span className="detail-icon">📍</span> <strong>{selectedEnvoi.paysEnvoi}</strong></div>
                <span style={{ color: '#94a3b8' }}>→</span>
                <div className="detail-point"><span className="detail-icon">🏁</span> <strong>{selectedEnvoi.paysReception}</strong></div>
              </div>
              <div className="detail-dates">
                <div className="detail-date-item"><span>Envoi</span><strong>{new Date(selectedEnvoi.dateEnvoi).toLocaleDateString('fr-FR')}</strong></div>
                <div className="detail-date-item"><span>Reception</span><strong>{selectedEnvoi.dateReception ? new Date(selectedEnvoi.dateReception).toLocaleDateString('fr-FR') : '-'}</strong></div>
              </div>
              <h4 style={{ margin: '16px 0 12px', color: '#1e293b' }}>Produits expedies</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontSize: '0.8rem' }}>Produit</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', color: '#64748b', fontSize: '0.8rem' }}>Quantite</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedEnvoi.produitsEnvoyes || []).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px' }}>{getProduitNom(item.idProduit)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{item.quantiteEnvoyee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDelModal && selectedEnvoi && (
        <div className="modal-overlay" onClick={() => { setShowDelModal(false); setSelectedEnvoi(null); }}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Supprimer l'envoi</h2>
              <button className="modal-close" onClick={() => { setShowDelModal(false); setSelectedEnvoi(null); }}>x</button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>Supprimer l'envoi #TR-{String(selectedEnvoi.idEnvoi).padStart(3, '0')} ?</h3>
                  <p>Cette action est irreversible.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowDelModal(false); setSelectedEnvoi(null); }}>Annuler</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmerReception;
