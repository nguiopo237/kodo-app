import React, { useState } from 'react';
import { useAllData, useInvalidateQueries, queryKeys } from '../../hooks/useDataQueries';
import { dataService } from '../../services/dataService';
import { formatCFA } from '../../utils/formatters';
import './ChargesAdmin.css';

const CATEGORIES = [
  { value: 'Electricite', label: 'Electricite', icon: '\u26a1' },
  { value: 'Salaires', label: 'Salaires', icon: '\ud83d\udc65' },
  { value: 'Loyer', label: 'Loyer', icon: '\ud83c\udfe0' },
  { value: 'Abonnements', label: 'Abonnements', icon: '\ud83d\udce1' },
  { value: 'Eau', label: 'Eau', icon: '\ud83d\udca7' },
  { value: 'Autre', label: 'Autre', icon: '\ud83d\udccb' }
];

const emptyForm = { nom: '', montant: 0, categorie: 'Autre', description: '' };

const ChargesAdmin = () => {
  const { data: allData = {}, isLoading } = useAllData();
  const invalidate = useInvalidateQueries();

  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const charges = allData.charges || [];
  const totalCharges = charges.reduce((sum, c) => sum + (c.montant || 0), 0);

  const getCategoryInfo = (cat) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[5];

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        dataService.update('charges', editingId, form);
      } else {
        dataService.add('charges', form);
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
      invalidate(queryKeys.all);
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  };

  const handleEdit = (charge) => {
    setForm({ nom: charge.nom, montant: charge.montant, categorie: charge.categorie || 'Autre', description: charge.description || '' });
    setEditingId(charge.idCharge);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    dataService.delete('charges', id);
    invalidate(queryKeys.all);
  };

  const handleCancel = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  if (isLoading) {
    return <div className="loading-container"><div className="loading-spinner"></div><p>Chargement...</p></div>;
  }

  return (
    <div className="charges-page">
      <div className="page-header charges-header">
        <div className="header-title">
          <h1>Charges mensuelles</h1>
          <p>Gerez vos charges fixes qui deduisent le gain mensuel</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); if (!showForm) { setEditingId(null); setForm({...emptyForm}); } }}>
          {showForm ? 'Fermer' : '+ Ajouter une charge'}
        </button>
      </div>

      <div className="charges-summary">
        <div className="summary-card">
          <div className="summary-icon total">💰</div>
          <div>
            <span className="summary-label">Total charges / mois</span>
            <span className="summary-value">{formatCFA(totalCharges)}</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon count">📋</div>
          <div>
            <span className="summary-label">Nombre de charges</span>
            <span className="summary-value">{charges.length}</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon avg">📊</div>
          <div>
            <span className="summary-label">Moyenne / charge</span>
            <span className="summary-value">{formatCFA(charges.length > 0 ? Math.round(totalCharges / charges.length) : 0)}</span>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="charge-form-card">
          <h2>{editingId ? 'Modifier la charge' : 'Ajouter une charge mensuelle'}</h2>
          <form className="charge-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nom *</label>
                <input type="text" value={form.nom} onChange={(e) => setForm({...form, nom: e.target.value})} placeholder="Ex: ENEO, Salaire, Loyer..." required />
              </div>
              <div className="form-group">
                <label>Montant (FCFA) *</label>
                <input type="number" value={form.montant} onChange={(e) => setForm({...form, montant: parseFloat(e.target.value) || 0})} min="0" step="100" required />
              </div>
              <div className="form-group">
                <label>Categorie</label>
                <select value={form.categorie} onChange={(e) => setForm({...form, categorie: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>Annuler</button>
              <button type="submit" className="btn btn-primary" style={{background: '#dc2626'}}>{editingId ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="charges-list">
        <div className="list-header">
          <h2>Liste des charges mensuelles</h2>
          <span>{charges.length} charge(s)</span>
        </div>
        {charges.length > 0 ? (
          <table className="charges-table">
            <thead>
              <tr><th>Nom</th><th>Categorie</th><th>Montant</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {charges.map(charge => (
                <tr key={charge.idCharge}>
                  <td><strong>{charge.nom}</strong></td>
                  <td><span className="charge-category-badge">{getCategoryInfo(charge.categorie).icon} {charge.categorie}</span></td>
                  <td className="charge-amount">{formatCFA(charge.montant)}</td>
                  <td>
                    <button className="btn-icon" onClick={() => handleEdit(charge)} title="Modifier" style={{background:'#f0fdf4',color:'#059669'}}>E</button>
                    <button className="btn-icon btn-delete" onClick={() => handleDelete(charge.idCharge)} title="Supprimer">X</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background: '#fef2f2', fontWeight: 700}}>
                <td colSpan="2" style={{textAlign: 'right'}}>Total mensuel :</td>
                <td style={{color: '#dc2626'}}>{formatCFA(totalCharges)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="empty-state"><p>Aucune charge enregistree</p></div>
        )}
      </div>
    </div>
  );
};

export default ChargesAdmin;
