// Service de synchronisation simple
export const syncService = {
  // Générer un lien de partage des données
  genererLienPartage: () => {
    const data = {};
    const keys = ['utilisateurs', 'produits', 'stock', 'ventes', 'transport', 'depenses', 'charges'];
    
    keys.forEach(key => {
      const stored = localStorage.getItem(`kodomarket_${key}`);
      data[key] = stored ? JSON.parse(stored) : [];
    });

    // Encoder en base64
    const json = JSON.stringify(data);
    const encoded = btoa(encodeURIComponent(json));
    
    // Créer le lien
    const url = `${window.location.origin}/share?data=${encoded}`;
    return url;
  },

  // Charger des données depuis un lien
  chargerDepuisLien: (dataEncoded) => {
    try {
      const json = decodeURIComponent(atob(dataEncoded));
      const data = JSON.parse(json);
      
      // Sauvegarder les données
      Object.keys(data).forEach(key => {
        localStorage.setItem(`kodomarket_${key}`, JSON.stringify(data[key]));
      });
      
      localStorage.setItem('kodomarket_data_initialized', 'true');
      return true;
    } catch (error) {
      console.error('Erreur de chargement:', error);
      return false;
    }
  }
};