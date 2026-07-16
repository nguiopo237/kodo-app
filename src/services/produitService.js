import { dashboardService } from './dashboardService';
import { categorieService } from './categorieService';

export const produitService = {
  getProduits: () => {
    const data = dashboardService.loadData();
    const produits = data.produits || [];
    const stock = data.stock || [];
    const categories = categorieService.getCategories();

    return produits.map(produit => {
      const stockInfo = stock.find(s => s.idProduit === produit.idProduit);
      const categorieInfo = categories.find(c => c.nom === produit.categorie);
      return {
        ...produit,
        quantiteRestante: stockInfo?.quantiteRestante || 0,
        quantiteVendue: stockInfo?.quantiteVendue || 0,
        alerteSeuil: stockInfo?.alerteSeuil || 10,
        dateDerniereMaj: stockInfo?.dateDerniereMaj,
        categorieCouleur: categorieInfo?.couleur || '#10b981',
        categorieIcon: categorieInfo?.icon || '📦'
      };
    });
  },

  getProduitById: (idProduit) => {
    const produits = produitService.getProduits();
    return produits.find(p => p.idProduit === idProduit);
  },

  ajouterProduit: (produitData) => {
    const data = dashboardService.loadData();
    const categories = categorieService.getCategories();
    const categorieExiste = categories.some(c => c.nom === produitData.categorie);

    if (!categorieExiste) {
      throw new Error('Cette catégorie n\'existe pas. Veuillez d\'abord créer la catégorie.');
    }

    const newId = Math.max(...(data.produits || []).map(p => p.idProduit), 0) + 1;

    const defaults = {
      quantiteInitiale: 1,
      rebus: 0,
      quantiteExacte: 0,
      prixExact: 0,
      prixBoutique: 0,
      dateAjout: new Date().toISOString().split('T')[0],
      ajoutePar: 1,
      alerteSeuil: 10
    };

    const nouveauProduit = {
      ...defaults,
      ...produitData,
      idProduit: newId,
      quantiteExacte: produitData.quantiteExacte || (produitData.quantiteInitiale - (produitData.rebus || 0))
    };

    if (!nouveauProduit.prixExact && !nouveauProduit.prixBoutique) {
      nouveauProduit.prixExact = 0;
      nouveauProduit.prixBoutique = 0;
    } else if (!nouveauProduit.prixExact && nouveauProduit.prixBoutique) {
      nouveauProduit.prixExact = nouveauProduit.prixBoutique * 0.7;
    } else if (nouveauProduit.prixExact && !nouveauProduit.prixBoutique) {
      nouveauProduit.prixBoutique = nouveauProduit.prixExact * 1.3;
    }

    data.produits = data.produits || [];
    data.produits.push(nouveauProduit);

    const newStockId = Math.max(...(data.stock || []).map(s => s.id), 0) + 1;
    data.stock = data.stock || [];
    data.stock.push({
      id: newStockId,
      idProduit: newId,
      quantiteRestante: nouveauProduit.quantiteExacte,
      quantiteVendue: 0,
      dateDerniereMaj: new Date().toISOString().split('T')[0],
      alerteSeuil: produitData.alerteSeuil || 10
    });

    dashboardService.saveData('produits', data.produits);
    dashboardService.saveData('stock', data.stock);

    return nouveauProduit;
  },

  mettreAJourProduit: (idProduit, updates) => {
    const data = dashboardService.loadData();
    const produits = data.produits || [];
    const index = produits.findIndex(p => p.idProduit === idProduit);

    if (index !== -1) {
      if (updates.categorie) {
        const categories = categorieService.getCategories();
        const categorieExiste = categories.some(c => c.nom === updates.categorie);
        if (!categorieExiste) {
          throw new Error('Cette catégorie n\'existe pas.');
        }
      }

      produits[index] = { ...produits[index], ...updates };

      if (updates.quantiteExacte !== undefined) {
        const stockIndex = (data.stock || []).findIndex(s => s.idProduit === idProduit);
        if (stockIndex !== -1) {
          const difference = updates.quantiteExacte - produits[index].quantiteExacte;
          data.stock[stockIndex].quantiteRestante += difference;
          data.stock[stockIndex].dateDerniereMaj = new Date().toISOString().split('T')[0];
        }
      }

      dashboardService.saveData('produits', produits);
      dashboardService.saveData('stock', data.stock);

      return produits[index];
    }
    return null;
  },

  supprimerProduit: (idProduit, force = false) => {
    const data = dashboardService.loadData();
    const produits = data.produits || [];
    const ventes = data.ventes || [];
    const stock = data.stock || [];

    const ventesAssociees = ventes.filter(v =>
      v.produitsVendus.some(p => p.idProduit === idProduit)
    );

    if (ventesAssociees.length > 0 && !force) {
      throw new Error(`Ce produit a ${ventesAssociees.length} vente(s) associée(s). Souhaitez-vous forcer la suppression ?`);
    }

    if (force && ventesAssociees.length > 0) {
      ventes.forEach(vente => {
        vente.produitsVendus = vente.produitsVendus.filter(p => p.idProduit !== idProduit);
        vente.totalVente = vente.produitsVendus.reduce((sum, p) => sum + p.prixTotal, 0);
      });
      data.ventes = ventes.filter(v => v.produitsVendus.length > 0);
    }

    data.produits = produits.filter(p => p.idProduit !== idProduit);
    data.stock = stock.filter(s => s.idProduit !== idProduit);

    dashboardService.saveData('produits', data.produits);
    dashboardService.saveData('stock', data.stock);
    if (force) {
      dashboardService.saveData('ventes', data.ventes);
    }

    return true;
  },

  mettreAJourSeuil: (idProduit, seuil) => {
    const data = dashboardService.loadData();
    const stockIndex = (data.stock || []).findIndex(s => s.idProduit === idProduit);

    if (stockIndex !== -1) {
      data.stock[stockIndex].alerteSeuil = seuil;
      data.stock[stockIndex].dateDerniereMaj = new Date().toISOString().split('T')[0];
      dashboardService.saveData('stock', data.stock);
      return true;
    }
    return false;
  },

  getCategories: () => {
    return categorieService.getCategories().map(c => c.nom);
  },

  filtrerProduits: (filters) => {
    let produits = produitService.getProduits();

    if (filters.categorie) {
      produits = produits.filter(p => p.categorie === filters.categorie);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      produits = produits.filter(p =>
        p.nomProduit.toLowerCase().includes(searchLower) ||
        p.categorie.toLowerCase().includes(searchLower)
      );
    }

    if (filters.stockFaible) {
      produits = produits.filter(p => p.quantiteRestante <= p.alerteSeuil);
    }

    return produits;
  }
};