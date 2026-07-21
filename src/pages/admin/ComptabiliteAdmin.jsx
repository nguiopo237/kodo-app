import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useAllData } from '../../hooks/useDataQueries';
import { formatCFA } from '../../utils/formatters';
import './ComptabiliteAdmin.css';

const ComptabiliteAdmin = () => {
  const { hasPermission } = useAuth();
  const { data: allData, isLoading } = useAllData();
  const [activeTab, setActiveTab] = useState('apercu');
  const [periodFilter, setPeriodFilter] = useState('all');

  const { warning } = useNotification();

  const peutVoirCompta = hasPermission('comptabilite:lire');

  useEffect(() => {
    if (!peutVoirCompta) {
      warning('⛔ Vous n\'avez pas la permission de consulter la comptabilité.');
    }
  }, [peutVoirCompta, warning]);

  const data = allData || {};
  const ventes = data.ventes || [];
  const depenses = data.depenses || [];
  const transport = data.transport || [];
  const produits = data.produits || [];
  const charges = data.charges || [];

  // Filtrage par période
  const getFilteredVentes = () => {
    if (periodFilter === 'all') return ventes;
    const now = new Date();
    let startDate;
    if (periodFilter === 'today') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (periodFilter === 'week') startDate = new Date(now.getTime() - 7 * 86400000);
    else if (periodFilter === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (periodFilter === 'year') startDate = new Date(now.getFullYear(), 0, 1);
    return ventes.filter(v => new Date(v.date) >= startDate);
  };

  const getFilteredDepenses = () => {
    if (periodFilter === 'all') return depenses;
    const now = new Date();
    let startDate;
    if (periodFilter === 'today') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (periodFilter === 'week') startDate = new Date(now.getTime() - 7 * 86400000);
    else if (periodFilter === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (periodFilter === 'year') startDate = new Date(now.getFullYear(), 0, 1);
    return depenses.filter(d => new Date(d.date) >= startDate);
  };

  const filteredVentes = getFilteredVentes();
  const filteredDepenses = getFilteredDepenses();

  // Calculs financiers
  const totalCA = filteredVentes.reduce((sum, v) => sum + v.totalVente, 0);
  const totalDepenses = filteredDepenses.reduce((sum, d) => sum + d.montant, 0);
  const totalTransport = transport.reduce((sum, t) => sum + (t.coutTransport || 0), 0);
  const totalChargesFixes = charges.reduce((sum, c) => sum + (c.montant || 0), 0);

  // Bénéfice réel avec COGS (coût d'achat des marchandises)
  let coutMarchandises = 0;
  filteredVentes.forEach(vente => {
    (vente.produitsVendus || []).forEach(item => {
      const produit = produits.find(p => p.idProduit === item.idProduit);
      const prixAchat = produit?.prixExact || 0;
      coutMarchandises += prixAchat * item.quantite;
    });
  });

  const margeBrute = totalCA - coutMarchandises;
  const beneficeNet = margeBrute - totalDepenses - totalTransport - totalChargesFixes;
  const tauxMarge = totalCA > 0 ? ((margeBrute / totalCA) * 100).toFixed(1) : 0;

  // Stats par type de dépense
  const depensesParType = {};
  depenses.forEach(d => {
    const type = d.typeDepense || 'autre';
    depensesParType[type] = (depensesParType[type] || 0) + d.montant;
  });

  // Ventes par mois
  const ventesParMois = {};
  ventes.forEach(v => {
    const mois = new Date(v.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    ventesParMois[mois] = (ventesParMois[mois] || 0) + v.totalVente;
  });

  if (!peutVoirCompta) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🚫</div>
        <h3>Permission refus&eacute;e</h3>
        <p>Vous n&rsquo;avez pas la permission de consulter la comptabilit&eacute;.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acc&egrave;s n&eacute;cessaire.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des données comptables...</p>
      </div>
    );
  }

  return (
    <div className="compta-page">
      <div className="page-header compta-header">
        <div className="header-title">
          <h1>Comptabilite</h1>
          <p>Analyse financière et suivi des performances</p>
        </div>
        <div className="header-filter">
          <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
            <option value="all">Toute la période</option>
            <option value="year">Cette année</option>
            <option value="month">Ce mois</option>
            <option value="week">Cette semaine</option>
            <option value="today">Aujourd'hui</option>
          </select>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="compta-kpi-grid">
        <div className="kpi-card revenue">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <span className="kpi-label">Chiffre d'affaires</span>
            <strong className="kpi-value">{formatCFA(totalCA)}</strong>
            <span className="kpi-sub">{filteredVentes.length} ventes</span>
          </div>
        </div>
        <div className="kpi-card cost">
          <div className="kpi-icon">📦</div>
          <div className="kpi-content">
            <span className="kpi-label">Coût marchandises (COGS)</span>
            <strong className="kpi-value">{formatCFA(coutMarchandises)}</strong>
            <span className="kpi-sub">{tauxMarge}% de marge brute</span>
          </div>
        </div>
        <div className="kpi-card marge">
          <div className="kpi-icon">💎</div>
          <div className="kpi-content">
            <span className="kpi-label">Marge brute</span>
            <strong className="kpi-value">{formatCFA(margeBrute)}</strong>
            <span className="kpi-sub">{tauxMarge}% du CA</span>
          </div>
        </div>
        <div className="kpi-card profit">
          <div className="kpi-icon">📈</div>
          <div className="kpi-content">
            <span className="kpi-label">Bénéfice net</span>
            <strong className="kpi-value">{formatCFA(beneficeNet)}</strong>
            <span className="kpi-sub">Après dépenses et transport</span>
          </div>
        </div>
      </div>

      {/* Sous-KPIs */}        <div className="compta-subkpi">
        <div className="subkpi-item">
          <span>🚚 Transport</span>
          <strong>{formatCFA(totalTransport)}</strong>
        </div>
        <div className="subkpi-item">
          <span>💸 Dépenses</span>
          <strong>{formatCFA(totalDepenses)}</strong>
        </div>
        <div className="subkpi-item">
          <span>💰 Charges fixes</span>
          <strong>{formatCFA(totalChargesFixes)}</strong>
        </div>
        <div className="subkpi-item">
          <span>📊 Coûts totaux</span>
          <strong>{formatCFA(totalDepenses + totalTransport + totalChargesFixes)}</strong>
        </div>
      </div>

      {/* Tabs */}
      <div className="compta-tabs">
        <button className={'compta-tab ' + (activeTab === 'apercu' ? 'active' : '')} onClick={() => setActiveTab('apercu')}>Aperçu</button>
        <button className={'compta-tab ' + (activeTab === 'depenses' ? 'active' : '')} onClick={() => setActiveTab('depenses')}>Dépenses</button>
        <button className={'compta-tab ' + (activeTab === 'evolution' ? 'active' : '')} onClick={() => setActiveTab('evolution')}>Évolution</button>
      </div>

      {/* Tab Aperçu */}
      {activeTab === 'apercu' && (
        <div className="compta-section">
          <div className="compta-card">
            <h3>Résumé financier</h3>
            <div className="resume-table">
              <div className="resume-row header">
                <span>Indicateur</span>
                <span>Montant</span>
                <span>% du CA</span>
              </div>
              <div className="resume-row">
                <span>Chiffre d'affaires</span>
                <strong>{formatCFA(totalCA)}</strong>
                <span>100%</span>
              </div>
              <div className="resume-row">
                <span>Coût des marchandises (COGS)</span>
                <strong className="negative">{formatCFA(-coutMarchandises)}</strong>
                <span>-{((coutMarchandises / totalCA) * 100).toFixed(1)}%</span>
              </div>
              <div className="resume-row total-row">
                <span>Marge brute</span>
                <strong>{formatCFA(margeBrute)}</strong>
                <span>{tauxMarge}%</span>
              </div>
              <div className="resume-row">
                <span>Frais de transport</span>
                <strong className="negative">{formatCFA(-totalTransport)}</strong>
                <span>-{totalCA > 0 ? ((totalTransport / totalCA) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="resume-row">
                <span>Autres dépenses</span>
                <strong className="negative">{formatCFA(-totalDepenses)}</strong>
                <span>-{totalCA > 0 ? ((totalDepenses / totalCA) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="resume-row">
                <span>💰 Charges fixes</span>
                <strong className="negative">{formatCFA(-totalChargesFixes)}</strong>
                <span>-{totalCA > 0 ? ((totalChargesFixes / totalCA) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="resume-row final-row">
                <span>Bénéfice net</span>
                <strong className={beneficeNet >= 0 ? 'positive' : 'negative'}>{formatCFA(beneficeNet)}</strong>
                <span>{totalCA > 0 ? ((beneficeNet / totalCA) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>

          <div className="compta-card">
            <h3>Ventes récentes</h3>
            <div className="recent-ventes-list">
              {filteredVentes.slice(0, 5).map(vente => (
                <div key={vente.idVente} className="recent-vente-item">
                  <div className="rv-info">
                    <strong>#{vente.idVente}</strong>
                    <span>{new Date(vente.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <strong className="rv-montant">{formatCFA(vente.totalVente)}</strong>
                </div>
              ))}
              {filteredVentes.length === 0 && <p className="empty-text">Aucune vente</p>}
            </div>
          </div>
        </div>
      )}

      {/* Tab Dépenses */}
      {activeTab === 'depenses' && (
        <div className="compta-section">
          <div className="compta-card full-width">
            <h3>Liste des dépenses</h3>
            {filteredDepenses.length > 0 ? (
              <table className="depenses-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepenses.map((dep, idx) => (
                    <tr key={idx}>
                      <td>{new Date(dep.date).toLocaleDateString('fr-FR')}</td>
                      <td><span className="type-badge">{dep.typeDepense || 'Autre'}</span></td>
                      <td>{dep.description || '-'}</td>
                      <td><strong>{formatCFA(dep.montant)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">💸</div>
                <h3>Aucune dépense</h3>
                <p>Aucune dépense enregistrée pour cette période</p>
              </div>
            )}
          </div>

          {Object.keys(depensesParType).length > 0 && (
            <div className="compta-card">
              <h3>Répartition par type</h3>
              <div className="depenses-types">
                {Object.entries(depensesParType).map(([type, montant]) => (
                  <div key={type} className="type-row">
                    <span className="type-label">{type}</span>
                    <div className="type-bar-container">
                      <div className="type-bar" style={{ width: `${(montant / Math.max(...Object.values(depensesParType))) * 100}%` }}></div>
                    </div>
                    <strong>{formatCFA(montant)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Évolution */}
      {activeTab === 'evolution' && (
        <div className="compta-section">
          <div className="compta-card full-width">
            <h3>Évolution du chiffre d'affaires par mois</h3>
            {Object.keys(ventesParMois).length > 0 ? (
              <div className="evolution-chart">
                {Object.entries(ventesParMois).map(([mois, montant]) => {
                  const maxMontant = Math.max(...Object.values(ventesParMois));
                  return (
                    <div key={mois} className="chart-bar-group">
                      <div className="chart-bar-container">
                        <div className="chart-bar" style={{ height: `${(montant / maxMontant) * 100}%` }}>
                          <span className="chart-bar-value">{formatCFA(montant)}</span>
                        </div>
                      </div>
                      <span className="chart-label">{mois}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>Aucune donnée</h3>
                <p>Pas assez de données pour afficher l'évolution</p>
              </div>
            )}
          </div>

          <div className="compta-card full-width">
            <h3>Indicateurs de performance</h3>
            <div className="perf-grid">
              <div className="perf-item">
                <span className="perf-label">Ticket moyen</span>
                <strong className="perf-value">{formatCFA(filteredVentes.length > 0 ? Math.round(totalCA / filteredVentes.length) : 0)}</strong>
              </div>
              <div className="perf-item">
                <span className="perf-label">Taux de marge nette</span>
                <strong className="perf-value">{totalCA > 0 ? ((beneficeNet / totalCA) * 100).toFixed(1) : 0}%</strong>
              </div>
              <div className="perf-item">
                <span className="perf-label">Coût transport / vente</span>
                <strong className="perf-value">{formatCFA(filteredVentes.length > 0 ? Math.round(totalTransport / filteredVentes.length) : 0)}</strong>
              </div>
              <div className="perf-item">
                <span className="perf-label">Dépenses / vente</span>
                <strong className="perf-value">{formatCFA(filteredVentes.length > 0 ? Math.round(totalDepenses / filteredVentes.length) : 0)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComptabiliteAdmin;