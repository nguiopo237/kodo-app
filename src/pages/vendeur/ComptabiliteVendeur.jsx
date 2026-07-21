import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { dataService } from '../../services/dataService';
import { useAllData, queryKeys } from '../../hooks/useDataQueries';
import { formatCFA } from '../../utils/formatters';
import './ComptabiliteVendeur.css';

const ComptabiliteVendeur = () => {
  const { user, hasPermission } = useAuth();

  const { warning } = useNotification();

  const peutVoirCompta = hasPermission('comptabilite:lire');

  useEffect(() => {
    if (!peutVoirCompta) {
      warning('⛔ Vous n\'avez pas la permission de consulter la comptabilité.');
    }
  }, [peutVoirCompta, warning]);

  const { data: allData = {}, isLoading } = useAllData();

  if (!peutVoirCompta) {
    return (
      <div className="compta-vendeur">
        <div className="page-header compta-header">
          <div className="header-title">
            <h1>📊 Comptabilite</h1>
            <p>Analysez vos performances financieres</p>
          </div>
        </div>
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon" style={{ fontSize: '4rem' }}>🚫</div>
          <h3>Permission refusee</h3>
          <p style={{ color: '#6b7280', maxWidth: 400, margin: '0 auto' }}>
            Vous n&rsquo;avez pas la permission de consulter la comptabilite.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acces necessaire.
          </p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('apercu');
  const [periodFilter, setPeriodFilter] = useState('all');

  const data = allData;

  const toutesVentes = (data.ventes || []).filter(v => v.idVendeur === user?.idUser);
  const depenses = (data.depenses || []).filter(d => d.idVendeur === user?.idUser);
  const transport = data.transport || [];
  const produits = data.produits || [];

  const getFiltered = (items, dateField = 'date') => {
    if (periodFilter === 'all') return items;
    const now = new Date();
    let start;
    if (periodFilter === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (periodFilter === 'week') start = new Date(now.getTime() - 7 * 86400000);
    else if (periodFilter === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (periodFilter === 'year') start = new Date(now.getFullYear(), 0, 1);
    return items.filter(i => new Date(i[dateField]) >= start);
  };

  const filteredVentes = getFiltered(toutesVentes);
  const filteredDepenses = getFiltered(depenses);

  // Calculs financiers
  const chiffreAffaires = filteredVentes.reduce((s, v) => s + (v.totalVente || 0), 0);
  const totalDepensesFiltre = filteredDepenses.reduce((s, d) => s + (d.montant || 0), 0);

  // COGS (Coût des marchandises vendues)
  let cogs = 0;
  filteredVentes.forEach(v => {
    (v.produitsVendus || []).forEach(item => {
      const produit = produits.find(p => p.idProduit === item.idProduit);
      const prixAchat = produit?.prixExact || 0;
      cogs += prixAchat * item.quantite;
    });
  });

  const margeBrute = chiffreAffaires - cogs;
  const tauxMarge = chiffreAffaires > 0 ? ((margeBrute / chiffreAffaires) * 100) : 0;
  const totalTransport = getFiltered(transport, 'dateEnvoi').reduce((s, t) => s + (t.coutTransport || 0), 0);
  const beneficeNet = margeBrute - totalDepensesFiltre - totalTransport;

  // Stats vendeur
  const totalProduitsVendus = filteredVentes.reduce((s, v) => s + (v.produitsVendus?.length || 0), 0);
  const ticketMoyen = filteredVentes.length > 0 ? chiffreAffaires / filteredVentes.length : 0;

  // Evolution mensuelle
  const evolution = {};
  toutesVentes.forEach(v => {
    const mois = new Date(v.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    if (!evolution[mois]) evolution[mois] = { ca: 0, depenses: 0, nb: 0 };
    evolution[mois].ca += v.totalVente || 0;
    evolution[mois].nb++;
  });
  depenses.forEach(d => {
    const mois = new Date(d.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    if (!evolution[mois]) evolution[mois] = { ca: 0, depenses: 0, nb: 0 };
    evolution[mois].depenses += d.montant || 0;
  });

  const moisKeys = Object.keys(evolution).slice(-6);
  const maxChartValue = Math.max(...moisKeys.map(m => Math.max(evolution[m]?.ca || 0, evolution[m]?.depenses || 0)), 1);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement de la comptabilite...</p>
      </div>
    );
  }

  return (
    <div className="compta-vendeur">
      {/* Header */}
      <div className="page-header compta-header">
        <div className="header-title">
          <h1>📊 Comptabilite</h1>
          <p>Analysez vos performances financieres</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            <option value="all" style={{ color: '#1f2937' }}>Toute l'histoire</option>
            <option value="today" style={{ color: '#1f2937' }}>Aujourd'hui</option>
            <option value="week" style={{ color: '#1f2937' }}>7 derniers jours</option>
            <option value="month" style={{ color: '#1f2937' }}>Ce mois</option>
            <option value="year" style={{ color: '#1f2937' }}>Cette annee</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="compta-kpi-grid">
        <div className="kpi-card revenue">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <span className="kpi-label">Chiffre d'affaires</span>
            <span className="kpi-value">{formatCFA(chiffreAffaires)}</span>
            <span className="kpi-sub">{filteredVentes.length} vente(s)</span>
          </div>
        </div>
        <div className="kpi-card cost">
          <div className="kpi-icon">📉</div>
          <div className="kpi-content">
            <span className="kpi-label">COGS (achats)</span>
            <span className="kpi-value">{formatCFA(cogs)}</span>
            <span className="kpi-sub">{totalProduitsVendus} produit(s) vendus</span>
          </div>
        </div>
        <div className="kpi-card marge">
          <div className="kpi-icon">📊</div>
          <div className="kpi-content">
            <span className="kpi-label">Marge brute</span>
            <span className="kpi-value" style={{ color: tauxMarge >= 30 ? '#059669' : '#d97706' }}>
              {formatCFA(margeBrute)} ({tauxMarge.toFixed(1)}%)
            </span>
            <span className="kpi-sub">Ticket moyen: {formatCFA(ticketMoyen)}</span>
          </div>
        </div>
        <div className="kpi-card profit">
          <div className="kpi-icon">🏆</div>
          <div className="kpi-content">
            <span className="kpi-label">Benefice net</span>
            <span className="kpi-value" style={{ color: beneficeNet >= 0 ? '#059669' : '#dc2626' }}>
              {formatCFA(beneficeNet)}
            </span>
            <span className="kpi-sub">Apres depenses & transport</span>
          </div>
        </div>
      </div>

      {/* Sub KPIs */}
      <div className="compta-subkpi">
        <div className="subkpi-item"><span>Depenses periodes</span><strong>{formatCFA(totalDepensesFiltre)}</strong></div>
        <div className="subkpi-item"><span>Transport</span><strong>{formatCFA(totalTransport)}</strong></div>
        <div className="subkpi-item"><span>Ventes periodes</span><strong>{filteredVentes.length}</strong></div>
        <div className="subkpi-item"><span>Produits vendus</span><strong>{totalProduitsVendus}</strong></div>
      </div>

      {/* Tabs */}
      <div className="compta-tabs">
        <button className={'compta-tab' + (activeTab === 'apercu' ? ' active' : '')} onClick={() => setActiveTab('apercu')}>
          📋 Apercu
        </button>
        <button className={'compta-tab' + (activeTab === 'depenses' ? ' active' : '')} onClick={() => setActiveTab('depenses')}>
          💸 Depenses
        </button>
        <button className={'compta-tab' + (activeTab === 'evolution' ? ' active' : '')} onClick={() => setActiveTab('evolution')}>
          📈 Evolution
        </button>
      </div>

      {/* Tab: Apercu */}
      {activeTab === 'apercu' && (
        <div className="compta-section">
          <div className="compta-card">
            <h3>Resume financier</h3>
            <div className="resume-table">
              <div className="resume-row header">
                <span>Rubrique</span>
                <span>Montant</span>
                <span>% CA</span>
              </div>
              <div className="resume-row">
                <span>💰 Chiffre d'affaires</span>
                <strong style={{ color: '#1f2937' }}>{formatCFA(chiffreAffaires)}</strong>
                <strong style={{ color: '#6b7280' }}>100%</strong>
              </div>
              <div className="resume-row">
                <span>📦 COGS (achats)</span>
                <strong className="negative">{formatCFA(cogs)}</strong>
                <strong style={{ color: '#6b7280' }}>{chiffreAffaires > 0 ? ((cogs / chiffreAffaires) * 100).toFixed(1) : 0}%</strong>
              </div>
              <div className="resume-row total-row">
                <span><strong>Marge brute</strong></span>
                <strong className="positive">{formatCFA(margeBrute)}</strong>
                <strong style={{ color: '#059669' }}>{tauxMarge.toFixed(1)}%</strong>
              </div>
              <div className="resume-row">
                <span>💸 Depenses</span>
                <strong className="negative">{formatCFA(totalDepensesFiltre)}</strong>
                <strong style={{ color: '#6b7280' }}>{chiffreAffaires > 0 ? ((totalDepensesFiltre / chiffreAffaires) * 100).toFixed(1) : 0}%</strong>
              </div>
              <div className="resume-row">
                <span>🚚 Transport</span>
                <strong className="negative">{formatCFA(totalTransport)}</strong>
                <strong style={{ color: '#6b7280' }}>{chiffreAffaires > 0 ? ((totalTransport / chiffreAffaires) * 100).toFixed(1) : 0}%</strong>
              </div>
              <div className="resume-row final-row">
                <span><strong>Benefice net</strong></span>
                <strong className={beneficeNet >= 0 ? 'positive' : 'negative'}>{formatCFA(beneficeNet)}</strong>
                <strong style={{ color: beneficeNet >= 0 ? '#059669' : '#dc2626' }}>{chiffreAffaires > 0 ? ((beneficeNet / chiffreAffaires) * 100).toFixed(1) : 0}%</strong>
              </div>
            </div>
          </div>
          <div className="compta-card">
            <h3>Indicateurs de performance</h3>
            <div className="perf-grid">
              <div className="perf-item">
                <span className="perf-label">Ticket moyen</span>
                <span className="perf-value" style={{ color: '#059669' }}>{formatCFA(ticketMoyen)}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Taux de marge</span>
                <span className="perf-value" style={{ color: tauxMarge >= 30 ? '#059669' : '#d97706' }}>{tauxMarge.toFixed(1)}%</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Ventes periodes</span>
                <span className="perf-value">{filteredVentes.length}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Produits/vente</span>
                <span className="perf-value">{filteredVentes.length > 0 ? (totalProduitsVendus / filteredVentes.length).toFixed(1) : 0}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Depenses/vente</span>
                <span className="perf-value" style={{ color: '#dc2626' }}>{filteredVentes.length > 0 ? formatCFA(totalDepensesFiltre / filteredVentes.length) : formatCFA(0)}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Rentabilite</span>
                <span className="perf-value" style={{ color: beneficeNet >= 0 ? '#059669' : '#dc2626' }}>
                  {chiffreAffaires > 0 ? ((beneficeNet / chiffreAffaires) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
          <div className="compta-card full-width">
            <h3>📄 Dernieres ventes</h3>
            {filteredVentes.length > 0 ? (
              <div className="ventes-liste">
                {filteredVentes.slice(-5).reverse().map(v => (
                  <div key={v.idVente} className="vente-item">
                    <div className="vente-info">
                      <strong>Vente #{v.idVente}</strong>
                      <span>{new Date(v.date).toLocaleDateString('fr-FR')} - {v.typePaiement} - {v.produitsVendus?.length || 0} produit(s)</span>
                    </div>
                    <span className="vente-montant">{formatCFA(v.totalVente)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Aucune vente pour cette periode</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Depenses */}
      {activeTab === 'depenses' && (
        <div className="compta-section">
          <div className="compta-card full-width">
            <h3>Historique des depenses</h3>
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
                  {filteredDepenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(d => (
                    <tr key={d.idDepense}>
                      <td>{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                      <td><span className="type-badge">{d.typeDepense}</span></td>
                      <td>{d.description}</td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>{formatCFA(d.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-text">Aucune depense pour cette periode</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Evolution */}
      {activeTab === 'evolution' && (
        <div className="compta-section">
          <div className="compta-card full-width">
            <h3>Evolution mensuelle</h3>
            {moisKeys.length > 0 ? (
              <>
                <div className="evolution-chart">
                  {moisKeys.map(mois => {
                    const e = evolution[mois];
                    const caPct = (e.ca / maxChartValue) * 100;
                    const depPct = (e.depenses / maxChartValue) * 100;
                    return (
                      <div key={mois} className="chart-bar-group" style={{ position: 'relative' }}>
                        <div className="chart-bar-container" style={{ position: 'relative' }}>
                          <div className="chart-bar" style={{ height: Math.max(caPct, 4) + '%', background: 'linear-gradient(180deg, #10b981, #059669)', position: 'absolute', bottom: 0, left: '5%', width: '40%' }}>
                            <span className="chart-bar-value" style={{ top: -20, fontSize: '0.65rem' }}>{formatCFA(e.ca)}</span>
                          </div>
                          <div className="chart-bar" style={{ height: Math.max(depPct, 4) + '%', background: 'linear-gradient(180deg, #ef4444, #dc2626)', position: 'absolute', bottom: 0, right: '5%', width: '40%' }}>
                            <span className="chart-bar-value" style={{ top: -20, fontSize: '0.65rem' }}>{formatCFA(e.depenses)}</span>
                          </div>
                        </div>
                        <span className="chart-label" style={{ marginTop: 30 }}>{mois}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#6b7280' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }}></span> CA
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#6b7280' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }}></span> Depenses
                  </span>
                </div>
              </>
            ) : (
              <p className="empty-text">Pas assez de donnees pour afficher l'evolution</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComptabiliteVendeur;
