import { dashboardService } from './dashboardService';

// ============================================
// FONCTIONS INTERNES (persistance via Système B)
// ============================================

// Récupérer une table depuis le Système B
// Les produits sont enrichis avec les données de stock pour compatibilité
const getTableData = (tableName) => {
    const data = dashboardService.loadData();
    let items = data[tableName] || [];

    // Enrichir les produits avec les infos de stock (backward compat)
    if (tableName === 'produits') {
        const stock = data.stock || [];
        items = items.map(produit => {
            const stockInfo = stock.find(s => s.idProduit === produit.idProduit);
            return {
                ...produit,
                quantiteRestante: stockInfo?.quantiteRestante || 0,
                quantiteVendue: stockInfo?.quantiteVendue || 0,
                alerteSeuil: stockInfo?.alerteSeuil || 10,
            };
        });
    }

    return items;
};

// Sauvegarder une table dans le Système B
const saveTableData = (tableName, items) => {
    const data = dashboardService.loadData();
    data[tableName] = items;

    // Quand on sauvegarde les produits, on met aussi à jour le stock
    if (tableName === 'produits') {
        const stock = items.map(produit => ({
            id: produit.idProduit,
            idProduit: produit.idProduit,
            quantiteRestante: produit.quantiteRestante || 0,
            quantiteVendue: produit.quantiteVendue || 0,
            dateDerniereMaj: new Date().toISOString().split('T')[0],
            alerteSeuil: produit.alerteSeuil || 10,
        }));
        data.stock = stock;
        dashboardService.saveData('stock', data.stock);
    }

    dashboardService.saveData(tableName, data[tableName]);
};

// Générer un ID
const generateId = (tableName) => {
    const data = dashboardService.loadData();
    const items = data[tableName] || [];
    
    const idField = tableName === 'utilisateurs' ? 'idUser' :
                   tableName === 'produits' ? 'idProduit' :
                   tableName === 'ventes' ? 'idVente' :
                   tableName === 'transport' ? 'idEnvoi' :
                   tableName === 'depenses' ? 'idDepense' :
                   tableName === 'charges' ? 'idCharge' :
                   tableName === 'categories' ? 'id' : 'id';
    
    const maxId = Math.max(...items.map(item => item[idField] || 0), 0);
    return maxId + 1;
};

// Obtenir le champ ID pour une table
const getIdField = (tableName) => {
    return tableName === 'utilisateurs' ? 'idUser' :
           tableName === 'produits' ? 'idProduit' :
           tableName === 'ventes' ? 'idVente' :
           tableName === 'transport' ? 'idEnvoi' :
           tableName === 'depenses' ? 'idDepense' :
           tableName === 'charges' ? 'idCharge' :
           tableName === 'categories' ? 'id' : 'id';
};

// ============================================
// EXPORT DU SERVICE
// ============================================

export const dataService = {
    // Récupérer toutes les données
    getAll: () => {
        return dashboardService.loadData();
    },

    // Récupérer une table
    getTable: (tableName) => {
        return [...getTableData(tableName)];
    },

    // Récupérer un élément par ID
    getById: (tableName, id) => {
        const table = getTableData(tableName);
        const idField = getIdField(tableName);
        return table.find(item => item[idField] === id) || null;
    },

    // Ajouter un élément
    add: (tableName, item) => {
        const idField = getIdField(tableName);
        item[idField] = generateId(tableName);

        const data = dashboardService.loadData();
        const table = data[tableName] || [];
        table.push(item);
        saveTableData(tableName, table);

        return item;
    },

    // Mettre à jour un élément
    update: (tableName, id, updates) => {
        const idField = getIdField(tableName);
        const data = dashboardService.loadData();
        const table = data[tableName] || [];
        const index = table.findIndex(item => item[idField] === id);

        if (index === -1) return null;

        table[index] = { ...table[index], ...updates };
        
        // Si ce sont des produits, mettre à jour aussi le stock
        if (tableName === 'produits') {
            const stock = data.stock || [];
            const stockIndex = stock.findIndex(s => s.idProduit === id);
            if (stockIndex !== -1) {
                stock[stockIndex] = {
                    ...stock[stockIndex],
                    id: id,
                    idProduit: id,
                    quantiteRestante: updates.quantiteRestante ?? table[index].quantiteRestante ?? stock[stockIndex].quantiteRestante,
                    quantiteVendue: updates.quantiteVendue ?? table[index].quantiteVendue ?? stock[stockIndex].quantiteVendue,
                    alerteSeuil: updates.alerteSeuil ?? stock[stockIndex].alerteSeuil,
                    dateDerniereMaj: new Date().toISOString().split('T')[0],
                };
                dashboardService.saveData('stock', stock);
            }
        }

        dashboardService.saveData(tableName, table);
        return table[index];
    },

    // Supprimer un élément
    delete: (tableName, id) => {
        const idField = getIdField(tableName);
        const data = dashboardService.loadData();
        const table = data[tableName] || [];
        const index = table.findIndex(item => item[idField] === id);

        if (index === -1) return false;

        table.splice(index, 1);
        dashboardService.saveData(tableName, table);

        // Nettoyer aussi le stock si ce sont des produits
        if (tableName === 'produits') {
            const stock = (data.stock || []).filter(s => s.idProduit !== id);
            dashboardService.saveData('stock', stock);
        }

        return true;
    },

    // ============================================
    // FONCTIONS DE GESTION DU FICHIER
    // ============================================

    // Exporter les données en fichier JSON
    exporter: () => {
        const data = dashboardService.loadData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kodomarket_data_' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Donnees exportees');
    },

    // Importer des donnees depuis un fichier JSON
    importer: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const requiredKeys = ['utilisateurs', 'produits', 'ventes', 'transport', 'depenses'];
                    const hasAllKeys = requiredKeys.every(key => data[key] !== undefined);
                    if (!hasAllKeys) {
                        reject(new Error('Format de fichier invalide'));
                        return;
                    }
                    Object.keys(data).forEach(key => {
                        dashboardService.saveData(key, data[key]);
                    });
                    if (data.stock) {
                        dashboardService.saveData('stock', data.stock);
                    }
                    if (data.categories) {
                        dashboardService.saveData('categories', data.categories);
                    }
                    localStorage.setItem('kodomarket_data_initialized', 'true');
                    console.log('Donnees importees avec succes');
                    resolve(data);
                } catch (error) {
                    reject(new Error('Erreur de lecture du fichier: ' + error.message));
                }
            };
            reader.onerror = () => {
                reject(new Error('Erreur de lecture du fichier'));
            };
            reader.readAsText(file);
        });
    },

    // Retourne un récapitulatif des données qui seront effacées
    getResetSummary: () => {
        const data = dashboardService.loadData();
        return {
            produits: data.produits?.length || 0,
            stock: data.stock?.length || 0,
            ventes: data.ventes?.length || 0,
            transport: data.transport?.length || 0,
            depenses: data.depenses?.length || 0,
            totalCA: data.ventes?.reduce((sum, v) => sum + v.totalVente, 0) || 0,
            totalDepenses: data.depenses?.reduce((sum, d) => sum + d.montant, 0) || 0
        };
    },

    // Réinitialiser les données (vide ventes, produits, stock, transport, dépenses)
    // Les utilisateurs et catégories sont conservés pour que la connexion reste possible
    reinitialiser: () => {
        const tablesToClear = ['produits', 'stock', 'ventes', 'transport', 'depenses'];
        tablesToClear.forEach(key => {
            localStorage.setItem(`kodomarket_${key}`, JSON.stringify([]));
        });
        localStorage.setItem('kodomarket_data_initialized', 'true');
        console.log('Données réinitialisées (stats à zéro)');
        return Promise.resolve(true);
    },

    // ============================================
    // STATISTIQUES
    // ============================================

    getStats: () => {
        const data = dashboardService.loadData();
        const { utilisateurs, ventes, depenses, transport } = data;
        const stock = data.stock || [];
        const produits = data.produits || [];
        
        const totalVentes = ventes?.length || 0;
        const totalCA = ventes?.reduce((sum, v) => sum + v.totalVente, 0) || 0;
        const totalProduits = produits?.length || 0;
        const totalDepenses = depenses?.reduce((sum, d) => sum + d.montant, 0) || 0;
        const totalTransport = transport?.reduce((sum, t) => sum + t.coutTransport, 0) || 0;
        
        // Calcul précis du bénéfice en incluant le coût d'achat des marchandises (COGS)
        // Bénéfice = Somme de ((prixVente - prixAchat) * quantité) - Dépenses - Transport
        let beneficeBrut = 0;
        (ventes || []).forEach(vente => {
            (vente.produitsVendus || []).forEach(item => {
                const produit = produits.find(p => p.idProduit === item.idProduit);
                const prixAchat = produit?.prixExact || 0;
                const margeUnitaire = item.prixUnitaire - prixAchat;
                beneficeBrut += margeUnitaire * item.quantite;
            });
        });
        const benefices = beneficeBrut - totalDepenses - totalTransport;
        
        const aujourdhui = new Date().toDateString();
        const ventesAujourdhui = ventes?.filter(v => 
            new Date(v.date).toDateString() === aujourdhui
        ) || [];
        const caAujourdhui = ventesAujourdhui.reduce((sum, v) => sum + v.totalVente, 0);
        
        // Stock faible (via la table stock du Système B)
        const stockFaible = stock.filter(s => 
            s.quantiteRestante <= s.alerteSeuil
        ) || [];
        
        const vendeursActifs = utilisateurs?.filter(u => 
            u.role === 'vendeur' && u.actif
        ) || [];
        
        return {
            totalVentes,
            totalCA,
            totalProduits,
            totalDepenses,
            totalTransport,
            benefices,
            ventesAujourdhui: ventesAujourdhui.length,
            caAujourdhui,
            stockFaible: stockFaible.length,
            vendeursActifs: vendeursActifs.length,
            derniereMiseAJour: new Date().toISOString()
        };
    },

    // ============================================
    // FONCTIONS SPECIFIQUES
    // ============================================

    verifierStock: (idProduit, quantite) => {
        const produit = dataService.getById('produits', idProduit);
        if (!produit) return false;
        return produit.quantiteRestante >= quantite;
    },

    mettreAJourStock: (idProduit, quantiteVendue) => {
        const produit = dataService.getById('produits', idProduit);
        if (!produit) return false;
        produit.quantiteRestante -= quantiteVendue;
        produit.quantiteVendue += quantiteVendue;
        dataService.update('produits', idProduit, produit);
        return true;
    }
};

// ============================================
// SERVICES SPECIFIQUES (pour compatibilite)
// ============================================

export const produitService = {
    getAll: () => dataService.getTable('produits'),
    getById: (id) => dataService.getById('produits', id),
    create: (data) => dataService.add('produits', data),
    update: (id, data) => dataService.update('produits', id, data),
    delete: (id) => dataService.delete('produits', id),
};

export const venteService = {
    getAll: () => dataService.getTable('ventes'),
    getById: (id) => dataService.getById('ventes', id),
    create: (data) => dataService.add('ventes', data),
    update: (id, data) => dataService.update('ventes', id, data),
    delete: (id) => dataService.delete('ventes', id),
};

export const userService = {
    getAll: () => dataService.getTable('utilisateurs'),
    getById: (id) => dataService.getById('utilisateurs', id),
    create: (data) => dataService.add('utilisateurs', data),
    update: (id, data) => dataService.update('utilisateurs', id, data),
    delete: (id) => dataService.delete('utilisateurs', id),
};

export const statsService = {
    get: () => dataService.getStats(),
};

console.log('KodoMarket - Service de donnees unifie (Systeme B)');
