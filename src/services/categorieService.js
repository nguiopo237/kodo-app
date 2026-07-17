import { dashboardService } from './dashboardService';

export const categorieService = {
  getCategories: () => {
    const data = dashboardService.loadData();
    const stored = data.categories;
    if (stored && stored.length > 0) {
      return [...stored];
    }

    const defaultCategories = [
      { id: 1, nom: 'Alimentation', description: 'Produits alimentaires', couleur: '#10b981', icon: '🍎' },
      { id: 2, nom: 'Boissons', description: 'Boissons et jus', couleur: '#3b82f6', icon: '🥤' },
      { id: 3, nom: 'Conserves', description: 'Produits en conserve', couleur: '#f59e0b', icon: '🥫' },
      { id: 4, nom: 'Hygiène', description: 'Produits d\'hygiène', couleur: '#8b5cf6', icon: '🧴' },
      { id: 5, nom: 'Entretien', description: 'Produits d\'entretien', couleur: '#6366f1', icon: '🧹' }
    ];

    // Sauvegarder les catégories par défaut via dashboardService (Firestore)
    dashboardService.saveData('categories', defaultCategories);
    return defaultCategories;
  },

  ajouterCategorie: async (categorieData) => {
    const categories = categorieService.getCategories();
    const newId = Math.max(...categories.map(c => c.id), 0) + 1;

    const nouvelleCategorie = {
      id: newId,
      ...categorieData,
      dateCreation: new Date().toISOString().split('T')[0]
    };

    categories.push(nouvelleCategorie);
    await dashboardService.saveData('categories', categories);

    return nouvelleCategorie;
  },

  mettreAJourCategorie: async (id, updates) => {
    const categories = categorieService.getCategories();
    const index = categories.findIndex(c => c.id === id);

    if (index !== -1) {
      categories[index] = { ...categories[index], ...updates };
      await dashboardService.saveData('categories', categories);
      return categories[index];
    }

    return null;
  },

  supprimerCategorie: async (id) => {
    const categories = categorieService.getCategories();
    const data = dashboardService.loadData();
    const produits = data.produits || [];

    const categorie = categories.find(c => c.id === id);
    const produitsDansCategorie = produits.filter(p => p.categorie === categorie?.nom);

    if (produitsDansCategorie.length > 0) {
      throw new Error(`Impossible de supprimer : ${produitsDansCategorie.length} produit(s) utilisent cette catégorie`);
    }

    const nouvellesCategories = categories.filter(c => c.id !== id);
    await dashboardService.saveData('categories', nouvellesCategories);

    return true;
  },

  getStatsParCategorie: () => {
    const categories = categorieService.getCategories();
    const data = dashboardService.loadData();
    const produits = data.produits || [];
    const ventes = data.ventes || [];

    return categories.map(categorie => {
      const produitsCategorie = produits.filter(p => p.categorie === categorie.nom);
      const ventesCategorie = ventes.filter(v =>
        (v.produitsVendus || []).some(p =>
          produitsCategorie.some(prod => prod.idProduit === p.idProduit)
        )
      );

      const totalVentes = ventesCategorie.reduce((sum, v) =>
        sum + (v.produitsVendus || []).reduce((s, p) => s + p.quantite, 0), 0
      );

      const totalCA = ventesCategorie.reduce((sum, v) =>
        sum + v.totalVente, 0
      );

      return {
        ...categorie,
        nombreProduits: produitsCategorie.length,
        nombreVentes: ventesCategorie.length,
        totalVentes,
        chiffreAffaires: totalCA
      };
    });
  }
};