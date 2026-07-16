// Utilitaire pour formater les montants en FCFA
export const formatCFA = (montant) => {
  if (!montant && montant !== 0) return '0 FCFA';
  return `${montant.toLocaleString('fr-FR')} FCFA`;
};

// Utilitaire pour formater les nombres
export const formatNumber = (nombre) => {
  if (!nombre && nombre !== 0) return '0';
  return nombre.toLocaleString('fr-FR');
};

// Utilitaire pour calculer la marge en pourcentage
export const calculerMarge = (prixAchat, prixVente) => {
  if (!prixAchat || prixAchat === 0) return '0%';
  const marge = ((prixVente - prixAchat) / prixAchat) * 100;
  return `${marge.toFixed(1)}%`;
};