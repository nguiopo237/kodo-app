import React, { useState, useEffect } from 'react';
import { categorieService } from '../../services/categorieService';
import { produitService } from '../../services/produitService';
import { venteService } from '../../services/venteService';
import './GestionComplete.css';

const GestionComplete = () => {
    const [activeTab, setActiveTab] = useState('categories');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [produits, setProduits] = useState([]);
    const [ventes, setVentes] = useState([]);
    const [stats, setStats] = useState({});

    const [showCategorieModal, setShowCategorieModal] = useState(false);
    const [showProduitModal, setShowProduitModal] = useState(false);
    const [showVenteModal, setShowVenteModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteProduitModal, setShowDeleteProduitModal] = useState(false);
    const [showDeleteVenteModal, setShowDeleteVenteModal] = useState(false);
    const [showEditProduitModal, setShowEditProduitModal] = useState(false);
    const [editProduit, setEditProduit] = useState(null);
    const [editFormData, setEditFormData] = useState({
        categorie: '',
        nomProduit: '',
        quantiteInitiale: 0,
        rebus: 0,
        prixExact: 0,
        prixBoutique: 0,
        alerteSeuil: 10
    });
    const [categorieForm, setCategorieForm] = useState({
        nom: '',
        description: '',
        couleur: '#10b981',
        icon: '🍎'
    });

    const [produitForm, setProduitForm] = useState({
        categorie: '',
        nomProduit: '',
        quantiteInitiale: 1,
        rebus: 0,
        prixExact: 0,
        prixBoutique: 0,
        alerteSeuil: 10
    });
    // Ouvrir le modal de modification
    const handleEditProduit = (produit) => {
        setEditProduit(produit);
        setEditFormData({
            categorie: produit.categorie,
            nomProduit: produit.nomProduit,
            quantiteInitiale: produit.quantiteInitiale,
            rebus: produit.rebus || 0,
            prixExact: produit.prixExact || 0,
            prixBoutique: produit.prixBoutique || 0,
            alerteSeuil: produit.alerteSeuil || 10
        });
        setShowEditProduitModal(true);
    };
    // Soumettre la modification
    const handleEditProduitSubmit = (e) => {
        e.preventDefault();

        if (!editProduit) return;

        const quantiteExacte = editFormData.quantiteInitiale - editFormData.rebus;

        try {
            produitService.mettreAJourProduit(editProduit.idProduit, {
                categorie: editFormData.categorie,
                nomProduit: editFormData.nomProduit,
                quantiteInitiale: editFormData.quantiteInitiale,
                rebus: editFormData.rebus,
                quantiteExacte: quantiteExacte,
                prixExact: editFormData.prixExact,
                prixBoutique: editFormData.prixBoutique,
                alerteSeuil: editFormData.alerteSeuil
            });

            setShowEditProduitModal(false);
            setEditProduit(null);
            chargerDonnees();
            alert('✅ Produit modifié avec succès !');
        } catch (error) {
            alert('❌ Erreur: ' + error.message);
        }
    };

    const [venteForm, setVenteForm] = useState({
        idVendeur: 2,
        produitsVendus: [],
        typePaiement: 'espèces'
    });

    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedProduit, setSelectedProduit] = useState(null);
    const [selectedVente, setSelectedVente] = useState(null);
    const [forceDelete, setForceDelete] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [quantiteVente, setQuantiteVente] = useState(1);
    const [selectedProduitsVente, setSelectedProduitsVente] = useState([]);

    const chargerDonnees = () => {
        setLoading(true);
        setTimeout(() => {
            const categoriesData = categorieService.getStatsParCategorie();
            const produitsData = produitService.getProduits();
            const ventesData = venteService.getVentesDetaillees();
            const statsData = venteService.getStatistiquesVentes();

            setCategories(categoriesData);
            setProduits(produitsData);
            setVentes(ventesData);
            setStats(statsData);
            setLoading(false);
        }, 500);
    };

    useEffect(() => {
        chargerDonnees();
    }, []);

    // Gestion des catégories
    const handleCategorieSubmit = (e) => {
        e.preventDefault();
        try {
            categorieService.ajouterCategorie(categorieForm);
            setShowCategorieModal(false);
            setCategorieForm({ nom: '', description: '', couleur: '#10b981', icon: '🍎' });
            chargerDonnees();
            alert('Catégorie ajoutée avec succès !');
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    const handleDeleteCategorie = () => {
        try {
            categorieService.supprimerCategorie(selectedItem.id);
            setShowDeleteModal(false);
            chargerDonnees();
            alert('Catégorie supprimée avec succès !');
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    // Gestion des produits
    const handleProduitSubmit = (e) => {
        e.preventDefault();

        if (!produitForm.categorie || !produitForm.nomProduit || produitForm.quantiteInitiale < 1) {
            alert('Veuillez remplir les champs obligatoires : Catégorie, Nom et Quantité');
            return;
        }

        const quantiteExacte = produitForm.quantiteInitiale - produitForm.rebus;

        try {
            produitService.ajouterProduit({
                ...produitForm,
                quantiteExacte
            });

            setShowProduitModal(false);
            setProduitForm({
                categorie: '',
                nomProduit: '',
                quantiteInitiale: 1,
                rebus: 0,
                prixExact: 0,
                prixBoutique: 0,
                alerteSeuil: 10
            });

            chargerDonnees();
            alert('✅ Produit ajouté avec succès !');
        } catch (error) {
            alert('❌ Erreur: ' + error.message);
        }
    };

    const handleDeleteProduit = () => {
        if (!selectedProduit) return;

        try {
            produitService.supprimerProduit(selectedProduit.idProduit, forceDelete);
            setShowDeleteProduitModal(false);
            setSelectedProduit(null);
            setForceDelete(false);
            chargerDonnees();
            alert('Produit supprimé avec succès !');
        } catch (error) {
            if (error.message.includes('forcer la suppression')) {
                if (window.confirm(error.message + '\n\nCette action supprimera également les lignes de ce produit dans les ventes.')) {
                    setForceDelete(true);
                    setTimeout(() => {
                        handleDeleteProduit();
                    }, 100);
                }
            } else {
                alert('Erreur: ' + error.message);
            }
        }
    };

    // Gestion des ventes
    const ajouterProduitVente = (produit) => {
        const existe = selectedProduitsVente.find(p => p.idProduit === produit.idProduit);

        if (existe) {
            setSelectedProduitsVente(prev =>
                prev.map(p => p.idProduit === produit.idProduit
                    ? { ...p, quantite: p.quantite + quantiteVente, prixTotal: p.prixUnitaire * (p.quantite + quantiteVente) }
                    : p
                )
            );
        } else {
            setSelectedProduitsVente(prev => [
                ...prev,
                {
                    idProduit: produit.idProduit,
                    nomProduit: produit.nomProduit,
                    quantite: quantiteVente,
                    prixUnitaire: produit.prixBoutique || 10,
                    prixTotal: (produit.prixBoutique || 10) * quantiteVente
                }
            ]);
        }
        setQuantiteVente(1);
    };

    const supprimerProduitVente = (idProduit) => {
        setSelectedProduitsVente(prev =>
            prev.filter(p => p.idProduit !== idProduit)
        );
    };

    const handleVenteSubmit = (e) => {
        e.preventDefault();

        if (selectedProduitsVente.length === 0) {
            alert('Ajoutez au moins un produit à la vente');
            return;
        }

        try {
            venteService.creerVente({
                idVendeur: venteForm.idVendeur,
                produitsVendus: selectedProduitsVente.map(p => ({
                    idProduit: p.idProduit,
                    quantite: p.quantite,
                    prixUnitaire: p.prixUnitaire,
                    prixTotal: p.prixTotal
                })),
                totalVente: selectedProduitsVente.reduce((sum, p) => sum + p.prixTotal, 0),
                typePaiement: venteForm.typePaiement
            });

            setShowVenteModal(false);
            setVenteForm({
                idVendeur: 2,
                produitsVendus: [],
                typePaiement: 'espèces'
            });
            setSelectedProduitsVente([]);

            chargerDonnees();
            alert('Vente enregistrée avec succès !');
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    const handleDeleteVente = () => {
        if (!selectedVente) return;

        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la vente #${selectedVente.idVente} ?\n\nCette action est irréversible et réapprovisionnera le stock.`)) {
            return;
        }

        try {
            venteService.supprimerVente(selectedVente.idVente);
            setShowDeleteVenteModal(false);
            setSelectedVente(null);
            chargerDonnees();
            alert('Vente supprimée avec succès !');
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    const handleAnnulerVente = (vente) => {
        if (!window.confirm(`Annuler la vente #${vente.idVente} ?\n\nLe stock sera réapprovisionné et la vente marquée comme annulée.`)) {
            return;
        }

        try {
            venteService.annulerVente(vente.idVente);
            chargerDonnees();
            alert('Vente annulée avec succès !');
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    };

    const produitsFiltres = produits.filter(produit =>
        produit.nomProduit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produit.categorie.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Chargement des données...</p>
            </div>
        );
    }

    return (
        <div className="gestion-complete">
            <div className="page-header">
                <div className="header-title">
                    <h1>🏪 Gestion Complète</h1>
                    <p>Gérez les catégories, produits et ventes en un seul endroit</p>
                </div>
                <div className="header-stats">
                    <div className="stat-item">
                        <span>Catégories</span>
                        <strong>{categories.length}</strong>
                    </div>
                    <div className="stat-item">
                        <span>Produits</span>
                        <strong>{produits.length}</strong>
                    </div>
                    <div className="stat-item">
                        <span>Ventes</span>
                        <strong>{stats.totalVentes}</strong>
                    </div>
                    <div className="stat-item">
                        <span>CA Total</span>
                        <strong>€{stats.totalCA || 0}</strong>
                    </div>
                </div>
            </div>

            <div className="tabs-navigation">
                <button
                    className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    📂 Catégories ({categories.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'produits' ? 'active' : ''}`}
                    onClick={() => setActiveTab('produits')}
                >
                    📦 Produits ({produits.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'ventes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ventes')}
                >
                    🛒 Ventes ({stats.totalVentes})
                </button>
            </div>

            <div className="actions-bar">
                {activeTab === 'categories' && (
                    <button className="btn btn-primary" onClick={() => setShowCategorieModal(true)}>
                        + Nouvelle catégorie
                    </button>
                )}

                {activeTab === 'produits' && (
                    <>
                        <button className="btn btn-primary" onClick={() => setShowProduitModal(true)}>
                            + Nouveau produit
                        </button>
                        <input
                            type="text"
                            placeholder="🔍 Rechercher un produit..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </>
                )}

                {activeTab === 'ventes' && (
                    <button className="btn btn-primary" onClick={() => setShowVenteModal(true)}>
                        + Nouvelle vente
                    </button>
                )}
            </div>

            <div className="tab-content">
                {/* Onglet Catégories */}
                {activeTab === 'categories' && (
                    <div className="categories-grid">
                        {categories.map(categorie => (
                            <div key={categorie.id} className="categorie-card" style={{ borderLeftColor: categorie.couleur }}>
                                <div className="categorie-header">
                                    <div className="categorie-icon" style={{ background: categorie.couleur }}>
                                        {categorie.icon}
                                    </div>
                                    <div className="categorie-info">
                                        <h3>{categorie.nom}</h3>
                                        <p>{categorie.description}</p>
                                    </div>
                                </div>

                                <div className="categorie-stats">
                                    <div className="stat">
                                        <span>Produits</span>
                                        <strong>{categorie.nombreProduits}</strong>
                                    </div>
                                    <div className="stat">
                                        <span>Ventes</span>
                                        <strong>{categorie.nombreVentes}</strong>
                                    </div>
                                    <div className="stat">
                                        <span>CA</span>
                                        <strong>€{categorie.chiffreAffaires || 0}</strong>
                                    </div>
                                </div>

                                <div className="categorie-actions">
                                    <button className="btn-action delete" onClick={() => {
                                        setSelectedItem(categorie);
                                        setShowDeleteModal(true);
                                    }}>
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Onglet Produits */}
                {activeTab === 'produits' && (
                    <div className="produits-table-container">
                        <table className="produits-table">
                            <thead>
                                <tr>
                                    <th>Produit</th>
                                    <th>Catégorie</th>
                                    <th>Stock</th>
                                    <th>Prix</th>
                                    <th>Ventes</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {produitsFiltres.map(produit => (
                                    <tr key={produit.idProduit}>
                                        <td>
                                            <div className="produit-cell">
                                                <div className="produit-icon" style={{ background: produit.categorieCouleur || '#10b981' }}>
                                                    {produit.categorieIcon || '📦'}
                                                </div>
                                                <div className="produit-info">
                                                    <strong>{produit.nomProduit}</strong>
                                                    <small>ID: {produit.idProduit}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="categorie-badge" style={{ background: produit.categorieCouleur || '#10b981' }}>
                                                {produit.categorie}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="stock-indicator">
                                                <div className="stock-value">{produit.quantiteRestante} unités</div>
                                                <div className="stock-bar">
                                                    <div className={`bar-fill ${produit.quantiteRestante <= produit.alerteSeuil ? 'danger' : 'success'}`}
                                                        style={{ width: `${Math.min(100, (produit.quantiteRestante / (produit.alerteSeuil * 3)) * 100)}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="price-display">
                                                <div>Achat: <strong>€{produit.prixExact || 0}</strong></div>
                                                <div>Vente: <strong>€{produit.prixBoutique || 0}</strong></div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="ventes-info">
                                                <div>{produit.quantiteVendue || 0} ventes</div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${produit.quantiteRestante <= produit.alerteSeuil ? 'danger' : 'success'}`}>
                                                {produit.quantiteRestante <= produit.alerteSeuil ? 'Stock faible' : 'Stock bon'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="produit-actions">
                                                <button
                                                    className="btn-action add-to-cart"
                                                    onClick={() => ajouterProduitVente(produit)}
                                                    title="Ajouter à une vente"
                                                >
                                                    🛒
                                                </button>
                                                <button
                                                    className="btn-action edit"
                                                    onClick={() => handleEditProduit(produit)}
                                                    title="Modifier"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-action delete"
                                                    onClick={() => {
                                                        setSelectedProduit(produit);
                                                        setForceDelete(false);
                                                        setShowDeleteProduitModal(true);
                                                    }}
                                                    title="Supprimer"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Onglet Ventes */}
                {activeTab === 'ventes' && (
                    <div className="ventes-container">
                        <div className="ventes-stats">
                            <div className="vente-stat-card">
                                <div className="stat-icon">💰</div>
                                <div className="stat-content">
                                    <h3>Chiffre d'affaires</h3>
                                    <div className="stat-value">€{stats.totalCA || 0}</div>
                                </div>
                            </div>
                            <div className="vente-stat-card">
                                <div className="stat-icon">📊</div>
                                <div className="stat-content">
                                    <h3>Ventes totales</h3>
                                    <div className="stat-value">{stats.totalVentes || 0}</div>
                                </div>
                            </div>
                            <div className="vente-stat-card">
                                <div className="stat-icon">📅</div>
                                <div className="stat-content">
                                    <h3>Ventes aujourd'hui</h3>
                                    <div className="stat-value">{stats.ventesAujourdhui || 0}</div>
                                </div>
                            </div>
                        </div>

                        <div className="ventes-list">
                            <h3>Historique des ventes</h3>
                            <div className="ventes-table-container">
                                <table className="ventes-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Date</th>
                                            <th>Vendeur</th>
                                            <th>Produits</th>
                                            <th>Total</th>
                                            <th>Paiement</th>
                                            <th>Statut</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ventes.map(vente => (
                                            <tr key={vente.idVente}>
                                                <td className="vente-id">#{vente.idVente}</td>
                                                <td className="vente-date">{vente.dateFormatee}</td>
                                                <td className="vente-vendeur">{vente.vendeurNom}</td>
                                                <td className="vente-produits">
                                                    {vente.produitsDetails?.map((p, index) => (
                                                        <div key={index} className="produit-vente">
                                                            <span>{p.nomProduit}</span>
                                                            <small>{p.quantite} × €{p.prixUnitaire}</small>
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="vente-total">€{vente.totalVente}</td>
                                                <td className="vente-paiement">
                                                    <span className={`paiement-badge ${vente.typePaiement}`}>
                                                        {vente.typePaiement}
                                                    </span>
                                                </td>
                                                <td className="vente-statut">
                                                    <span className={`statut-badge ${vente.statut}`}>
                                                        {vente.statut}
                                                    </span>
                                                </td>
                                                <td className="vente-actions">
                                                    <div className="vente-action-buttons">
                                                        {vente.statut === 'completée' && (
                                                            <button className="btn-action cancel" onClick={() => handleAnnulerVente(vente)} title="Annuler cette vente">↩️</button>
                                                        )}
                                                        <button className="btn-action delete" onClick={() => {
                                                            setSelectedVente(vente);
                                                            setShowDeleteVenteModal(true);
                                                        }} title="Supprimer définitivement">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* Modal Catégorie */}
            {showCategorieModal && (
                <div className="modal-overlay">
                    <div className="modal modal-sm">
                        <div className="modal-header">
                            <h2>📂 Nouvelle catégorie</h2>
                            <button className="modal-close" onClick={() => setShowCategorieModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCategorieSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nom de la catégorie *</label>
                                    <input
                                        type="text"
                                        value={categorieForm.nom}
                                        onChange={(e) => setCategorieForm({ ...categorieForm, nom: e.target.value })}
                                        required
                                        placeholder="Alimentation, Boissons..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={categorieForm.description}
                                        onChange={(e) => setCategorieForm({ ...categorieForm, description: e.target.value })}
                                        rows="3"
                                        placeholder="Description de la catégorie..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Couleur</label>
                                    <input
                                        type="color"
                                        value={categorieForm.couleur}
                                        onChange={(e) => setCategorieForm({ ...categorieForm, couleur: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Icône</label>
                                    <select
                                        value={categorieForm.icon}
                                        onChange={(e) => setCategorieForm({ ...categorieForm, icon: e.target.value })}
                                    >
                                        <option value="🍎">🍎 Alimentation</option>
                                        <option value="🥤">🥤 Boissons</option>
                                        <option value="🥫">🥫 Conserves</option>
                                        <option value="🧴">🧴 Hygiène</option>
                                        <option value="🧹">🧹 Entretien</option>
                                        <option value="📦">📦 Divers</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCategorieModal(false)}>Annuler</button>
                                <button type="submit" className="btn btn-primary">Créer la catégorie</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Produit simplifié */}
            {showProduitModal && (
                <div className="modal-overlay">
                    <div className="modal modal-sm">
                        <div className="modal-header">
                            <h2>📦 Nouveau produit</h2>
                            <button className="modal-close" onClick={() => setShowProduitModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleProduitSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Catégorie *</label>
                                    <select
                                        value={produitForm.categorie}
                                        onChange={(e) => setProduitForm({ ...produitForm, categorie: e.target.value })}
                                        required
                                    >
                                        <option value="">Sélectionnez une catégorie</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.nom}>{cat.icon} {cat.nom}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Nom du produit *</label>
                                    <input
                                        type="text"
                                        value={produitForm.nomProduit}
                                        onChange={(e) => setProduitForm({ ...produitForm, nomProduit: e.target.value })}
                                        required
                                        placeholder="Ex: Riz Basmati 5kg"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Quantité initiale *</label>
                                    <input
                                        type="number"
                                        value={produitForm.quantiteInitiale}
                                        onChange={(e) => setProduitForm({ ...produitForm, quantiteInitiale: parseInt(e.target.value) || 1 })}
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="optional-section">
                                    <details className="optional-details">
                                        <summary>Options avancées (facultatif)</summary>
                                        <div className="optional-content">
                                            <div className="form-group">
                                                <label>Rebus (perte)</label>
                                                <input
                                                    type="number"
                                                    value={produitForm.rebus}
                                                    onChange={(e) => setProduitForm({ ...produitForm, rebus: parseInt(e.target.value) || 0 })}
                                                    min="0"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Prix d'achat (€)</label>
                                                <input
                                                    type="number"
                                                    value={produitForm.prixExact}
                                                    onChange={(e) => setProduitForm({ ...produitForm, prixExact: parseFloat(e.target.value) || 0 })}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Prix de vente (€)</label>
                                                <input
                                                    type="number"
                                                    value={produitForm.prixBoutique}
                                                    onChange={(e) => setProduitForm({ ...produitForm, prixBoutique: parseFloat(e.target.value) || 0 })}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowProduitModal(false)}>Annuler</button>
                                <button type="submit" className="btn btn-primary">Ajouter le produit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Vente */}
            {showVenteModal && (
                <div className="modal-overlay">
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <h2>🛒 Nouvelle vente</h2>
                            <button className="modal-close" onClick={() => setShowVenteModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleVenteSubmit}>
                            <div className="modal-body">
                                <div className="vente-container">
                                    <div className="produits-selection">
                                        <h3>Produits disponibles</h3>
                                        <div className="produits-grid">
                                            {produits.filter(p => p.quantiteRestante > 0).map(produit => (
                                                <div key={produit.idProduit} className="produit-card">
                                                    <div className="produit-info">
                                                        <div className="produit-details">
                                                            <strong>{produit.nomProduit}</strong>
                                                            <div className="produit-stock">Stock: {produit.quantiteRestante} unités</div>
                                                            <div className="produit-prix">€{produit.prixBoutique || 10}</div>
                                                        </div>
                                                    </div>
                                                    <div className="produit-actions">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={produit.quantiteRestante}
                                                            value={quantiteVente}
                                                            onChange={(e) => setQuantiteVente(parseInt(e.target.value) || 1)}
                                                            className="quantite-input"
                                                        />
                                                        <button type="button" className="btn btn-primary btn-sm" onClick={() => ajouterProduitVente(produit)}>
                                                            Ajouter
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="panier-section">
                                        <h3>Panier</h3>
                                        <div className="panier-content">
                                            {selectedProduitsVente.length === 0 ? (
                                                <div className="panier-vide">
                                                    <p>Aucun produit dans le panier</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="panier-items">
                                                        {selectedProduitsVente.map((produit, index) => (
                                                            <div key={index} className="panier-item">
                                                                <div className="item-info">
                                                                    <strong>{produit.nomProduit}</strong>
                                                                    <small>{produit.quantite} × €{produit.prixUnitaire}</small>
                                                                </div>
                                                                <div className="item-total">€{produit.prixTotal}</div>
                                                                <button type="button" className="btn-remove" onClick={() => supprimerProduitVente(produit.idProduit)}>×</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="panier-total">
                                                        <div className="total-row grand-total">
                                                            <span>Total:</span>
                                                            <span>€{selectedProduitsVente.reduce((sum, p) => sum + p.prixTotal, 0).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="paiement-section">
                                                        <label>Mode de paiement:</label>
                                                        <select
                                                            value={venteForm.typePaiement}
                                                            onChange={(e) => setVenteForm({ ...venteForm, typePaiement: e.target.value })}
                                                        >
                                                            <option value="espèces">Espèces</option>
                                                            <option value="carte">Carte bancaire</option>
                                                            <option value="mobile money">Mobile Money</option>
                                                        </select>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowVenteModal(false)}>Annuler</button>
                                <button type="submit" className="btn btn-primary" disabled={selectedProduitsVente.length === 0}>
                                    Enregistrer la vente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Suppression Catégorie */}
            {showDeleteModal && selectedItem && (
                <div className="modal-overlay">
                    <div className="modal modal-sm">
                        <div className="modal-header">
                            <h2>🗑️ Confirmation de suppression</h2>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-confirmation">
                                <div className="warning-icon">⚠️</div>
                                <div className="warning-content">
                                    <h3>Supprimer "{selectedItem.nom}" ?</h3>
                                    <p>Cette action est irréversible.</p>
                                    {selectedItem.nombreProduits > 0 && (
                                        <div className="warning-message">
                                            <strong>Attention:</strong> {selectedItem.nombreProduits} produit(s) utilisent cette catégorie.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Annuler</button>
                            <button type="button" className="btn btn-danger" onClick={handleDeleteCategorie} disabled={selectedItem.nombreProduits > 0}>
                                Supprimer définitivement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Suppression Produit */}
            {showDeleteProduitModal && selectedProduit && (
                <div className="modal-overlay">
                    <div className="modal modal-sm">
                        <div className="modal-header">
                            <h2>🗑️ Supprimer le produit</h2>
                            <button className="modal-close" onClick={() => { setShowDeleteProduitModal(false); setSelectedProduit(null); }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-confirmation">
                                <div className="warning-icon">⚠️</div>
                                <div className="warning-content">
                                    <h3>Supprimer "{selectedProduit.nomProduit}" ?</h3>
                                    {selectedProduit.quantiteVendue > 0 && !forceDelete && (
                                        <div className="warning-message">
                                            <strong>Attention:</strong> Ce produit a {selectedProduit.quantiteVendue} vente(s).
                                            <div className="force-delete-option">
                                                <label>
                                                    <input type="checkbox" checked={forceDelete} onChange={(e) => setForceDelete(e.target.checked)} />
                                                    Forcer la suppression (supprimera aussi les lignes dans les ventes)
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                    <p className="warning-text">Cette action est irréversible.</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteProduitModal(false); setSelectedProduit(null); }}>Annuler</button>
                            <button type="button" className="btn btn-danger" onClick={handleDeleteProduit}>
                                Supprimer définitivement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Suppression Vente */}
            {showDeleteVenteModal && selectedVente && (
                <div className="modal-overlay">
                    <div className="modal modal-sm">
                        <div className="modal-header">
                            <h2>🗑️ Supprimer la vente</h2>
                            <button className="modal-close" onClick={() => { setShowDeleteVenteModal(false); setSelectedVente(null); }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="delete-confirmation">
                                <div className="warning-icon">🚨</div>
                                <div className="warning-content">
                                    <h3>Vente #{selectedVente.idVente}</h3>
                                    <div className="vente-details">
                                        <div className="detail-item"><span>Date:</span><strong>{selectedVente.dateFormatee}</strong></div>
                                        <div className="detail-item"><span>Vendeur:</span><strong>{selectedVente.vendeurNom}</strong></div>
                                        <div className="detail-item"><span>Total:</span><strong className="vente-total-display">€{selectedVente.totalVente}</strong></div>
                                    </div>
                                    <p className="warning-text"><strong>ATTENTION:</strong> Cette action est irréversible.</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteVenteModal(false); setSelectedVente(null); }}>Annuler</button>
                            <button type="button" className="btn btn-danger" onClick={handleDeleteVente}>Supprimer définitivement</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Modifier Produit */}
{showEditProduitModal && editProduit && (
  <div className="modal-overlay">
    <div className="modal">
      <div className="modal-header">
        <h2>✏️ Modifier le produit</h2>
        <button 
          className="modal-close" 
          onClick={() => {
            setShowEditProduitModal(false);
            setEditProduit(null);
          }}
        >
          ×
        </button>
      </div>
      
      <form onSubmit={handleEditProduitSubmit}>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Catégorie *</label>
              <select
                value={editFormData.categorie}
                onChange={(e) => setEditFormData({...editFormData, categorie: e.target.value})}
                required
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.nom}>
                    {cat.icon} {cat.nom}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Nom du produit *</label>
              <input
                type="text"
                value={editFormData.nomProduit}
                onChange={(e) => setEditFormData({...editFormData, nomProduit: e.target.value})}
                required
                placeholder="Ex: Riz Basmati 5kg"
              />
            </div>
            
            <div className="form-group">
              <label>Quantité initiale *</label>
              <input
                type="number"
                value={editFormData.quantiteInitiale}
                onChange={(e) => setEditFormData({...editFormData, quantiteInitiale: parseInt(e.target.value) || 0})}
                min="1"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Rebus (perte)</label>
              <input
                type="number"
                value={editFormData.rebus}
                onChange={(e) => setEditFormData({...editFormData, rebus: parseInt(e.target.value) || 0})}
                min="0"
              />
              <small>Quantité perdue pendant le transport</small>
            </div>
            
            <div className="form-group">
              <label>Prix d'achat (€)</label>
              <input
                type="number"
                value={editFormData.prixExact}
                onChange={(e) => setEditFormData({...editFormData, prixExact: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label>Prix de vente (€)</label>
              <input
                type="number"
                value={editFormData.prixBoutique}
                onChange={(e) => setEditFormData({...editFormData, prixBoutique: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label>Seuil d'alerte stock</label>
              <input
                type="number"
                value={editFormData.alerteSeuil}
                onChange={(e) => setEditFormData({...editFormData, alerteSeuil: parseInt(e.target.value) || 10})}
                min="1"
              />
              <small>Alerte quand stock ≤ ce nombre</small>
            </div>
          </div>
          
          <div className="current-info">
            <h4>Informations actuelles</h4>
            <div className="info-grid">
              <div className="info-item">
                <span>Stock actuel:</span>
                <strong>{editProduit.quantiteRestante} unités</strong>
              </div>
              <div className="info-item">
                <span>Ventes totales:</span>
                <strong>{editProduit.quantiteVendue} unités</strong>
              </div>
              <div className="info-item">
                <span>Date d'ajout:</span>
                <strong>{editProduit.dateAjout}</strong>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setShowEditProduitModal(false);
              setEditProduit(null);
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="btn btn-primary"
          >
            Mettre à jour
          </button>
        </div>
      </form>
    </div>
  </div>
)}
        </div>
    );
};

export default GestionComplete;