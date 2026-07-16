import React, { useState, useEffect } from 'react';
import { produitService } from '../../services/dataService';
import './GestionProduits.css';

const GestionProduits = () => {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    categorie: '',
    nomProduit: '',
    quantiteInitiale: 1,
    rebus: 0,
    prixExact: 0,
    prixBoutique: 0,
    alerteSeuil: 10,
    quantiteRestante: 0
  });

  useEffect(() => {
    chargerProduits();
  }, []);

  const chargerProduits = () => {
    setLoading(true);
    const allProduits = produitService.getAll();
    setProduits(allProduits);
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const quantiteExacte = formData.quantiteInitiale - formData.rebus;
    
    try {
      produitService.create({
        categorie: formData.categorie,
        nomProduit: formData.nomProduit,
        quantiteInitiale: formData.quantiteInitiale,
        rebus: formData.rebus || 0,
        quantiteExacte: quantiteExacte,
        prixExact: formData.prixExact || 0,
        prixBoutique: formData.prixBoutique || 0,
        alerteSeuil: formData.alerteSeuil || 10,
        quantiteRestante: quantiteExacte,
        quantiteVendue: 0,
        dateAjout: new Date().toISOString().split('T')[0],
        ajoutePar: 1
      });
      
      setShowModal(false);
      setFormData({
        categorie: '',
        nomProduit: '',
        quantiteInitiale: 1,
        rebus: 0,
        prixExact: 0,
        prixBoutique: 0,
        alerteSeuil: 10,
        quantiteRestante: 0
      });
      
      chargerProduits();
      alert('✅ Produit ajouté avec succès !');
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce produit ?')) {
      produitService.delete(id);
      chargerProduits();
      alert('Produit supprimé');
    }
  };

  const produitsFiltres = produits.filter(produit =>
    produit.nomProduit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produit.categorie.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCFA = (montant) => {
    if (!montant && montant !== 0) return '0 FCFA';
    return `${montant.toLocaleString('fr-FR')} FCFA`;
  };

  if (loading) {
    return <div className="loading">Chargement des produits...</div>;
  }

  return (
    <div className="gestion-produits">
      <div className="page-header">
        <h1>📦 Gestion des produits</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Nouveau produit
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tableau des produits */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Stock</th>
              <th>Prix</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {produitsFiltres.map(produit => (
              <tr key={produit.idProduit}>
                <td>
                  <strong>{produit.nomProduit}</strong>
                </td>
                <td>{produit.categorie}</td>
                <td>
                  <span className={produit.quantiteRestante <= produit.alerteSeuil ? 'stock-faible' : 'stock-bon'}>
                    {produit.quantiteRestante} unités
                  </span>
                </td>
                <td>{formatCFA(produit.prixBoutique)}</td>
                <td>
                  <button className="btn-edit">✏️</button>
                  <button className="btn-delete" onClick={() => handleDelete(produit.idProduit)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Ajout */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>➕ Nouveau produit</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="categorie"
                value={formData.categorie}
                onChange={handleInputChange}
                placeholder="Catégorie"
                required
              />
              <input
                type="text"
                name="nomProduit"
                value={formData.nomProduit}
                onChange={handleInputChange}
                placeholder="Nom du produit"
                required
              />
              <input
                type="number"
                name="quantiteInitiale"
                value={formData.quantiteInitiale}
                onChange={handleInputChange}
                placeholder="Quantité initiale"
                required
              />
              <input
                type="number"
                name="prixExact"
                value={formData.prixExact}
                onChange={handleInputChange}
                placeholder="Prix d'achat"
                step="100"
              />
              <input
                type="number"
                name="prixBoutique"
                value={formData.prixBoutique}
                onChange={handleInputChange}
                placeholder="Prix de vente"
                step="100"
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionProduits;