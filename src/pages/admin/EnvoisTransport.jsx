import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { formatCFA } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useAllData, useInvalidateQueries, queryKeys } from '../../hooks/useDataQueries';
import './EnvoisTransport.css';

const EnvoisTransport = () => {
  const { hasPermission } = useAuth();
  const { data: allData, isLoading } = useAllData();
  const invalidate = useInvalidateQueries();
  const [showAjoutModal, setShowAjoutModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const { success, error: showError, warning } = useNotification();
  const [editingEnvoi, setEditingEnvoi] = useState(null);

  const [formData, setFormData] = useState({
    paysEnvoi: 'France',
    paysReception: 'Cameroun',
    coutTransport: 0,
    dateEnvoi: new Date().toISOString().split('T')[0],
    dateReception: '',
    produitsEnvoyes: [],
    statut: 'préparation',
    confirmeReception: false,
    quantiteRecue: null
  });

  const [selectedProduit, setSelectedProduit] = useState('');
  const [selectedQuantite, setSelectedQuantite] = useState(1);

  const peutVoirTransport = hasPermission('transport:lire');

  useEffect(() => {
    if (!peutVoirTransport) {
      warning('⛔ Vous n\'avez pas la permission de consulter les transports.');
    }
  }, [peutVoirTransport, warning]);

  const data = allData || {};
  const envois = data.transport || [];
  const produits = data.produits || [];

  const envoisFiltres = envois.filter(envoi => {
    const matchSearch = !searchTerm || 
      envoi.paysEnvoi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      envoi.paysReception?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `TR-${envoi.idEnvoi}`.includes(searchTerm);
    const matchStatut = filtreStatut === 'tous' || envoi.statut === filtreStatut;
    return matchSearch && matchStatut;
  });

  const stats = {
    total: envois.length,
    enTransit: envois.filter(e => e.statut === 'en transit').length,
    preparation: envois.filter(e => e.statut === 'préparation').length,
    recus: envois.filter(e => e.statut === 'reçu' || e.statut === 'reçue').length,
    coutTotal: envois.reduce((sum, e) => sum + (e.coutTransport || 0), 0)
  };

  const handleAjouterProduit = () => {
    if (!selectedProduit || selectedQuantite < 1) {
      showError('Sélectionnez un produit et une quantité valide');
      return;
    }
    const produit = produits.find(p => p.idProduit === parseInt(selectedProduit));
    if (!produit) return;

    const existe = formData.produitsEnvoyes.find(p => p.idProduit === parseInt(selectedProduit));
    if (existe) {
      setFormData(prev => ({
        ...prev,
        produitsEnvoyes: prev.produitsEnvoyes.map(p =>
          p.idProduit === parseInt(selectedProduit)
            ? { ...p, quantiteEnvoyee: p.quantiteEnvoyee + selectedQuantite }
            : p
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        produitsEnvoyes: [...prev.produitsEnvoyes, {
          idProduit: parseInt(selectedProduit),
          quantiteEnvoyee: selectedQuantite
        }]
      }));
    }
    setSelectedProduit('');
    setSelectedQuantite(1);
  };

  const retirerProduitEnvoi = (idProduit) => {
    setFormData(prev => ({
      ...prev,
      produitsEnvoyes: prev.produitsEnvoyes.filter(p => p.idProduit !== idProduit)
    }));
  };

  const handleEdit = (envoi) => {
    setEditingEnvoi(envoi);
    setFormData({
      paysEnvoi: envoi.paysEnvoi,
      paysReception: envoi.paysReception,
      coutTransport: envoi.coutTransport,
      dateEnvoi: envoi.dateEnvoi || new Date().toISOString().split('T')[0],
      dateReception: envoi.dateReception || '',
      produitsEnvoyes: [...(envoi.produitsEnvoyes || [])],
      statut: envoi.statut,
      confirmeReception: envoi.confirmeReception || false,
      quantiteRecue: envoi.quantiteRecue || null
    });
    setShowAjoutModal(true);
  };

  const handleCreerEnvoi = (e) => {
    e.preventDefault();
    if (formData.produitsEnvoyes.length === 0) {
      showError('Ajoutez au moins un produit à l\'envoi');
      return;
    }
    if (formData.coutTransport <= 0) {
      showError('Indiquez le coût de transport');
      return;
    }

    try {
      const data = dashboardService.loadData();
      const transport = data.transport || [];

      if (editingEnvoi) {
        // Mode edition: mettre a jour l'envoi existant
        const index = transport.findIndex(t => t.idEnvoi === editingEnvoi.idEnvoi);
        if (index !== -1) {
          transport[index] = {
            ...transport[index],
            paysEnvoi: formData.paysEnvoi,
            paysReception: formData.paysReception,
            coutTransport: formData.coutTransport,
            dateEnvoi: formData.dateEnvoi || transport[index].dateEnvoi,
            dateReception: formData.statut === 'reçu' || formData.statut === 'reçue'
              ? (formData.dateReception || new Date().toISOString().split('T')[0])
              : transport[index].dateReception,
            produitsEnvoyes: formData.produitsEnvoyes.map(p => ({
              idProduit: p.idProduit,
              quantiteEnvoyee: p.quantiteEnvoyee
            })),
            statut: formData.statut,
            confirmeReception: formData.statut === 'reçu' || formData.statut === 'reçue'
          };
          // Mise à jour du stock si le statut passe à reçu
          if ((formData.statut === 'reçu' || formData.statut === 'reçue') &&
              editingEnvoi.statut !== 'reçu' && editingEnvoi.statut !== 'reçue') {
            majStockReception(transport[index], data);
          }
          dashboardService.saveData('transport', transport);
          invalidate(queryKeys.transport, queryKeys.stock, queryKeys.stats);
          setShowAjoutModal(false);
          resetForm();
          success(`Envoi #TR-${editingEnvoi.idEnvoi.toString().padStart(3, '0')} modifie avec succes !`);
        }
        return;
      }

      const newId = Math.max(...transport.map(t => t.idEnvoi), 0) + 1;

      const nouvelEnvoi = {
        idEnvoi: newId,
        paysEnvoi: formData.paysEnvoi,
        paysReception: formData.paysReception,
        coutTransport: formData.coutTransport,
        dateEnvoi: formData.dateEnvoi || new Date().toISOString().split('T')[0],
        dateReception: formData.statut === 'reçu' || formData.statut === 'reçue'
          ? (formData.dateReception || new Date().toISOString().split('T')[0])
          : null,
        produitsEnvoyes: formData.produitsEnvoyes.map(p => ({
          idProduit: p.idProduit,
          quantiteEnvoyee: p.quantiteEnvoyee
        })),
        statut: formData.statut,
        confirmeReception: formData.statut === 'reçu' || formData.statut === 'reçue',
        quantiteRecue: null
      };

      transport.push(nouvelEnvoi);
      dashboardService.saveData('transport', transport);

      if (nouvelEnvoi.statut === 'reçu' || nouvelEnvoi.statut === 'reçue') {
        majStockReception(nouvelEnvoi, data);
      }

      invalidate(queryKeys.transport, queryKeys.stock, queryKeys.stats);
      setShowAjoutModal(false);
      resetForm();
      success(`Envoi #TR-${newId.toString().padStart(3, '0')} cree avec succes !`);
    } catch (error) {
      showError('Erreur: ' + error.message);
    }
  };

  const majStockReception = (envoi, data) => {
    const stock = [...(data.stock || [])];
    const produitsData = data.produits || [];

    envoi.produitsEnvoyes.forEach(item => {
      const stockIndex = stock.findIndex(s => s.idProduit === item.idProduit);
      if (stockIndex !== -1) {
        stock[stockIndex].quantiteRestante += item.quantiteEnvoyee;
        stock[stockIndex].dateDerniereMaj = new Date().toISOString().split('T')[0];
      } else {
        const produit = produitsData.find(p => p.idProduit === item.idProduit);
        const newStockId = Math.max(...stock.map(s => s.id), 0) + 1;
        stock.push({
          id: newStockId,
          idProduit: item.idProduit,
          quantiteRestante: item.quantiteEnvoyee,
          quantiteVendue: 0,
          dateDerniereMaj: new Date().toISOString().split('T')[0],
          alerteSeuil: produit?.alerteSeuil || 10
        });
      }
    });

    dashboardService.saveData('stock', stock);
  };

  const handleConfirmerReception = (envoi) => {
    try {
      const data = dashboardService.loadData();
      const transport = data.transport || [];
      const index = transport.findIndex(t => t.idEnvoi === envoi.idEnvoi);

      if (index !== -1) {
        transport[index].statut = 'reçu';
        transport[index].dateReception = new Date().toISOString().split('T')[0];
        transport[index].confirmeReception = true;
        majStockReception(transport[index], data);
        dashboardService.saveData('transport', transport);
        invalidate(queryKeys.transport, queryKeys.stock, queryKeys.stats);
        success(`Réception confirmée pour l'envoi #TR-${envoi.idEnvoi.toString().padStart(3, '0')} !`);
      }
    } catch (error) {
      showError('Erreur: ' + error.message);
    }
  };

  const handleSupprimerEnvoi = () => {
    if (!showDeleteModal) return;
    try {
      const data = dashboardService.loadData();
      const transport = data.transport || [];
      const filtered = transport.filter(t => t.idEnvoi !== showDeleteModal.idEnvoi);
      dashboardService.saveData('transport', filtered);
      invalidate(queryKeys.transport);
      setShowDeleteModal(null);
      success('Envoi supprimé avec succès');
    } catch (error) {
      showError('Erreur: ' + error.message);
    }
  };

  const resetForm = () => {
    setEditingEnvoi(null);
    setFormData({
      paysEnvoi: 'France',
      paysReception: 'Cameroun',
      coutTransport: 0,
      dateEnvoi: new Date().toISOString().split('T')[0],
      dateReception: '',
      produitsEnvoyes: [],
      statut: 'préparation',
      confirmeReception: false,
      quantiteRecue: null
    });
    setSelectedProduit('');
    setSelectedQuantite(1);
  };

  const getStatutLabel = (statut) => {
    const labels = {
      'préparation': 'Préparation',
      'en transit': 'En transit',
      'reçu': 'Reçu',
      'reçue': 'Reçue'
    };
    return labels[statut] || statut || 'Inconnu';
  };

  const getStatutClass = (statut) => {
    const classes = {
      'préparation': 'preparation',
      'en transit': 'transit',
      'reçu': 'recu',
      'reçue': 'recu'
    };
    return classes[statut] || '';
  };

  const getPaysIcon = (pays) => {
    if (!pays) return '🌍';
    const lower = pays.toLowerCase();
    if (lower.includes('france') || lower.includes('paris')) return '🇫🇷';
    if (lower.includes('cameroun') || lower.includes('douala') || lower.includes('yaound')) return '🇨🇲';
    if (lower.includes('cote') || lower.includes('ivoire') || lower.includes('abidjan')) return '🇨🇮';
    if (lower.includes('senegal') || lower.includes('dakar')) return '🇸🇳';
    return '🌍';
  };

  if (!peutVoirTransport) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🚫</div>
        <h3>Permission refus&eacute;e</h3>
        <p>Vous n&rsquo;avez pas la permission de g&eacute;rer le transport.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acc&egrave;s n&eacute;cessaire.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des envois...</p>
      </div>
    );
  }

  return (
    <div className="transport-page">
      <div className="page-header transport-header">
        <div className="header-title">
          <h1>Gestion du transport</h1>
          <p>Suivez et gérez les envois de marchandises</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAjoutModal(true)}>
          + Nouvel envoi
        </button>
      </div>

      <div className="transport-stats">
        <div className="stat-card-transport total">
          <span className="stat-icon-transport">📦</span>
          <div>
            <span className="stat-label">Total envois</span>
            <strong className="stat-value">{stats.total}</strong>
          </div>
        </div>
        <div className="stat-card-transport preparation">
          <span className="stat-icon-transport">📋</span>
          <div>
            <span className="stat-label">En préparation</span>
            <strong className="stat-value">{stats.preparation}</strong>
          </div>
        </div>
        <div className="stat-card-transport transit">
          <span className="stat-icon-transport">🚚</span>
          <div>
            <span className="stat-label">En transit</span>
            <strong className="stat-value">{stats.enTransit}</strong>
          </div>
        </div>
        <div className="stat-card-transport cout">
          <span className="stat-icon-transport">💰</span>
          <div>
            <span className="stat-label">Coût total</span>
            <strong className="stat-value">{formatCFA(stats.coutTotal)}</strong>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Rechercher</label>
            <input
              type="text"
              placeholder="Pays, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Statut</label>
            <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
              <option value="tous">Tous les statuts</option>
              <option value="préparation">En préparation</option>
              <option value="en transit">En transit</option>
              <option value="reçu">Reçus</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={() => { setSearchTerm(''); setFiltreStatut('tous'); }}>
              Reinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="envois-list">
        {envoisFiltres.length > 0 ? (
          envoisFiltres.map(envoi => (
            <div key={envoi.idEnvoi} className="envoi-card">
              <div className="envoi-header">
                <div className="envoi-ref">
                  <span className="envoi-id">#TR-{envoi.idEnvoi.toString().padStart(3, '0')}</span>
                  <span className={'envoi-statut ' + getStatutClass(envoi.statut)}>
                    {getStatutLabel(envoi.statut)}
                  </span>
                </div>
                <div className="envoi-actions">
                  {envoi.statut !== 'reçu' && envoi.statut !== 'reçue' && (
                    <button className="btn-action recu" onClick={() => handleConfirmerReception(envoi)} title="Confirmer la reception">
                      ✓ Reception
                    </button>
                  )}
                  <button className="btn-action modifier" onClick={() => handleEdit(envoi)} title="Modifier">
                    ✏️ Modifier
                  </button>
                  <button className="btn-action detail" onClick={() => setShowDetailModal(envoi)} title="Details">
                    Details
                  </button>
                  <button className="btn-action delete" onClick={() => setShowDeleteModal(envoi)} title="Supprimer">
                    Supprimer
                  </button>
                </div>
              </div>

              <div className="envoi-body">
                <div className="envoi-itineraire">
                  <div className="itineraire-point depart">
                    <span className="point-icon">{getPaysIcon(envoi.paysEnvoi)}</span>
                    <div className="point-info">
                      <span className="point-label">Depart</span>
                      <strong>{envoi.paysEnvoi || 'Non spécifié'}</strong>
                    </div>
                  </div>
                  <div className="itineraire-line">
                    <div className="line-dot start"></div>
                    <div className="line-bar"></div>
                    <div className="line-dot end"></div>
                  </div>
                  <div className="itineraire-point arrivee">
                    <span className="point-icon">{getPaysIcon(envoi.paysReception)}</span>
                    <div className="point-info">
                      <span className="point-label">Arrivee</span>
                      <strong>{envoi.paysReception || 'Non spécifié'}</strong>
                    </div>
                  </div>
                </div>
                <div className="envoi-infos">
                  <div className="info-item-transport">
                    <span>Date envoi</span>
                    <strong>{envoi.dateEnvoi ? new Date(envoi.dateEnvoi).toLocaleDateString('fr-FR') : '-'}</strong>
                  </div>
                  <div className="info-item-transport">
                    <span>Date reception</span>
                    <strong>{envoi.dateReception ? new Date(envoi.dateReception).toLocaleDateString('fr-FR') : 'En attente'}</strong>
                  </div>
                  <div className="info-item-transport">
                    <span>Produits</span>
                    <strong>{envoi.produitsEnvoyes?.length || 0} articles</strong>
                  </div>
                  <div className="info-item-transport">
                    <span>Coût</span>
                    <strong>{formatCFA(envoi.coutTransport || 0)}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🚚</div>
            <h3>Aucun envoi trouvé</h3>
            <p>Creez un nouvel envoi pour commencer le suivi</p>
          </div>
        )}
      </div>

      {showAjoutModal && (
        <div className="modal-overlay" onClick={() => { setShowAjoutModal(false); resetForm(); }}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEnvoi ? `✏️ Modifier envoi #TR-${editingEnvoi.idEnvoi.toString().padStart(3, '0')}` : 'Nouvel envoi'}</h2>
              <button className="modal-close" onClick={() => { setShowAjoutModal(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleCreerEnvoi}>
              <div className="modal-body">
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Pays d'envoi *</label>
                    <input type="text" value={formData.paysEnvoi} onChange={(e) => setFormData({...formData, paysEnvoi: e.target.value})} placeholder="France" required />
                  </div>
                  <div className="form-group">
                    <label>Pays de reception *</label>
                    <input type="text" value={formData.paysReception} onChange={(e) => setFormData({...formData, paysReception: e.target.value})} placeholder="Cameroun" required />
                  </div>
                  <div className="form-group">
                    <label>Statut</label>
                    <select value={formData.statut} onChange={(e) => setFormData({...formData, statut: e.target.value})}>
                      <option value="préparation">En préparation</option>
                      <option value="en transit">En transit</option>
                      <option value="reçu">Reçu</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date d'envoi</label>
                    <input type="date" value={formData.dateEnvoi} onChange={(e) => setFormData({...formData, dateEnvoi: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Date de reception</label>
                    <input type="date" value={formData.dateReception} onChange={(e) => setFormData({...formData, dateReception: e.target.value})} disabled={formData.statut !== 'reçu'} />
                  </div>
                  <div className="form-group">
                    <label>Coût du transport (FCFA) *</label>
                    <input type="number" value={formData.coutTransport} onChange={(e) => setFormData({...formData, coutTransport: parseInt(e.target.value) || 0})} min="1" required />
                  </div>
                </div>

                <div className="section-divider">
                  <h3>Produits à expédier</h3>
                </div>

                <div className="ajout-produit-row">
                  <div className="form-group">
                    <label>Produit</label>
                    <select value={selectedProduit} onChange={(e) => setSelectedProduit(e.target.value)}>
                      <option value="">Selectionnez un produit</option>
                      {produits.map(p => (
                        <option key={p.idProduit} value={p.idProduit}>{p.nomProduit} (Stock: {p.quantiteRestante || 0})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group quantite-group">
                    <label>Quantite</label>
                    <input type="number" value={selectedQuantite} onChange={(e) => setSelectedQuantite(parseInt(e.target.value) || 1)} min="1" />
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAjouterProduit}>+ Ajouter</button>
                </div>

                {formData.produitsEnvoyes.length > 0 && (
                  <div className="produits-envoyes-list">
                    <h4>Produits dans l'envoi ({formData.produitsEnvoyes.length})</h4>
                    <div className="produits-envoyes-table">
                      {formData.produitsEnvoyes.map((item, idx) => (
                        <div key={idx} className="produit-envoi-row">
                          <span className="produit-envoi-nom">{produits.find(p => p.idProduit === item.idProduit)?.nomProduit || 'Produit'}</span>
                          <span className="produit-envoi-qte">x {item.quantiteEnvoyee}</span>
                          <button type="button" className="btn-remove-small" onClick={() => retirerProduitEnvoi(item.idProduit)}>x</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAjoutModal(false); resetForm(); }}>Annuler</button>
                <button type="submit" className="btn btn-primary">
                  {editingEnvoi ? 'Enregistrer les modifications' : "Creer l'envoi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Details envoi #TR-{showDetailModal.idEnvoi.toString().padStart(3, '0')}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(null)}>x</button>
            </div>
            <div className="modal-body">
              <div className="detail-itineraire">
                <div className="detail-point">
                  <span className="detail-icon">{getPaysIcon(showDetailModal.paysEnvoi)}</span>
                  <div><strong>Depart:</strong> {showDetailModal.paysEnvoi || 'N/R'}</div>
                </div>
                <div className="detail-point">
                  <span className="detail-icon">{getPaysIcon(showDetailModal.paysReception)}</span>
                  <div><strong>Arrivee:</strong> {showDetailModal.paysReception || 'N/R'}</div>
                </div>
              </div>

              <div className="detail-dates">
                <div className="detail-date-item"><span>Date d'envoi</span><strong>{showDetailModal.dateEnvoi ? new Date(showDetailModal.dateEnvoi).toLocaleDateString('fr-FR') : '-'}</strong></div>
                <div className="detail-date-item"><span>Date de reception</span><strong>{showDetailModal.dateReception ? new Date(showDetailModal.dateReception).toLocaleDateString('fr-FR') : 'Pas encore recu'}</strong></div>
                <div className="detail-date-item"><span>Coût du transport</span><strong>{formatCFA(showDetailModal.coutTransport || 0)}</strong></div>
                <div className="detail-date-item"><span>Statut</span><strong><span className={'envoi-statut ' + getStatutClass(showDetailModal.statut)}>{getStatutLabel(showDetailModal.statut)}</span></strong></div>
              </div>

              <div className="section-divider"><h3>Produits expedies</h3></div>
              <div className="detail-produits-table">
                <table>
                  <thead><tr><th>Produit</th><th>Quantite</th></tr></thead>
                  <tbody>
                    {(showDetailModal.produitsEnvoyes || []).map((item, idx) => (
                      <tr key={idx}>
                        <td>{produits.find(p => p.idProduit === item.idProduit)?.nomProduit || 'Produit #' + item.idProduit}</td>
                        <td><span className="badge-qte">{item.quantiteEnvoyee}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showDetailModal.statut !== 'recu' && showDetailModal.statut !== 'recue' && (
                <div className="detail-actions">
                  <button className="btn btn-primary" onClick={() => { handleConfirmerReception(showDetailModal); setShowDetailModal(null); }}>Confirmer la reception</button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Supprimer l'envoi</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(null)}>x</button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>Supprimer l'envoi #TR-{showDeleteModal.idEnvoi.toString().padStart(3, '0')} ?</h3>
                  <p>Cette action est irreversible.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={handleSupprimerEnvoi}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvoisTransport;