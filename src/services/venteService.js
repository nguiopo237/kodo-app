import { dashboardService } from './dashboardService';

export const venteService = {
  getVentes: () => {
    const data = dashboardService.loadData();
    return data.ventes || [];
  },

  getVentesDetaillees: () => {
    const ventes = venteService.getVentes();
    const data = dashboardService.loadData();
    const utilisateurs = data.utilisateurs || [];
    const produits = data.produits || [];

    return ventes.map(vente => {
      const vendeur = utilisateurs.find(u => u.idUser === vente.idVendeur);
      const produitsDetails = (vente.produitsVendus || []).map(item => {
        const produit = produits.find(p => p.idProduit === item.idProduit);
        return {
          ...item,
          nomProduit: produit?.nomProduit || 'Produit inconnu',
          categorie: produit?.categorie || 'Non catégorisé'
        };
      });

      return {
        ...vente,
        vendeurNom: vendeur?.nomComplet || 'Vendeur inconnu',
        produitsDetails,
        dateFormatee: new Date(vente.date).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  creerVente: (venteData) => {
    const data = dashboardService.loadData();
    const newId = Math.max(...(data.ventes || []).map(v => v.idVente), 0) + 1;

    const nouvelleVente = {
      idVente: newId,
      ...venteData,
      date: new Date().toISOString(),
      statut: 'completée'
    };

    (venteData.produitsVendus || []).forEach(item => {
      const stockIndex = (data.stock || []).findIndex(s => s.idProduit === item.idProduit);
      if (stockIndex !== -1) {
        data.stock[stockIndex].quantiteRestante -= item.quantite;
        data.stock[stockIndex].quantiteVendue += item.quantite;
        data.stock[stockIndex].dateDerniereMaj = new Date().toISOString().split('T')[0];
      }
    });

    data.ventes = data.ventes || [];
    data.ventes.push(nouvelleVente);

    dashboardService.saveData('ventes', data.ventes);
    dashboardService.saveData('stock', data.stock);

    return nouvelleVente;
  },

  getStatistiquesVentes: () => {
    const ventes = venteService.getVentes();
    const aujourdhui = new Date().toDateString();
    const ceMois = new Date().getMonth();

    const ventesAujourdhui = ventes.filter(v => new Date(v.date).toDateString() === aujourdhui);
    const ventesCeMois = ventes.filter(v => new Date(v.date).getMonth() === ceMois);

    const totalVentes = ventes.length;
    const totalCA = ventes.reduce((sum, v) => sum + v.totalVente, 0);
    const caAujourdhui = ventesAujourdhui.reduce((sum, v) => sum + v.totalVente, 0);
    const caMois = ventesCeMois.reduce((sum, v) => sum + v.totalVente, 0);

    // Produits les plus vendus - CORRECTION ICI
    const produitsVendus = {};
    ventes.forEach(vente => {
      (vente.produitsVendus || []).forEach(item => {
        if (!produitsVendus[item.idProduit]) {
          produitsVendus[item.idProduit] = { 
            idProduit: item.idProduit, 
            quantite: 0, 
            chiffreAffaires: 0 
          };
        }
        produitsVendus[item.idProduit].quantite += item.quantite;
        produitsVendus[item.idProduit].chiffreAffaires += item.prixTotal;
      });
    });

    const produitsPopulaires = Object.values(produitsVendus)
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);

    return {
      totalVentes,
      totalCA: parseFloat(totalCA.toFixed(0)),
      caAujourdhui: parseFloat(caAujourdhui.toFixed(0)),
      caMois: parseFloat(caMois.toFixed(0)),
      ventesAujourdhui: ventesAujourdhui.length,
      produitsPopulaires // Cette variable est maintenant définie
    };
  },

  annulerVente: (idVente) => {
    const data = dashboardService.loadData();
    const ventes = data.ventes || [];
    const venteIndex = ventes.findIndex(v => v.idVente === idVente);

    if (venteIndex === -1) {
      throw new Error('Vente non trouvée');
    }

    const vente = ventes[venteIndex];

    (vente.produitsVendus || []).forEach(item => {
      const stockIndex = (data.stock || []).findIndex(s => s.idProduit === item.idProduit);
      if (stockIndex !== -1) {
        data.stock[stockIndex].quantiteRestante += item.quantite;
        data.stock[stockIndex].quantiteVendue -= item.quantite;
        data.stock[stockIndex].dateDerniereMaj = new Date().toISOString().split('T')[0];
      }
    });

    ventes[venteIndex].statut = 'annulée';

    dashboardService.saveData('ventes', ventes);
    dashboardService.saveData('stock', data.stock);

    return ventes[venteIndex];
  },

  supprimerVente: (idVente) => {
    const data = dashboardService.loadData();
    const ventes = data.ventes || [];
    const stock = data.stock || [];

    const venteIndex = ventes.findIndex(v => v.idVente === idVente);

    if (venteIndex === -1) {
      throw new Error('Vente non trouvée');
    }

    const vente = ventes[venteIndex];

    if (vente.statut === 'annulée') {
      throw new Error('Cette vente est déjà annulée');
    }

    (vente.produitsVendus || []).forEach(item => {
      const stockIndex = stock.findIndex(s => s.idProduit === item.idProduit);
      if (stockIndex !== -1) {
        stock[stockIndex].quantiteRestante += item.quantite;
        stock[stockIndex].quantiteVendue -= item.quantite;
        stock[stockIndex].dateDerniereMaj = new Date().toISOString().split('T')[0];
      }
    });

    ventes.splice(venteIndex, 1);

    dashboardService.saveData('ventes', ventes);
    dashboardService.saveData('stock', stock);

    return true;
  },

  getVenteDetail: (idVente) => {
    const ventesDetaillees = venteService.getVentesDetaillees();
    return ventesDetaillees.find(v => v.idVente === idVente);
  },

  getVentesParPeriode: (debut, fin) => {
    const ventes = venteService.getVentesDetaillees();
    const dateDebut = new Date(debut);
    const dateFin = new Date(fin);

    return ventes.filter(v => {
      const dateVente = new Date(v.date);
      return dateVente >= dateDebut && dateVente <= dateFin;
    });
  }
};