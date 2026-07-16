import { dataService } from './dataService';

// Service pour sauvegarder et restaurer les données
// Délègue l'export/import/réinitialisation à dataService (source unique de vérité)
export const backupService = {
  // Exporter toutes les données en fichier JSON
  exporterDonnees: () => {
    dataService.exporter();
  },

  // Importer des données depuis un fichier JSON
  importerDonnees: (file) => {
    return dataService.importer(file);
  },

  // Réinitialiser les données (via dataService qui préserve utilisateurs/catégories)
  reinitialiserDonnees: () => {
    return dataService.reinitialiser();
  },

  // Vérifier l'intégrité des données
  verifierDonnees: () => {
    const data = {};
    const keys = ['utilisateurs', 'produits', 'stock', 'ventes', 'transport', 'depenses'];
    let isValid = true;
    const errors = [];

    keys.forEach(key => {
      const stored = localStorage.getItem(`kodomarket_${key}`);
      if (!stored) {
        isValid = false;
        errors.push(`Données manquantes: ${key}`);
      } else {
        try {
          data[key] = JSON.parse(stored);
        } catch (e) {
          isValid = false;
          errors.push(`Erreur de parsing: ${key}`);
        }
      }
    });

    return { isValid, errors, data };
  }
};