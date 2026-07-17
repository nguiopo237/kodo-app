import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { produitService, venteService } from '../../services/dataService';
import FactureVente from '../../components/FactureVente';
import { genererCodeBarre } from '../../components/EtiquetteProduit';
import BarcodeScanner from '../../components/BarcodeScanner';
import './InterfaceVente.css';

const InterfaceVente = () => {
  const { user } = useAuth();
  const { success, error: showError } = useNotification();
  const [produits, setProduits] = useState([]);
  const [panier, setPanier] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [typePaiement, setTypePaiement] = useState('espèces');
  const [showFacture, setShowFacture] = useState(false);
  const [derniereVente, setDerniereVente] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    chargerProduits();
  }, []);

  const chargerProduits = () => {
    setLoading(true);
    const allProduits = produitService.getAll();
    // Filtrer les produits en stock
    const produitsDisponibles = allProduits.filter(p => p.quantiteRestante > 0);
    setProduits(produitsDisponibles);
    setLoading(false);
  };

  const ajouterAuPanier = (produit) => {
    const existant = panier.find(p => p.idProduit === produit.idProduit);
    
    if (existant) {
      if (existant.quantite + 1 > produit.quantiteRestante) {
        showError('❌ Stock insuffisant pour ce produit !');
        return;
      }
      setPanier(panier.map(p => 
        p.idProduit === produit.idProduit 
          ? { ...p, quantite: p.quantite + 1, prixTotal: (p.quantite + 1) * p.prixUnitaire }
          : p
      ));
    } else {
      setPanier([...panier, {
        idProduit: produit.idProduit,
        nomProduit: produit.nomProduit,
        quantite: 1,
        prixUnitaire: produit.prixBoutique,
        prixTotal: produit.prixBoutique,
        stockMax: produit.quantiteRestante
      }]);
    }
  };

  const supprimerDuPanier = (idProduit) => {
    setPanier(panier.filter(p => p.idProduit !== idProduit));
  };

  const modifierQuantite = (idProduit, delta) => {
    const produit = produits.find(p => p.idProduit === idProduit);
    setPanier(panier.map(p => {
      if (p.idProduit === idProduit) {
        const nouvelleQuantite = p.quantite + delta;
        if (nouvelleQuantite < 1) return p;
        if (produit && nouvelleQuantite > produit.quantiteRestante) {
          showError('❌ Stock insuffisant pour ce produit !');
          return p;
        }
        return { ...p, quantite: nouvelleQuantite, prixTotal: nouvelleQuantite * p.prixUnitaire };
      }
      return p;
    }));
  };

  const totalPanier = panier.reduce((sum, p) => sum + p.prixTotal, 0);

  const finaliserVente = () => {
    if (panier.length === 0) {
      showError('❌ Le panier est vide. Ajoutez des produits avant de finaliser.');
      return;
    }

    if (!window.confirm(`Confirmer la vente de ${formatCFA(totalPanier)} ?`)) {
      return;
    }

    try {
      // Créer la vente
      const nouvelleVente = venteService.create({
        idVendeur: user.idUser,
        produitsVendus: panier.map(p => ({
          idProduit: p.idProduit,
          nomProduit: p.nomProduit,
          quantite: p.quantite,
          prixUnitaire: p.prixUnitaire,
          prixTotal: p.prixTotal
        })),
        totalVente: totalPanier,
        typePaiement: typePaiement,
        statut: 'completée',
        date: new Date().toISOString()
      });

      // Mettre à jour le stock
      panier.forEach(item => {
        const produit = produitService.getById(item.idProduit);
        if (produit) {
          produit.quantiteRestante -= item.quantite;
          produit.quantiteVendue += item.quantite;
          produitService.update(item.idProduit, produit);
        }
      });

      const panierData = [...panier];
      setPanier([]);
      chargerProduits();

      // Préparer les données pour la facture
      setDerniereVente({
        ...nouvelleVente,
        produitsVendus: panierData.map(p => ({
          idProduit: p.idProduit,
          nomProduit: p.nomProduit,
          quantite: p.quantite,
          prixUnitaire: p.prixUnitaire,
          prixTotal: p.prixTotal
        }))
      });
      setShowFacture(true);
      success('✅ Vente enregistrée avec succès !');
    } catch (error) {
      showError('❌ ' + error.message);
    }
  };

  // ============================================
  // SCAN CODE-BARRES
  // ============================================
  const handleScanDetect = (codeBarre) => {
    setShowScanner(false);

    // Chercher le produit par code-barres exact
    let produit = produits.find(p => p.codeBarre === codeBarre);

    // Essayer avec le format KODO-XXXX
    if (!produit) {
      const codeFormate = codeBarre.startsWith('KODO-')
        ? codeBarre
        : 'KODO-' + String(codeBarre).padStart(4, '0');
      produit = produits.find(p => p.codeBarre === codeFormate);
    }

    // Essayer avec ID simple
    if (!produit && /^\\d+$/.test(codeBarre)) {
      const id = parseInt(codeBarre, 10);
      produit = produits.find(p => p.idProduit === id || genererCodeBarre(p.idProduit) === codeBarre);
    }

    if (produit) {
      ajouterAuPanier(produit);
      setSearchTerm('');
      success('✅ Produit ajoute : ' + produit.nomProduit);
    } else {
      showError('❌ Aucun produit trouve avec ce code-barres : ' + codeBarre);
    }
  };

  const formatCFA = (montant) => {
    if (!montant && montant !== 0) return '0 FCFA';
    return `${montant.toLocaleString('fr-FR')} FCFA`;
  };

  const produitsFiltres = produits.filter(produit =>
    produit.nomProduit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produit.categorie.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (produit.codeBarre && produit.codeBarre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des produits...</p>
      </div>
    );
  }

  return (
    <div className="interface-vente">
      <div className="page-header">
        <h1>🛒 Nouvelle vente</h1>
        <p>Vendeur : {user?.nomComplet}</p>
      </div>

      <div className="vente-container">
        {/* Colonne gauche - Produits */}
        <div className="produits-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn-scanner" onClick={() => setShowScanner(true)} title="Scanner un code-barres">
              📷 Scanner
            </button>
          </div>

          <div className="produits-grid">
            {produitsFiltres.map(produit => (
              <div key={produit.idProduit} className="produit-card">
                <div className="produit-info">
                  <h3>{produit.nomProduit}</h3>
                  <span className="categorie">{produit.categorie}</span>
                  <div className="prix">{formatCFA(produit.prixBoutique)}</div>
                  <div className="stock">Stock: {produit.quantiteRestante}</div>
                </div>
                <button 
                  className="btn-add"
                  onClick={() => ajouterAuPanier(produit)}
                  disabled={produit.quantiteRestante <= 0}
                >
                  ➕ Ajouter
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne droite - Panier */}
        <div className="panier-section">
          <h2>🛒 Panier</h2>
          <div className="panier-content">
            {panier.length === 0 ? (
              <div className="panier-vide">
                <p>Votre panier est vide</p>
              </div>
            ) : (
              <>
                <div className="panier-items">
                  {panier.map((item, index) => (
                    <div key={index} className="panier-item">
                      <div className="item-info">
                        <div className="item-nom">{item.nomProduit}</div>
                        <div className="item-prix">{formatCFA(item.prixUnitaire)}</div>
                      </div>
                      <div className="item-quantite">
                        <button onClick={() => modifierQuantite(item.idProduit, -1)}>-</button>
                        <span>{item.quantite}</span>
                        <button onClick={() => modifierQuantite(item.idProduit, 1)}>+</button>
                      </div>
                      <div className="item-total">{formatCFA(item.prixTotal)}</div>
                      <button className="btn-remove" onClick={() => supprimerDuPanier(item.idProduit)}>×</button>
                    </div>
                  ))}
                </div>

                <div className="panier-footer">
                  <div className="panier-total">
                    <span>Total</span>
                    <span className="total-valeur">{formatCFA(totalPanier)}</span>
                  </div>

                  <div className="paiement-section">
                    <select value={typePaiement} onChange={(e) => setTypePaiement(e.target.value)}>
                      <option value="espèces">💵 Espèces</option>
                      <option value="carte">💳 Carte</option>
                      <option value="mobile money">📱 Mobile Money</option>
                      <option value="chèque">📝 Chèque</option>
                    </select>
                  </div>

                  <button className="btn-finaliser" onClick={finaliserVente}>
                    💾 Finaliser la vente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scanner code-barres */}
      {showScanner && (
        <BarcodeScanner
          onDetect={handleScanDetect}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Modal Facture */}
      {showFacture && derniereVente && (
        <FactureVente 
          vente={derniereVente}
          utilisateur={user}
          onFermer={() => {
            setShowFacture(false);
            setDerniereVente(null);
          }}
        />
      )}
    </div>
  );
};

export default InterfaceVente;