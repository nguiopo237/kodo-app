import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { dataService } from '../../services/dataService';
import { useDepenses, useTransport, useInvalidateQueries, queryKeys } from '../../hooks/useDataQueries';
import { formatCFA } from '../../utils/formatters';
import './DeclarerDepenses.css';

const TYPES_DEPENSES = [
  { value: 'dedouanement', label: 'Dédouanement', icon: '🛃' },
  { value: 'logistique', label: 'Logistique', icon: '🚚' },
  { value: 'stockage', label: 'Stockage', icon: '📦' },
  { value: 'marketing', label: 'Marketing', icon: '📢' },
  { value: 'transport_local', label: 'Transport local', icon: '🚛' },
  { value: 'autre', label: 'Autre', icon: '📋' }
];

const DeclarerDepenses = () => {
  const { user, hasPermission } = useAuth();
  const { success, error: showError, warning } = useNotification();

  const peutGererDepenses = hasPermission('depenses:creer');

  useEffect(() => {
    if (!peutGererDepenses) {
      warning('⛔ Vous n\'avez pas la permission de déclarer des dépenses.');
    }
  }, [peutGererDepenses, warning]);

  const { data: allDepenses = [], isLoading } = useDepenses();
  const { data: allEnvois = [] } = useTransport();
  const invalidate = useInvalidateQueries();

  const depenses = (allDepenses || [])
    .filter(d => d.idVendeur === user?.idUser)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const envois = allEnvois || [];

  if (!peutGererDepenses) {
    return (
      <div className="declarer-depenses">
        <div className="page-header depenses-header">
          <div className="header-title">
            <h1>💸 Declarer des depenses</h1>
            <p>Geerez vos depenses liees a l'activite commerciale</p>
          </div>
        </div>
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon" style={{ fontSize: '4rem' }}>🚫</div>
          <h3>Permission refusee</h3>
          <p style={{ color: '#6b7280', maxWidth: 400, margin: '0 auto' }}>
            Vous n&rsquo;avez pas la permission de gerer les depenses.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acces necessaire.
          </p>
        </div>
      </div>
    );
  }
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [editingDepense, setEditingDepense] = useState(null);

  const emptyForm = {
    typeDepense: '',
    description: '',
    montant: 0,
    date: new Date().toISOString().split('T')[0],
    idEnvoiAssocie: ''
  };
  const [form, setForm] = useState({ ...emptyForm });

  const getFiltered = (items) => {
    let result = [...items];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d =>
        d.description?.toLowerCase().includes(s) ||
        TYPES_DEPENSES.find(t => t.value === d.typeDepense)?.label.toLowerCase().includes(s)
      );
    }
    if (filterType) {
      result = result.filter(d => d.typeDepense === filterType);
    }
    if (filterPeriod !== 'all') {
      const now = new Date();
      let start;
      if (filterPeriod === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (filterPeriod === 'week') start = new Date(now.getTime() - 7 * 86400000);
      else if (filterPeriod === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter(d => new Date(d.date) >= start);
    }
    return result;
  };

  const depensesFiltrees = getFiltered(depenses);

  const stats = {
    total: depensesFiltrees.length,
    montantTotal: depensesFiltrees.reduce((s, d) => s + d.montant, 0),
    totalGlobal: depenses.reduce((s, d) => s + d.montant, 0),
    nbrTypes: new Set(depensesFiltrees.map(d => d.typeDepense)).size
  };

  // Répartition par type
  const repartition = {};
  depensesFiltrees.forEach(d => {
    if (!repartition[d.typeDepense]) repartition[d.typeDepense] = 0;
    repartition[d.typeDepense] += d.montant;
  });
  const maxRepart = Math.max(...Object.values(repartition), 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.typeDepense || !form.description || form.montant <= 0) {
      showError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    try {
      if (editingDepense) {
        dataService.update('depenses', editingDepense.idDepense, {
          ...form,
          idEnvoiAssocie: form.idEnvoiAssocie ? parseInt(form.idEnvoiAssocie) : null
        });
        success('Depense modifiee avec succes !');
      } else {
        dataService.add('depenses', {
          ...form,
          idVendeur: user.idUser,
          idEnvoiAssocie: form.idEnvoiAssocie ? parseInt(form.idEnvoiAssocie) : null,
          justificatif: null
        });
        success('Depense ajoutee avec succes !');
      }
      setForm({ ...emptyForm });
      setEditingDepense(null);
      invalidate(queryKeys.depenses, queryKeys.stats);
    } catch (err) {
      showError('Erreur: ' + err.message);
    }
  };

  const handleEdit = (depense) => {
    setEditingDepense(depense);
    setForm({
      typeDepense: depense.typeDepense,
      description: depense.description,
      montant: depense.montant,
      date: depense.date,
      idEnvoiAssocie: depense.idEnvoiAssocie ? String(depense.idEnvoiAssocie) : ''
    });
  };

  const handleCancelEdit = () => {
    setEditingDepense(null);
    setForm({ ...emptyForm });
  };

  const handleDelete = (depense) => {
    setToDelete(depense);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    try {
      dataService.delete('depenses', toDelete.idDepense);
      setShowDeleteModal(false);
      setToDelete(null);
      invalidate(queryKeys.depenses, queryKeys.stats);
      success('Depense supprimee avec succes');
    } catch (err) {
      showError('Erreur: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des depenses...</p>
      </div>
    );
  }

  return (
    <div className="declarer-depenses">
      {/* Header */}
      <div className="page-header depenses-header">
        <div className="header-title">
          <h1>💸 Declarer des depenses</h1>
          <p>Geerez vos depenses liees a l'activite commerciale</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingDepense(null);
          setForm({ ...emptyForm });
        }}>
          + Nouvelle depense
        </button>
      </div>

      {/* Formulaire */}
      <div className="depense-form-card">
        <div className="card-header-form">
          <h2>{editingDepense ? '✏️ Modifier la depense' : '➕ Ajouter une depense'}</h2>
        </div>
        <form className="depense-form" onSubmit={handleSubmit}>
          <div className="form-grid-3">
            <div className="form-group">
              <label>Type de depense *</label>
              <select value={form.typeDepense} onChange={(e) => setForm({ ...form, typeDepense: e.target.value })} required>
                <option value="">Selectionnez un type</option>
                {TYPES_DEPENSES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Montant (FCFA) *</label>
              <input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: parseFloat(e.target.value) || 0 })} min="0" step="100" required />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="2" placeholder="Description de la depense..." required />
            </div>
            <div className="form-group">
              <label>Envoi associe (optionnel)</label>
              <select value={form.idEnvoiAssocie} onChange={(e) => setForm({ ...form, idEnvoiAssocie: e.target.value })}>
                <option value="">Aucun envoi</option>
                {envois.map(e => (
                  <option key={e.idEnvoi} value={e.idEnvoi}>#{e.idEnvoi} - {e.paysEnvoi} → {e.paysReception}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            {editingDepense && (
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Annuler</button>
            )}
            <button type="submit" className="btn btn-primary">
              {editingDepense ? 'Enregistrer les modifications' : 'Ajouter la depense'}
            </button>
          </div>
        </form>
      </div>

      {/* Filtres */}
      <div className="filters-section" style={{ marginBottom: 25 }}>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Rechercher</label>
            <input className="filter-input" type="text" placeholder="Description, type..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Type</label>
            <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tous les types</option>
              {TYPES_DEPENSES.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Periode</label>
            <select className="filter-select" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
              <option value="all">Tout</option>
              <option value="today">Aujourd\'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">Ce mois</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste + Sidebar */}
      <div className="depenses-list">
        <div className="depenses-card">
          <div className="card-header">
            <h2>📋 Historique des depenses</h2>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{depensesFiltrees.length} depense(s)</span>
          </div>
          {depensesFiltrees.length > 0 ? (
            <div className="table-responsive">
              <table className="depenses-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Montant</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {depensesFiltrees.map(d => {
                    const typeInfo = TYPES_DEPENSES.find(t => t.value === d.typeDepense);
                    return (
                      <tr key={d.idDepense}>
                        <td className="depense-date">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                        <td><span className="type-badge">{typeInfo?.icon} {typeInfo?.label || d.typeDepense}</span></td>
                        <td className="depense-desc">
                          <span className="desc-text">{d.description}</span>
                          {d.idEnvoiAssocie && <span className="envoi-ref">Envoi #{d.idEnvoiAssocie}</span>}
                        </td>
                        <td className="depense-montant">{formatCFA(d.montant)}</td>
                        <td>
                          <button className="btn-action btn-edit" onClick={() => handleEdit(d)} title="Modifier">✏️</button>
                          <button className="btn-action btn-delete" onClick={() => handleDelete(d)} title="Supprimer">🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💸</div>
              <h3>Aucune depense trouvee</h3>
              <p>{search || filterType ? 'Ajustez vos filtres' : 'Ajoutez votre premiere depense'}</p>
            </div>
          )}
        </div>

        {/* Sidebar stats */}
        <div className="sidebar-card">
          <div className="depenses-card">
            <div className="card-header">
              <h2>📊 Statistiques</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Total periode</span>
                  <strong style={{ fontSize: '1.1rem', color: '#dc2626' }}>{formatCFA(stats.montantTotal)}</strong>
                </div>
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Total general</span>
                  <strong style={{ fontSize: '1.1rem', color: '#1f2937' }}>{formatCFA(stats.totalGlobal)}</strong>
                </div>
              </div>
              <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10 }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: 8 }}>Repartition par type</span>
                <div className="type-repartition">
                  {Object.entries(repartition).sort(([, a], [, b]) => b - a).map(([type, montant]) => {
                    const tInfo = TYPES_DEPENSES.find(t => t.value === type);
                    const pct = (montant / maxRepart) * 100;
                    return (
                      <div key={type} className="type-repart-item">
                        <div className="type-repart-header">
                          <span className="type-repart-label">{tInfo?.icon} {tInfo?.label || type}</span>
                          <span className="type-repart-montant">{formatCFA(montant)}</span>
                        </div>
                        <div className="type-repart-bar-bg">
                          <div className="type-repart-bar" style={{ width: pct + '%' }}></div>
                        </div>
                        <span className="type-repart-pct">{stats.montantTotal > 0 ? ((montant / stats.montantTotal) * 100).toFixed(1) : 0}%</span>
                      </div>
                    );
                  })}
                  {Object.keys(repartition).length === 0 && (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aucune depense filtree</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Suppression */}
      {showDeleteModal && toDelete && (
        <div className="modal-overlay" onClick={() => { setShowDeleteModal(false); setToDelete(null); }}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Supprimer la depense</h2>
              <button className="modal-close" onClick={() => { setShowDeleteModal(false); setToDelete(null); }}>x</button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>Supprimer cette depense ?</h3>
                  <p>{toDelete.description} - {formatCFA(toDelete.montant)}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setToDelete(null); }}>Annuler</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeclarerDepenses;
