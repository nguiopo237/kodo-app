import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAllData } from '../../hooks/useDataQueries';
import { formatCFA } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import './Rapports.css';

const Rapports = () => {
  const { hasPermission } = useAuth();
  const { data: allData, isLoading } = useAllData();
  const [reportType, setReportType] = useState('ventes');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { info, warning } = useNotification();

  const peutVoirRapports = hasPermission('rapports:lire');

  useEffect(() => {
    if (!peutVoirRapports) {
      warning('⛔ Vous n\'avez pas la permission de consulter les rapports.');
    }
  }, [peutVoirRapports, warning]);

  const data = allData || {};
  const ventes = data.ventes || [];
  const produits = data.produits || [];
  const utilisateurs = data.utilisateurs || [];
  const categories = data.categories || [];
  const depenses = data.depenses || [];
  const transport = data.transport || [];

  // Filtrer par date
  const getFilteredVentes = () => {
    let filtered = [...ventes];
    if (dateDebut) filtered = filtered.filter(v => new Date(v.date) >= new Date(dateDebut));
    if (dateFin) filtered = filtered.filter(v => new Date(v.date) <= new Date(dateFin + 'T23:59:59'));
    return filtered;
  };

  const filteredVentes = getFilteredVentes();

  // Stats générales
  const totalCA = filteredVentes.reduce((sum, v) => sum + v.totalVente, 0);
  const totalVentes = filteredVentes.length;
  const totalProduitsVendus = filteredVentes.reduce((sum, v) => 
    sum + (v.produitsVendus || []).reduce((s, p) => s + p.quantite, 0), 0
  );
  const ticketMoyen = totalVentes > 0 ? Math.round(totalCA / totalVentes) : 0;

  // Top produits
  const ventesParProduit = {};
  filteredVentes.forEach(v => {
    (v.produitsVendus || []).forEach(item => {
      if (!ventesParProduit[item.idProduit]) {
        ventesParProduit[item.idProduit] = { quantite: 0, ca: 0 };
      }
      ventesParProduit[item.idProduit].quantite += item.quantite;
      ventesParProduit[item.idProduit].ca += item.prixTotal;
    });
  });

  const topProduits = Object.entries(ventesParProduit)
    .sort(([, a], [, b]) => b.quantite - a.quantite)
    .slice(0, 10)
    .map(([id, stats]) => {
      const produit = produits.find(p => p.idProduit === parseInt(id));
      return {
        id: parseInt(id),
        nom: produit?.nomProduit || 'Produit inconnu',
        categorie: produit?.categorie || 'N/C',
        ...stats
      };
    });

  // Ventes par vendeur
  const ventesParVendeur = {};
  filteredVentes.forEach(v => {
    if (!ventesParVendeur[v.idVendeur]) {
      ventesParVendeur[v.idVendeur] = { nbVentes: 0, ca: 0 };
    }
    ventesParVendeur[v.idVendeur].nbVentes++;
    ventesParVendeur[v.idVendeur].ca += v.totalVente;
  });

  const vendeurStats = Object.entries(ventesParVendeur).map(([id, stats]) => {
    const vendeur = utilisateurs.find(u => u.idUser === parseInt(id));
    return {
      id: parseInt(id),
      nom: vendeur?.nomComplet || 'Vendeur inconnu',
      ...stats
    };
  }).sort((a, b) => b.ca - a.ca);

  // Ventes par catégorie
  const ventesParCategorie = {};
  filteredVentes.forEach(v => {
    (v.produitsVendus || []).forEach(item => {
      const produit = produits.find(p => p.idProduit === item.idProduit);
      const cat = produit?.categorie || 'Non catégorisé';
      if (!ventesParCategorie[cat]) ventesParCategorie[cat] = 0;
      ventesParCategorie[cat] += item.prixTotal;
    });
  });

  // Export CSV
  const handleExportCSV = (type) => {
    let csv = '';
    const bom = '\uFEFF';
    const dateStr = new Date().toISOString().split('T')[0];

    if (type === 'ventes') {
      csv = 'ID Vente;Date;Vendeur;Produits;Total;Paiement;Statut\n';
      filteredVentes.forEach(v => {
        const vendeur = utilisateurs.find(u => u.idUser === v.idVendeur);
        const produitsStr = (v.produitsVendus || []).map(p => {
          const prod = produits.find(pr => pr.idProduit === p.idProduit);
          return (prod?.nomProduit || 'N/C') + ' x' + p.quantite;
        }).join(', ');
        csv += `${v.idVente};${new Date(v.date).toLocaleDateString('fr-FR')};${vendeur?.nomComplet || 'N/C'};"${produitsStr}";${v.totalVente};${v.typePaiement || 'N/C'};${v.statut}\n`;
      });
    } else if (type === 'produits') {
      csv = 'Produit;Categorie;Quantite vendue;CA;Prix achat;Marge\n';
      topProduits.forEach(p => {
        const produit = produits.find(pr => pr.idProduit === p.id);
        const prixAchat = produit?.prixExact || 0;
        const marge = p.ca - (prixAchat * p.quantite);
        csv += `${p.nom};${p.categorie};${p.quantite};${p.ca};${prixAchat * p.quantite};${marge}\n`;
      });
    }

    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${type}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    info('Rapport ' + type + ' exporte en CSV');
  };

  if (!peutVoirRapports) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🚫</div>
        <h3>Permission refus&eacute;e</h3>
        <p>Vous n&rsquo;avez pas la permission de consulter les rapports.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acc&egrave;s n&eacute;cessaire.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des rapports...</p>
      </div>
    );
  }

  return (
    <div className="rapports-page">
      <div className="page-header rapports-header">
        <div className="header-title">
          <h1>Rapports</h1>
          <p>Analysez vos donnees avec des rapports detailles</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="rapports-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Type de rapport</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="ventes">Ventes</option>
              <option value="produits">Top produits</option>
              <option value="vendeurs">Performance vendeurs</option>
              <option value="categories">Categories</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Date debut</label>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Date fin</label>
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Rechercher</label>
            <input type="text" placeholder="Recherche..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={() => { setDateDebut(''); setDateFin(''); setSearchTerm(''); }}>
              Reinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="rapports-kpi">
        <div className="rkpi-card">
          <span className="rkpi-label">Ventes</span>
          <strong className="rkpi-value">{totalVentes}</strong>
        </div>
        <div className="rkpi-card">
          <span className="rkpi-label">Chiffre d'affaires</span>
          <strong className="rkpi-value">{formatCFA(totalCA)}</strong>
        </div>
        <div className="rkpi-card">
          <span className="rkpi-label">Produits vendus</span>
          <strong className="rkpi-value">{totalProduitsVendus}</strong>
        </div>
        <div className="rkpi-card">
          <span className="rkpi-label">Ticket moyen</span>
          <strong className="rkpi-value">{formatCFA(ticketMoyen)}</strong>
        </div>
      </div>

      {/* Rapport Ventes */}
      {reportType === 'ventes' && (
        <div className="rapport-section">
          <div className="rapport-card full-width">
            <div className="rapport-card-header">
              <h3>Liste des ventes</h3>
              <button className="btn btn-primary btn-sm" onClick={() => handleExportCSV('ventes')}>
                Exporter CSV
              </button>
            </div>
            <div className="table-container">
              <table className="rapport-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Vendeur</th>
                    <th>Produits</th>
                    <th>Total</th>
                    <th>Paiement</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVentes.map(v => {
                    const vendeur = utilisateurs.find(u => u.idUser === v.idVendeur);
                    return (
                      <tr key={v.idVente}>
                        <td className="id-cell">#{v.idVente}</td>
                        <td>{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                        <td>{vendeur?.nomComplet || 'N/C'}</td>
                        <td>
                          <div className="mini-produits">
                            {(v.produitsVendus || []).slice(0, 2).map((p, i) => {
                              const prod = produits.find(pr => pr.idProduit === p.idProduit);
                              return <span key={i} className="mini-produit">{prod?.nomProduit || 'N/C'} x{p.quantite}</span>;
                            })}
                            {(v.produitsVendus || []).length > 2 && <span className="mini-plus">+{v.produitsVendus.length - 2}</span>}
                          </div>
                        </td>
                        <td className="montant-cell">{formatCFA(v.totalVente)}</td>
                        <td><span className="paiement-badge">{v.typePaiement || 'N/C'}</span></td>
                        <td><span className={'statut-badge ' + (v.statut || 'complete')}>{v.statut || 'Complete'}</span></td>
                      </tr>
                    );
                  })}
                  {filteredVentes.length === 0 && (
                    <tr><td colSpan="7" className="empty-cell">Aucune vente trouvee</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rapport Produits */}
      {reportType === 'produits' && (
        <div className="rapport-section">
          <div className="rapport-card full-width">
            <div className="rapport-card-header">
              <h3>Top 10 produits les plus vendus</h3>
              <button className="btn btn-primary btn-sm" onClick={() => handleExportCSV('produits')}>
                Exporter CSV
              </button>
            </div>
            <div className="table-container">
              <table className="rapport-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Produit</th>
                    <th>Categorie</th>
                    <th>Quantite vendue</th>
                    <th>Chiffre d'affaires</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {topProduits.map((p, idx) => {
                    const maxQte = Math.max(...topProduits.map(x => x.quantite), 1);
                    const barWidth = (p.quantite / maxQte) * 100;
                    return (
                      <tr key={p.id}>
                        <td className="rank-cell">{idx + 1}</td>
                        <td><strong>{p.nom}</strong></td>
                        <td><span className="categorie-tag">{p.categorie}</span></td>
                        <td><strong>{p.quantite}</strong> unites</td>
                        <td className="montant-cell">{formatCFA(p.ca)}</td>
                        <td>
                          <div className="perf-bar-bg">
                            <div className="perf-bar" style={{ width: barWidth + '%' }}></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {topProduits.length === 0 && (
                    <tr><td colSpan="6" className="empty-cell">Aucune donnee de vente</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rapport Vendeurs */}
      {reportType === 'vendeurs' && (
        <div className="rapport-section">
          <div className="rapport-card full-width">
            <div className="rapport-card-header">
              <h3>Performance des vendeurs</h3>
            </div>
            <div className="table-container">
              <table className="rapport-table">
                <thead>
                  <tr>
                    <th>Vendeur</th>
                    <th>Nombre de ventes</th>
                    <th>Chiffre d'affaires</th>
                    <th>Ticket moyen</th>
                    <th>Part du CA</th>
                  </tr>
                </thead>
                <tbody>
                  {vendeurStats.map((v, idx) => {
                    const part = totalCA > 0 ? ((v.ca / totalCA) * 100).toFixed(1) : 0;
                    return (
                      <tr key={v.id}>
                        <td><strong>{v.nom}</strong></td>
                        <td>{v.nbVentes}</td>
                        <td className="montant-cell">{formatCFA(v.ca)}</td>
                        <td className="montant-cell">{formatCFA(v.nbVentes > 0 ? Math.round(v.ca / v.nbVentes) : 0)}</td>
                        <td>
                          <div className="part-bar-bg">
                            <div className="part-bar" style={{ width: part + '%' }}></div>
                            <span className="part-label">{part}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {vendeurStats.length === 0 && (
                    <tr><td colSpan="5" className="empty-cell">Aucune donnee de vente</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rapport Categories */}
      {reportType === 'categories' && (
        <div className="rapport-section">
          <div className="rapport-card full-width">
            <div className="rapport-card-header">
              <h3>Ventes par categorie</h3>
            </div>
            <div className="categories-report">
              {Object.entries(ventesParCategorie).length > 0 ? (
                <div className="categories-bars">
                  {Object.entries(ventesParCategorie)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, montant]) => {
                      const maxCat = Math.max(...Object.values(ventesParCategorie));
                      const pct = totalCA > 0 ? ((montant / totalCA) * 100).toFixed(1) : 0;
                      return (
                        <div key={cat} className="cat-bar-row">
                          <span className="cat-label">{cat}</span>
                          <div className="cat-bar-bg">
                            <div className="cat-bar" style={{ width: (montant / maxCat) * 100 + '%' }}></div>
                          </div>
                          <span className="cat-value">{formatCFA(montant)}</span>
                          <span className="cat-pct">{pct}%</span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <h3>Aucune donnee</h3>
                  <p>Pas de vente a afficher</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rapports;