import { initialData } from '../data/initialData';
import { loadAllData, saveField, saveAllData, clearCache } from './firebaseService';

// Cache mémoire pour les accès synchrones
let memoryCache = null;
let initPromise = null;

// Clés système qui ne sont pas dans initialData mais persistées séparément
const SYSTEM_KEYS = ['roles_permissions_overrides', 'roles_config'];

/**
 * Initialiser le cache depuis Firestore (appelé au démarrage de l'app)
 */
export const initFromFirestore = async () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Charger depuis Firestore
      const firestoreData = await loadAllData();

      // Si Firestore a des données, les utiliser
      if (firestoreData && Object.keys(firestoreData).length > 0) {
        memoryCache = { ...firestoreData };  
        console.log('✅ Données chargées depuis Firestore');
        return;
      }

      // Sinon, charger depuis localStorage (migration) ou initialData
      console.log('Firestore vide, migration depuis localStorage...');
      const localData = loadFromLocalStorage();
      
      if (localData && Object.keys(localData).length > 0) {
        memoryCache = { ...localData };
        await saveAllData(localData);
        console.log('✅ Données migrées vers Firestore');
      } else {
        // Première utilisation : charger les données initiales
        memoryCache = {};
        const allKeys = [...Object.keys(initialData), 'categories'];
        allKeys.forEach(key => {
          if (initialData[key]) {
            memoryCache[key] = JSON.parse(JSON.stringify(initialData[key]));
          }
        });
        await saveAllData(memoryCache);
        console.log('✅ Données initiales chargées dans Firestore');
      }
    } catch (error) {
      console.warn('Erreur init Firestore, fallback localStorage:', error.message);
      memoryCache = loadFromLocalStorage();
    }
  })();

  return initPromise;
};

/**
 * Charger depuis localStorage (fallback et migration)
 */
const loadFromLocalStorage = () => {
  const data = {};
  const allKeys = [...Object.keys(initialData), 'categories', ...SYSTEM_KEYS];
  allKeys.forEach(key => {
    const stored = localStorage.getItem(`kodomarket_${key}`);
    if (stored) {
      try {
        data[key] = JSON.parse(stored);
      } catch (e) {
        data[key] = initialData[key] || [];
      }
    }
  });
  return data;
};

export const dashboardService = {
  getStats: () => {
    const data = memoryCache || loadFromLocalStorage();
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
    const data = memoryCache || loadFromLocalStorage();
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
    const data = memoryCache || loadFromLocalStorage();
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
    const data = memoryCache || loadFromLocalStorage();
    const stock = data.stock || [];
    const produits = data.produits || [];
    const transport = data.transport || [];
    const ventes = data.ventes || [];
    const alertes = [];
    const today = new Date();

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

  getAllKeys: () => {
    return [...Object.keys(initialData), 'categories', ...SYSTEM_KEYS];
  },

  /**
   * Initialiser les données (async - Firestore)
   */
  initializeData: async (force = false) => {
    if (!memoryCache || force) {
      memoryCache = {};
      const allKeys = dashboardService.getAllKeys();
      allKeys.forEach(key => {
        if (initialData[key]) {
          memoryCache[key] = JSON.parse(JSON.stringify(initialData[key]));
        }
      });
      await saveAllData(memoryCache);
      console.log('✅ Données initialisées dans Firestore');
    }
  },

  /**
   * Charger les données (synchrone) - utilise le cache mémoire
   */
  loadData: () => {
    return memoryCache ? { ...memoryCache } : loadFromLocalStorage();
  },

  /**
   * Sauvegarder une clé (async - Firestore) + cache mémoire
   */
  saveData: async (key, data) => {
    // Mettre à jour le cache mémoire
    if (memoryCache) {
      memoryCache[key] = data;
    }

    // Sauvegarder dans Firestore (async)
    try {
      await saveField(key, data);
    } catch (error) {
      console.warn('Erreur sauvegarde Firestore:', error.message);
      // Fallback localStorage
      localStorage.setItem(`kodomarket_${key}`, JSON.stringify(data));
    }
  },

  /**
   * Réinitialiser les données (Firestore + cache)
   */
  resetData: async () => {
    clearCache();
    memoryCache = null;
    
    // Nettoyer localStorage
    const keys = ['utilisateurs', 'produits', 'stock', 'ventes', 'transport', 'depenses', ...SYSTEM_KEYS];
    keys.forEach(key => {
      localStorage.removeItem(`kodomarket_${key}`);
    });
    localStorage.removeItem('kodomarket_user');

    // Réinitialiser avec les données initiales
    await dashboardService.initializeData(true);
    return true;
  },

  /**
   * Rafraîchir le cache depuis Firestore
   */
  refreshCache: async () => {
    try {
      const firestoreData = await loadAllData();
      if (firestoreData && Object.keys(firestoreData).length > 0) {
        memoryCache = { ...firestoreData };
      }
      return memoryCache ? { ...memoryCache } : {};
    } catch (error) {
      console.warn('Erreur refresh Firestore:', error.message);
      return memoryCache ? { ...memoryCache } : {};
    }
  }
};