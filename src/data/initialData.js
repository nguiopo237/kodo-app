export const initialData = {
  utilisateurs: [
    { idUser: 1, username: "admin", password: "admin123", role: "admin", nomComplet: "Administrateur Principal", prenom: "Administrateur", nom: "Principal", email: "admin@kodomarket.com", dateCreation: "2024-01-01", actif: true },
    { idUser: 2, username: "vendeur1", password: "vendeur123", role: "vendeur", nomComplet: "Jean Dupont", prenom: "Jean", nom: "Dupont", localisation: "Douala, Cameroun", dateCreation: "2024-01-02", actif: true },
    { idUser: 3, username: "vendeur2", password: "vendeur123", role: "vendeur", nomComplet: "Marie Claude", prenom: "Marie", nom: "Claude", localisation: "Yaoundé, Cameroun", dateCreation: "2024-01-03", actif: true }
  ],
  
  produits: [
    { idProduit: 1, categorie: "Alimentation", nomProduit: "Riz Basmati 5kg", quantiteInitiale: 500, rebus: 5, quantiteExacte: 495, prixExact: 7500, prixBoutique: 10000, dateAjout: "2024-01-10", ajoutePar: 1 },
    { idProduit: 2, categorie: "Alimentation", nomProduit: "Huile végétale 2L", quantiteInitiale: 300, rebus: 2, quantiteExacte: 298, prixExact: 3500, prixBoutique: 4500, dateAjout: "2024-01-10", ajoutePar: 1 },
    { idProduit: 3, categorie: "Boissons", nomProduit: "Café Arabica 1kg", quantiteInitiale: 200, rebus: 1, quantiteExacte: 199, prixExact: 12500, prixBoutique: 15000, dateAjout: "2024-01-11", ajoutePar: 1 },
    { idProduit: 4, categorie: "Alimentation", nomProduit: "Sucre cristal 5kg", quantiteInitiale: 400, rebus: 3, quantiteExacte: 397, prixExact: 4000, prixBoutique: 5500, dateAjout: "2024-01-11", ajoutePar: 1 },
    { idProduit: 5, categorie: "Conserves", nomProduit: "Sardines en boîte", quantiteInitiale: 600, rebus: 4, quantiteExacte: 596, prixExact: 2000, prixBoutique: 3000, dateAjout: "2024-01-12", ajoutePar: 1 }
  ],
  
  stock: [
    { id: 1, idProduit: 1, quantiteRestante: 150, quantiteVendue: 345, dateDerniereMaj: "2024-01-20", alerteSeuil: 20 },
    { id: 2, idProduit: 2, quantiteRestante: 85, quantiteVendue: 213, dateDerniereMaj: "2024-01-20", alerteSeuil: 15 },
    { id: 3, idProduit: 3, quantiteRestante: 45, quantiteVendue: 154, dateDerniereMaj: "2024-01-20", alerteSeuil: 10 },
    { id: 4, idProduit: 4, quantiteRestante: 180, quantiteVendue: 217, dateDerniereMaj: "2024-01-20", alerteSeuil: 25 },
    { id: 5, idProduit: 5, quantiteRestante: 120, quantiteVendue: 476, dateDerniereMaj: "2024-01-20", alerteSeuil: 30 }
  ],

  ventes: [
         { idVente: 1, idVendeur: 2, produitsVendus: [{ idProduit: 1, quantite: 5, prixUnitaire: 10000, prixTotal: 50000 }, { idProduit: 2, quantite: 3, prixUnitaire: 4500, prixTotal: 13500 }], totalVente: 63500, date: "2024-01-20T10:30:00", typePaiement: "espèces", statut: "completée" },
         { idVente: 2, idVendeur: 3, produitsVendus: [{ idProduit: 3, quantite: 2, prixUnitaire: 15000, prixTotal: 30000 }, { idProduit: 5, quantite: 10, prixUnitaire: 3000, prixTotal: 30000 }], totalVente: 60000, date: "2024-01-20T14:15:00", typePaiement: "mobile money", statut: "completée" },
    // { idVente: 3, idVendeur: 2, produitsVendus: [{ idProduit: 4, quantite: 8, prixUnitaire: 5500, prixTotal: 44000 }], totalVente: 44000, date: "2024-01-19T16:45:00", typePaiement: "carte", statut: "completée" },
    // { idVente: 4, idVendeur: 3, produitsVendus: [{ idProduit: 1, quantite: 3, prixUnitaire: 10000, prixTotal: 30000 }, { idProduit: 2, quantite: 2, prixUnitaire: 4500, prixTotal: 9000 }, { idProduit: 3, quantite: 1, prixUnitaire: 15000, prixTotal: 15000 }], totalVente: 54000, date: "2024-01-19T11:20:00", typePaiement: "espèces", statut: "completée" },
    // { idVente: 5, idVendeur: 2, produitsVendus: [{ idProduit: 5, quantite: 15, prixUnitaire: 3000, prixTotal: 45000 }], totalVente: 45000, date: "2024-01-18T09:10:00", typePaiement: "mobile money", statut: "completée" }
  ],
  
  transport: [
    { idEnvoi: 1, produitsEnvoyes: [{ idProduit: 1, quantiteEnvoyee: 500 }, { idProduit: 2, quantiteEnvoyee: 300 }, { idProduit: 3, quantiteEnvoyee: 200 }], coutTransport: 250000, paysEnvoi: "France", paysReception: "Cameroun", dateEnvoi: "2024-01-10", dateReception: "2024-01-25", statut: "en transit", confirmeReception: false, quantiteRecue: null },
    { idEnvoi: 2, produitsEnvoyes: [{ idProduit: 4, quantiteEnvoyee: 400 }, { idProduit: 5, quantiteEnvoyee: 600 }], coutTransport: 225000, paysEnvoi: "France", paysReception: "Cameroun", dateEnvoi: "2024-01-15", dateReception: null, statut: "préparation", confirmeReception: false, quantiteRecue: null }
  ],
  
  depenses: [
    { idDepense: 1, idVendeur: 2, typeDepense: "dédouanement", description: "Frais de douane pour l'envoi #1", montant: 75000, date: "2024-01-25", idEnvoiAssocie: 1, justificatif: "recu_douane_001.jpg" },
    { idDepense: 2, idVendeur: 3, typeDepense: "logistique", description: "Transport local entrepôt", montant: 37500, date: "2024-01-20", idEnvoiAssocie: null, justificatif: "facture_transport.pdf" },
    { idDepense: 3, idVendeur: 2, typeDepense: "autre", description: "Achat matériel de vente", montant: 60000, date: "2024-01-18", idEnvoiAssocie: null, justificatif: "facture_materiel.pdf" }
  ]
};