import { initialData } from '../data/initialData';

export const dashboardService = {
  getStats: () => {
    const data = dashboardService.loadData();
    const ventes = data.ventes || [];
    const produits = data.produits || [];
    const stock = data.stock || [];
    const depenses = data.depenses || [];
    const transport = data.transport || [];

    const chiffreAffaires = ventes.reduce((sum, v) => sum + v.totalVente, 0);
    const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);
    const totalTransport = transport.reduce((sum, t) => sum + t.coutTransport, 0);
    const benefices = chiffreAffaires - totalDepenses - totalTransport;
    const ventesCeMois = ventes.length;
    const totalStock = stock.reduce((sum, s) => sum + s.quantiteRestante, 0);
    const produitsFaibleStock = stock.filter(s => s.quantiteRestante <= s.alerteSeuil).length;
    const envoisEnCours = transport.filter(t => t.statut === 'en transit' || t.statut === 'préparation').length;

    return {
      chiffreAffaires: { 
        total: `${chiffreAffaires.toLocaleString('fr-FR')} FCFA`, 
        variation: '+12.5%', 
        direction: 'up' 
      },
      ventesMensuelles: { 
        total: ventesCeMois.toString(), 
        variation: '+8.2%', 
        direction: 'up' 
      },
      benefices: { 
        total: `${benefices.toLocaleString('fr-FR')} FCFA`, 
        variation: '+15.3%', 
        direction: 'up' 
      },
      produitsStock: { 
        total: totalStock.toString(), 
        variation: '-3.1%', 
        direction: 'down' 
      },
      produitsFaibleStock: { 
        total: produitsFaibleStock.toString(), 
        variation: `+${produitsFaibleStock}`, 
        direction: 'up' 
      },
      envoisEnCours: { 
        total: envoisEnCours.toString(), 
        variation: `${transport.filter(t => t.statut === 'en transit').length} en transit`, 
        direction: 'warning' 
      }
    };
  },

  getVentesRecent: () => {
    const data = dashboardService.loadData();
    const ventes = data.ventes || [];
    const utilisateurs = data.utilisateurs || [];
    const produits = data.produits || [];

    return ventes.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(vente => {
      const vendeur = utilisateurs.find(u => u.idUser === vente.idVendeur);
      const produitPrincipal = vente.produitsVendus[0];
      const produit = produits.find(p => p.idProduit === produitPrincipal?.idProduit);
      return {
        id: vente.idVente,
        produit: produit?.nomProduit || 'Produit',
        quantite: produitPrincipal?.quantite || 0,
        montant: vente.totalVente,
        montantFormate: `${vente.totalVente.toLocaleString('fr-FR')} FCFA`,
        date: new Date(vente.date).toLocaleDateString('fr-FR'),
        vendeur: vendeur?.nomComplet || 'Vendeur'
      };
    });
  },

  getProduitsPopulaires: () => {
    const data = dashboardService.loadData();
    const ventes = data.ventes || [];
    const produits = data.produits || [];
    const stock = data.stock || [];

    const ventesParProduit = {};
    ventes.forEach(vente => {
      vente.produitsVendus.forEach(item => {
        if (!ventesParProduit[item.idProduit]) {
          ventesParProduit[item.idProduit] = 0;
        }
        ventesParProduit[item.idProduit] += item.quantite;
      });
    });

    return Object.entries(ventesParProduit).sort(([, a], [, b]) => b - a).slice(0, 5).map(([idProduit, ventes]) => {
      const produit = produits.find(p => p.idProduit === parseInt(idProduit));
      const stockItem = stock.find(s => s.idProduit === parseInt(idProduit));
      return {
        id: parseInt(idProduit),
        nom: produit?.nomProduit || 'Produit',
        ventes: ventes,
        stock: stockItem?.quantiteRestante || 0,
        categorie: produit?.categorie || 'Non catégorisé'
      };
    });
  },

  getAlertes: () => {
    const data = dashboardService.loadData();
    const stock = data.stock || [];
    const produits = data.produits || [];
    const transport = data.transport || [];
    const ventes = data.ventes || [];
    const alertes = [];
    const today = new Date();

    // Alertes de stock faible
    stock.forEach(item => {
      if (item.quantiteRestante <= item.alerteSeuil) {
        const produit = produits.find(p => p.idProduit === item.idProduit);
        alertes.push({
          id: `stock-${item.id}`,
          type: 'stock',
          message: `${produit?.nomProduit || 'Produit'} - Stock faible (${item.quantiteRestante} unités)`,
          niveau: item.quantiteRestante <= 10 ? 'high' : 'medium'
        });
      }
    });

    // Alertes de transport en retard
    transport.forEach(envoi => {
      if (envoi.statut === 'en transit' && envoi.dateReception) {
        const dateReception = new Date(envoi.dateReception);
        if (dateReception < today) {
          const joursRetard = Math.floor((today - dateReception) / (1000 * 60 * 60 * 24));
          alertes.push({
            id: `transport-${envoi.idEnvoi}`,
            type: 'transport',
            message: `Envoi #TR-${envoi.idEnvoi.toString().padStart(3, '0')} en retard de ${joursRetard} jours`,
            niveau: joursRetard > 3 ? 'high' : 'medium'
          });
        }
      }
    });

    // Alerte de record de ventes - CORRECTION ICI
    const hier = new Date(today.getTime() - 86400000);
    const ventesHier = ventes.filter(v => {
      const dateVente = new Date(v.date);
      return dateVente.toDateString() === hier.toDateString();
    });
    const ventesHierCount = ventesHier.length;

    if (ventesHierCount > 3) {
      const caHier = ventesHier.reduce((sum, v) => sum + v.totalVente, 0);
      alertes.push({
        id: 'record-ventes',
        type: 'vente',
        message: `Record de ventes hier (${ventesHierCount} ventes, ${caHier.toLocaleString('fr-FR')} FCFA)`,
        niveau: 'info'
      });
    }

    return alertes.slice(0, 4);
  },

  // Liste de toutes les clés de données (pour loadData et initializeData)
  getAllKeys: () => {
    return [...Object.keys(initialData), 'categories'];
  },

  initializeData: (force = false) => {
    if (force || !localStorage.getItem('kodomarket_data_initialized')) {
      const allKeys = dashboardService.getAllKeys();
      allKeys.forEach(key => {
        localStorage.removeItem(`kodomarket_${key}`);
      });
      allKeys.forEach(key => {
        if (initialData[key]) {
          localStorage.setItem(`kodomarket_${key}`, JSON.stringify(initialData[key]));
        }
      });
      localStorage.setItem('kodomarket_data_initialized', 'true');
      console.log('Données initialisées avec succès');
    }
  },

  loadData: () => {
    const data = {};
    const allKeys = dashboardService.getAllKeys();
    allKeys.forEach(key => {
      const stored = localStorage.getItem(`kodomarket_${key}`);
      data[key] = stored ? JSON.parse(stored) : (initialData[key] || []);
    });
    return data;
  },

  saveData: (key, data) => {
    localStorage.setItem(`kodomarket_${key}`, JSON.stringify(data));
  },

  resetData: () => {
    return new Promise((resolve) => {
      const keys = [
        'kodomarket_data_initialized',
        'kodomarket_utilisateurs',
        'kodomarket_produits',
        'kodomarket_stock',
        'kodomarket_ventes',
        'kodomarket_transport',
        'kodomarket_depenses',
        'kodomarket_user'
      ];
      keys.forEach(key => localStorage.removeItem(key));
      dashboardService.initializeData(true);
      resolve();
    });
  }
};