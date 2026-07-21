import React, { useState, useEffect, useRef } from 'react';
import { produitService } from '../../services/produitService';
import { categorieService } from '../../services/categorieService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useProduits, useCategories, useInvalidateQueries, queryKeys } from '../../hooks/useDataQueries';
import { formatCFA } from '../../utils/formatters';
import { ImprimerEtiquettes, genererCodeBarre } from '../../components/EtiquetteProduit';
import BarcodeCell from '../../components/BarcodeCell';
import './GestionProduits.css';

const GestionProduits = () => {
  const { hasPermission } = useAuth();
  const { data: allProduits, isLoading: produitsLoading } = useProduits();
  const { data: allCategories } = useCategories();
  const invalidate = useInvalidateQueries();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterStock, setFilterStock] = useState('tous');
  const { success, error: showError, warning } = useNotification();
  const fileInputRef = useRef(null);

  // Import CSV
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

  // Impression etiquettes
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSize, setPrintSize] = useState('standard');
  const [printProduits, setPrintProduits] = useState([]);

  // Formulaire ajout
  const emptyForm = {
    categorie: '',
    nomProduit: '',
    codeBarre: '',
    quantiteInitiale: 1,
    rebus: 0,
    prixExact: 0,
    prixBoutique: 0,
    alerteSeuil: 10
  };
  const [formData, setFormData] = useState({ ...emptyForm });

  // Formulaire edition
  const [editForm, setEditForm] = useState({ ...emptyForm });

  const peutVoirProduits = hasPermission('produits:lire');

  useEffect(() => {
    if (!peutVoirProduits) {
      warning('⛔ Vous n\'avez pas la permission de gérer les produits.');
    }
  }, [peutVoirProduits, warning]);

  const produits = allProduits || [];
  const categories = allCategories || [];
  const loading = produitsLoading;

  // Filtrage
  const produitsFiltres = produits.filter(p => {
    const matchSearch = !searchTerm ||
      p.nomProduit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categorie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.codeBarre && p.codeBarre.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = !filterCategorie || p.categorie === filterCategorie;
    const matchStock = filterStock === 'tous' ||
      (filterStock === 'faible' && p.quantiteRestante <= p.alerteSeuil) ||
      (filterStock === 'bon' && p.quantiteRestante > p.alerteSeuil);
    return matchSearch && matchCat && matchStock;
  });

  // Stats
  const stats = {
    total: produits.length,
    stockFaible: produits.filter(p => p.quantiteRestante <= p.alerteSeuil).length,
    valeurStock: produits.reduce((sum, p) => sum + (p.quantiteRestante * (p.prixExact || 0)), 0),
    totalVendus: produits.reduce((sum, p) => sum + (p.quantiteVendue || 0), 0)
  };

  // Ajout
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) || 0 : value;
    if (name === 'prixExact' || name === 'prixBoutique') {
      autoCalculerPrix(name, val, false);
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.categorie || !formData.nomProduit || formData.quantiteInitiale < 1) {
      showError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    try {
      const quantiteExacte = formData.quantiteInitiale - formData.rebus;
      produitService.ajouterProduit({ ...formData, quantiteExacte });
      setShowAddModal(false);
      setFormData({ ...emptyForm });
      invalidate(queryKeys.produits, queryKeys.stock, queryKeys.categories, queryKeys.stats);
      success('Produit ajoute avec succes !');
    } catch (error) {
      showError('Erreur: ' + error.message);
    }
  };

  // Edition
  const handleEditOpen = (produit) => {
    setSelectedProduit(produit);
    setEditForm({
      categorie: produit.categorie || '',
      nomProduit: produit.nomProduit || '',
      codeBarre: produit.codeBarre || '',
      quantiteInitiale: produit.quantiteInitiale || 1,
      rebus: produit.rebus || 0,
      prixExact: produit.prixExact || 0,
      prixBoutique: produit.prixBoutique || 0,
      alerteSeuil: produit.alerteSeuil || 10
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) || 0 : value;
    if (name === 'prixExact' || name === 'prixBoutique') {
      autoCalculerPrix(name, val, true);
    } else {
      setEditForm(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!selectedProduit) return;
    try {
      const quantiteExacte = editForm.quantiteInitiale - editForm.rebus;
      produitService.mettreAJourProduit(selectedProduit.idProduit, {
        ...editForm,
        quantiteExacte
      });
      setShowEditModal(false);
      setSelectedProduit(null);
      invalidate(queryKeys.produits, queryKeys.stock, queryKeys.stats);
      success('Produit modifie avec succes !');
    } catch (error) {
      showError('Erreur: ' + error.message);
    }
  };

  // Suppression
  const handleDeleteOpen = (produit) => {
    setSelectedProduit(produit);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedProduit) return;
    try {
      produitService.supprimerProduit(selectedProduit.idProduit, true);
      setShowDeleteModal(false);
      setSelectedProduit(null);
      invalidate(queryKeys.produits, queryKeys.stock, queryKeys.stats);
      success('Produit supprime avec succes');
    } catch (error) {
      showError('Erreur: ' + error.message);
    }
  };

  // Dupliquer un produit
  const handleDupliquerProduit = (produit) => {
    try {
      produitService.ajouterProduit({
        categorie: produit.categorie,
        nomProduit: produit.nomProduit + ' (copie)',
        quantiteInitiale: produit.quantiteInitiale,
        rebus: produit.rebus || 0,
        quantiteExacte: produit.quantiteInitiale - (produit.rebus || 0),
        prixExact: produit.prixExact || 0,
        prixBoutique: produit.prixBoutique || 0,
        alerteSeuil: produit.alerteSeuil || 10
      });
      invalidate(queryKeys.produits, queryKeys.stock, queryKeys.stats);
      success('Produit duplique avec succes !');
    } catch (error) {
      showError('Erreur: ' + error.message);
    }
  };

  // ============================================
  // EXPORT CSV
  // ============================================
  const exportCSV = () => {
    if (produits.length === 0) {
      showError('Aucun produit a exporter');
      return;
    }

    const bom = '\uFEFF';
    const headers = 'Nom du produit;Catégorie;Stock restant;Seuil alerte;Prix achat (FCFA);Prix vente (FCFA);Marge %;Marge (FCFA);Quantité vendue;Date ajout';
    const rows = produits.map(p => {
      const prixAchat = p.prixExact || 0;
      const prixVente = p.prixBoutique || 0;
      const margePct = prixAchat > 0 ? ((prixVente - prixAchat) / prixAchat * 100).toFixed(1) : (prixVente > 0 ? '100.0' : '0.0');
      const margeFcfa = prixVente - prixAchat;
      return [
        `"${p.nomProduit}"`,
        `"${p.categorie || ''}"`,
        p.quantiteRestante || 0,
        p.alerteSeuil || 10,
        prixAchat,
        prixVente,
        margePct,
        margeFcfa,
        p.quantiteVendue || 0,
        p.dateAjout || ''
      ].join(';');
    }).join('\n');

    const csv = bom + headers + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produits_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success('Fichier CSV telecharge avec succes !');
  };

  // ============================================
  // IMPORT CSV
  // ============================================
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lignes = text.split('\n').filter(l => l.trim());

      if (lignes.length < 2) {
        showError('Le fichier CSV est vide ou invalide');
        return;
      }

      // Enlever le BOM si présent
      if (lignes[0].charCodeAt(0) === 0xFEFF) {
        lignes[0] = lignes[0].slice(1);
      }

      // La première ligne est l'en-tête, on la saute
      const dataRows = lignes.slice(1);
      const produitsAImporter = [];
      const erreurs = [];

      dataRows.forEach((ligne, index) => {
        // Enlever les guillemets autour des champs
        const cols = ligne.split(';').map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length < 3 || !cols[0]) {
          erreurs.push(`Ligne ${index + 2}: Nom du produit manquant`);
          return;
        }

        const nom = cols[0];
        const cat = cols[1] || 'Non categorise';
        const stock = parseInt(cols[2]) || 0;
        const seuil = parseInt(cols[3]) || 10;
        const prixAchat = parseFloat(cols[4]) || 0;
        const prixVente = parseFloat(cols[5]) || 0;

        produitsAImporter.push({
          nomProduit: nom,
          categorie: cat,
          quantiteInitiale: Math.max(stock, 1),
          quantiteExacte: Math.max(stock, 1),
          rebus: 0,
          prixExact: prixAchat,
          prixBoutique: prixVente || Math.round(prixAchat * 1.3 / 100) * 100,
          alerteSeuil: seuil
        });
      });

      setImportData(produitsAImporter);
      setImportErrors(erreurs);

      if (produitsAImporter.length > 0) {
        setShowImportModal(true);
      } else {
        showError('Aucun produit valide trouve dans le fichier');
      }
    };
    reader.readAsText(file);

    // Réinitialiser l'input pour permettre de ré-importer le même fichier
    e.target.value = '';
  };

  const confirmImport = () => {
    let successCount = 0;
    let errorCount = 0;
    const detailsErreurs = [];

    importData.forEach((produit, index) => {
      try {
        // Vérifier que la catégorie existe
        const cats = categorieService.getCategories().map(c => c.nom);
        if (!cats.includes(produit.categorie)) {
          // Créer la catégorie si elle n'existe pas
          try {
            categorieService.ajouterCategorie({
              nom: produit.categorie,
              icon: '📦',
              couleur: '#6b7280',
              description: 'Importee depuis CSV'
            });
          } catch (catErr) {
            detailsErreurs.push(`Produit #${index + 1} "${produit.nomProduit}": erreur creation categorie - ${catErr.message}`);
            errorCount++;
            return;
          }
        }
        produitService.ajouterProduit(produit);
        successCount++;
      } catch (err) {
        detailsErreurs.push(`Produit #${index + 1} "${produit.nomProduit}": ${err.message}`);
        errorCount++;
      }
    });

    setShowImportModal(false);
    setImportData([]);
    setImportErrors(detailsErreurs);
    invalidate(queryKeys.produits, queryKeys.stock, queryKeys.categories, queryKeys.stats);

    if (errorCount > 0) {
      showError(`${successCount} importe(s), ${errorCount} erreur(s). Consultez la console pour les details.`);
      console.warn('Erreurs import CSV:', detailsErreurs);
    } else {
      success(`${successCount} produit(s) importe(s) avec succes !`);
    }
  };

  // ============================================
  // SÉLECTEUR DE COLONNES
  // ============================================
  const COLUMNS = [
    { key: 'produit', label: 'Produit', defaultVisible: true },
    { key: 'categorie', label: 'Catégorie', defaultVisible: true },
    { key: 'codeBarre', label: 'Code-barres', defaultVisible: true },
    { key: 'stock', label: 'Stock', defaultVisible: true },
    { key: 'prixAchat', label: 'Prix achat', defaultVisible: true },
    { key: 'prixVente', label: 'Prix vente', defaultVisible: true },
    { key: 'marge', label: 'Marge', defaultVisible: true },
    { key: 'vendus', label: 'Vendus', defaultVisible: true },
    { key: 'actions', label: 'Actions', defaultVisible: true }
  ];

  // Charger la préférence depuis localStorage
  const getSavedColumns = () => {
    try {
      const saved = localStorage.getItem('produits_visible_columns');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  };

  // Initialiser : valeurs sauvegardées, sinon defaultVisible
  const initVisibleColumns = () => {
    const saved = getSavedColumns();
    const initial = {};
    COLUMNS.forEach(col => {
      initial[col.key] = saved[col.key] !== undefined ? saved[col.key] : col.defaultVisible;
    });
    return initial;
  };

  const [visibleColumns, setVisibleColumns] = useState(initVisibleColumns);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef(null);

  // Persister dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('produits_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Fermer le sélecteur au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(e.target)) {
        setShowColumnSelector(false);
      }
    };
    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnSelector]);

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Compter le nombre de colonnes visibles pour le colSpan
  const visibleColCount = COLUMNS.filter(c => visibleColumns[c.key]).length;

  // ============================================
  // IMPRESSION ETIQUETTES
  // ============================================
  const handlePrintProduit = (produit) => {
    setPrintProduits([produit]);
    setPrintSize('standard');
    setShowPrintModal(true);
  };

  const handlePrintAllFiltered = () => {
    if (produitsFiltres.length === 0) {
      showError('Aucun produit a imprimer');
      return;
    }
    setPrintProduits(produitsFiltres);
    setPrintSize('standard');
    setShowPrintModal(true);
  };

  const handlePrintClose = () => {
    setShowPrintModal(false);
    setPrintProduits([]);
  };

  // ============================================
  // AUTO-CALCUL PRIX
  // ============================================
  const autoCalculerPrix = (nomChamp, valeur, isEdit = false) => {
    const target = isEdit ? setEditForm : setFormData;
    target(prev => {
      const updated = { ...prev, [nomChamp]: valeur };
      if (nomChamp === 'prixExact' && valeur > 0 && !prev.prixBoutique) {
        updated.prixBoutique = Math.round(valeur * 1.3 / 100) * 100;
      } else if (nomChamp === 'prixBoutique' && valeur > 0 && !prev.prixExact) {
        updated.prixExact = Math.round(valeur * 0.7 / 100) * 100;
      }
      return updated;
    });
  };

  if (!peutVoirProduits) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🚫</div>
        <h3>Permission refus&eacute;e</h3>
        <p>Vous n&rsquo;avez pas la permission de g&eacute;rer les produits.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acc&egrave;s n&eacute;cessaire.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des produits...</p>
      </div>
    );
  }

  return (
    <div className="gestion-produits">
      {/* En-tete */}
      <div className="page-header">
        <div className="header-title">
          <h1>Gestion des produits</h1>
          <p>Gerer le stock, les prix et les informations produits</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-export" onClick={exportCSV} title="Exporter tous les produits en CSV">
            📥 Exporter CSV
          </button>
          <button className="btn btn-import" onClick={() => fileInputRef.current?.click()} title="Importer des produits depuis un fichier CSV">
            📤 Importer CSV
          </button>
          <button className="btn btn-print-batch" onClick={handlePrintAllFiltered} title="Imprimer les etiquettes des produits filtres">
            🏷️ Etiquettes
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Nouveau produit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Total produits</h3>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Stock faible</h3>
            <div className="stat-value">{stats.stockFaible}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Valeur stock</h3>
            <div className="stat-value">{formatCFA(stats.valeurStock)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Total vendus</h3>
            <div className="stat-value">{stats.totalVendus}</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Rechercher</label>
            <input
              type="text"
              placeholder="Produit, categorie, code-barres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Categorie</label>
            <select value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)}>
              <option value="">Toutes les categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.nom}>{cat.icon} {cat.nom}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Stock</label>
            <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)}>
              <option value="tous">Tous</option>
              <option value="faible">Stock faible</option>
              <option value="bon">Stock bon</option>
            </select>
          </div>
          <div className="filter-actions">
            <div className="column-selector-wrapper" ref={columnSelectorRef}>
              <button className="btn btn-columns" onClick={() => setShowColumnSelector(!showColumnSelector)} title="Personnaliser les colonnes">
                ⚙️ Colonnes
              </button>
              {showColumnSelector && (
                <div className="column-selector-dropdown">
                  <div className="column-selector-header">
                    <strong>Colonnes visibles</strong>
                    <div className="column-selector-actions">
                      <button className="column-selector-link" onClick={() => {
                        const allVisible = {};
                        COLUMNS.forEach(col => { allVisible[col.key] = true; });
                        setVisibleColumns(allVisible);
                      }}>Tout</button>
                      <span className="column-selector-sep">|</span>
                      <button className="column-selector-link" onClick={() => {
                        const noneVisible = {};
                        COLUMNS.forEach(col => { noneVisible[col.key] = false; });
                        setVisibleColumns(noneVisible);
                      }}>Aucun</button>
                    </div>
                  </div>
                  {COLUMNS.map(col => (
                    <label key={col.key} className="column-selector-item">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => { setSearchTerm(''); setFilterCategorie(''); setFilterStock('tous'); }}>
              Reinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr>
              {COLUMNS.map(col =>
                visibleColumns[col.key] && <th key={col.key}>{col.label}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {produitsFiltres.length > 0 ? (
              produitsFiltres.map(produit => {
                const prixAchat = produit.prixExact || 0;
                const prixVente = produit.prixBoutique || 0;
                const tauxMarge = prixAchat > 0 ? ((prixVente - prixAchat) / prixAchat) * 100 : (prixVente > 0 ? 100 : 0);
                const isLowStock = produit.quantiteRestante <= produit.alerteSeuil;
                const catCouleur = produit.categorieCouleur || '#10b981';
                const catIcon = produit.categorieIcon || '📦';
                return (
                  <tr key={produit.idProduit} className={isLowStock ? 'row-low-stock' : ''}>
                    {visibleColumns['produit'] && (
                      <td>
                        <div className="product-cell">
                          <div className="product-avatar" style={{ background: catCouleur }}>
                            {catIcon}
                          </div>
                          <div className="product-info">
                            <strong>{produit.nomProduit}</strong>
                            <small>ID: {produit.idProduit}</small>
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns['categorie'] && (
                      <td>
                        <span className="category-badge" style={{ background: catCouleur + '20', color: catCouleur }}>
                          {produit.categorie}
                        </span>
                      </td>
                    )}
                    {visibleColumns['codeBarre'] && (
                      <td>
                        <BarcodeCell produit={produit} />
                      </td>
                    )}
                    {visibleColumns['stock'] && (
                      <td>
                        <div className="stock-info">
                          <div className="stock-value">{produit.quantiteRestante} unites</div>
                          <div className="stock-progress">
                            <div className={'progress-bar ' + (isLowStock ? (produit.quantiteRestante <= 5 ? 'danger' : 'warning') : 'success')}
                              style={{ width: Math.min(100, (produit.quantiteRestante / (produit.alerteSeuil * 3)) * 100) + '%' }} />
                          </div>
                          <small>Seuil: {produit.alerteSeuil}</small>
                        </div>
                      </td>
                    )}
                    {visibleColumns['prixAchat'] && (
                      <td>
                        <div className="price-info">
                          <div className="price-achat"><strong>{formatCFA(produit.prixExact || 0)}</strong></div>
                        </div>
                      </td>
                    )}
                    {visibleColumns['prixVente'] && (
                      <td>
                        <div className="price-info">
                          <div className="price-vente"><strong>{formatCFA(produit.prixBoutique || 0)}</strong></div>
                        </div>
                      </td>
                    )}
                    {visibleColumns['marge'] && (
                      <td>
                        <div className="marge-info">
                          <span className={'status-badge ' + (tauxMarge > 30 ? 'success' : tauxMarge > 10 ? 'warning' : 'danger')}>
                            {tauxMarge.toFixed(1)}%
                          </span>
                          <small className="marge-fcfa">{formatCFA(prixVente - prixAchat)}/u</small>
                        </div>
                      </td>
                    )}
                    {visibleColumns['vendus'] && (
                      <td>
                        <div className="ventes-info">
                          <strong>{produit.quantiteVendue || 0}</strong>
                        </div>
                      </td>
                    )}
                    {visibleColumns['actions'] && (
                      <td>
                        <div className="action-buttons">
                          <button className="btn-action print" onClick={() => handlePrintProduit(produit)} title="Imprimer etiquette">🏷️</button>
                          <button className="btn-action edit" onClick={() => handleEditOpen(produit)} title="Modifier">✏️</button>
                          <button className="btn-action copy" onClick={() => handleDupliquerProduit(produit)} title="Dupliquer">📋</button>
                          <button className="btn-action delete" onClick={() => handleDeleteOpen(produit)} title="Supprimer">🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={Math.max(1, visibleColCount)}>
                  <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <h3>Aucun produit trouve</h3>
                    <p>Ajustez vos filtres ou creez un nouveau produit</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Ajout */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setFormData({ ...emptyForm }); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau produit</h2>
              <button className="modal-close" onClick={() => { setShowAddModal(false); setFormData({ ...emptyForm }); }}>x</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Categorie *</label>
                    <select name="categorie" value={formData.categorie} onChange={handleInputChange} required>
                      <option value="">Selectionnez une categorie</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.nom}>{cat.icon} {cat.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nom du produit *</label>
                    <input type="text" name="nomProduit" value={formData.nomProduit} onChange={handleInputChange} placeholder="Ex: Riz Basmati 5kg" required />
                  </div>
                  <div className="form-group">
                    <label>Code-barres</label>
                    <input type="text" name="codeBarre" value={formData.codeBarre} onChange={handleInputChange} placeholder="KODO-XXXX (laissez vide pour auto)" />
                    <small>Laissez vide pour generer automatiquement</small>
                  </div>
                  <div className="form-group">
                    <label>Quantite initiale *</label>
                    <input type="number" name="quantiteInitiale" value={formData.quantiteInitiale} onChange={handleInputChange} min="1" required />
                  </div>
                  <div className="form-group">
                    <label>Rebus (perte)</label>
                    <input type="number" name="rebus" value={formData.rebus} onChange={handleInputChange} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Prix d'achat (FCFA)</label>
                    <input type="number" name="prixExact" value={formData.prixExact} onChange={handleInputChange} min="0" step="100" />
                  </div>
                  <div className="form-group">
                    <label>Prix de vente (FCFA)</label>
                    <input type="number" name="prixBoutique" value={formData.prixBoutique} onChange={handleInputChange} min="0" step="100" />
                  </div>
                  <div className="form-group">
                    <label>Seuil d'alerte stock</label>
                    <input type="number" name="alerteSeuil" value={formData.alerteSeuil} onChange={handleInputChange} min="1" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddModal(false); setFormData({ ...emptyForm }); }}>Annuler</button>
                <button type="submit" className="btn btn-primary">Ajouter le produit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edition */}
      {showEditModal && selectedProduit && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setSelectedProduit(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Modifier le produit</h2>
              <button className="modal-close" onClick={() => { setShowEditModal(false); setSelectedProduit(null); }}>x</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="current-info">
                  <h4>Informations actuelles</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span>Stock restant</span>
                      <strong>{selectedProduit.quantiteRestante} unites</strong>
                    </div>
                    <div className="info-item">
                      <span>Quantite vendue</span>
                      <strong>{selectedProduit.quantiteVendue || 0} unites</strong>
                    </div>
                    <div className="info-item">
                      <span>Date ajout</span>
                      <strong>{selectedProduit.dateAjout || '-'}</strong>
                    </div>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Categorie *</label>
                    <select name="categorie" value={editForm.categorie} onChange={handleEditChange} required>
                      <option value="">Selectionnez une categorie</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.nom}>{cat.icon} {cat.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nom du produit *</label>
                    <input type="text" name="nomProduit" value={editForm.nomProduit} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label>Code-barres</label>
                    <input type="text" name="codeBarre" value={editForm.codeBarre} onChange={handleEditChange} placeholder="KODO-XXXX" />
                  </div>
                  <div className="form-group">
                    <label>Quantite initiale</label>
                    <input type="number" name="quantiteInitiale" value={editForm.quantiteInitiale} onChange={handleEditChange} min="1" />
                  </div>
                  <div className="form-group">
                    <label>Rebus</label>
                    <input type="number" name="rebus" value={editForm.rebus} onChange={handleEditChange} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Prix achat (FCFA)</label>
                    <input type="number" name="prixExact" value={editForm.prixExact} onChange={handleEditChange} min="0" step="100" />
                  </div>
                  <div className="form-group">
                    <label>Prix vente (FCFA)</label>
                    <input type="number" name="prixBoutique" value={editForm.prixBoutique} onChange={handleEditChange} min="0" step="100" />
                  </div>
                  <div className="form-group">
                    <label>Seuil d'alerte</label>
                    <input type="number" name="alerteSeuil" value={editForm.alerteSeuil} onChange={handleEditChange} min="1" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setSelectedProduit(null); }}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer les modifications</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import CSV */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📥 Importer des produits</h2>
              <button className="modal-close" onClick={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }}>x</button>
            </div>
            <div className="modal-body">
              <div className="import-preview">
                <div className="import-summary">
                  <div className="import-stat">
                    <span className="import-stat-label">Produits a importer</span>
                    <strong className="import-stat-value">{importData.length}</strong>
                  </div>
                  {importErrors.length > 0 && (
                    <div className="import-stat warning">
                      <span className="import-stat-label">Erreurs detectees</span>
                      <strong className="import-stat-value">{importErrors.length}</strong>
                    </div>
                  )}
                </div>

                {importErrors.length > 0 && (
                  <div className="import-errors">
                    <h4>Erreurs ignorees</h4>
                    <ul>
                      {importErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="import-table-wrapper">
                  <table className="import-table">
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Catégorie</th>
                        <th>Stock</th>
                        <th>Prix achat</th>
                        <th>Prix vente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 20).map((p, i) => (
                        <tr key={i}>
                          <td><strong>{p.nomProduit}</strong></td>
                          <td><span className="category-badge">{p.categorie}</span></td>
                          <td>{p.quantiteInitiale}</td>
                          <td>{formatCFA(p.prixExact)}</td>
                          <td>{formatCFA(p.prixBoutique)}</td>
                        </tr>
                      ))}
                      {importData.length > 20 && (
                        <tr>
                          <td colSpan="5" className="import-more">
                            ... et {importData.length - 20} produit(s) supplementaire(s)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }}>Annuler</button>
              <button className="btn btn-primary" onClick={confirmImport}>
                Importer {importData.length} produit(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Impression Etiquettes */}
      {showPrintModal && printProduits.length > 0 && (
        <div className="modal-overlay" onClick={handlePrintClose}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏷️ Imprimer les etiquettes</h2>
              <button className="modal-close" onClick={handlePrintClose}>x</button>
            </div>
            <div className="modal-body">
              <div className="print-batch-options">
                <div className="print-batch-info">
                  <strong>{printProduits.length} produit(s)</strong>
                  <span>Choisissez la taille de vos etiquettes</span>
                </div>
                <div className="print-batch-size">
                  <button
                    className={'print-size-option' + (printSize === 'standard' ? ' active' : '')}
                    onClick={() => setPrintSize('standard')}
                  >
                    <div className="size-icon">📐</div>
                    <span className="size-label">Standard</span>
                    <span className="size-desc">60 × 40 mm</span>
                  </button>
                  <button
                    className={'print-size-option' + (printSize === 'petit' ? ' active' : '')}
                    onClick={() => setPrintSize('petit')}
                  >
                    <div className="size-icon">📏</div>
                    <span className="size-label">Petite</span>
                    <span className="size-desc">40 × 30 mm</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handlePrintClose}>Annuler</button>
              <button className="btn btn-primary" onClick={() => { setShowPrintModal(false); }}>
                🖨️ Ouvrir l'apercu impression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'impression (affiché après fermeture du choix de taille) */}
      {!showPrintModal && printProduits.length > 0 && (
        <div className="print-overlay">
          <ImprimerEtiquettes
            produits={printProduits}
            taille={printSize}
            onClose={() => setPrintProduits([])}
          />
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && selectedProduit && (
        <div className="modal-overlay" onClick={() => { setShowDeleteModal(false); setSelectedProduit(null); }}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Supprimer le produit</h2>
              <button className="modal-close" onClick={() => { setShowDeleteModal(false); setSelectedProduit(null); }}>x</button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>Supprimer "{selectedProduit.nomProduit}" ?</h3>
                  <p>Cette action est irreversible.</p>
                  {selectedProduit.quantiteVendue > 0 && (
                    <div className="warning-message">
                      <strong>Attention:</strong> Ce produit a {selectedProduit.quantiteVendue} vente(s) associee(s).
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setSelectedProduit(null); }}>Annuler</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionProduits;