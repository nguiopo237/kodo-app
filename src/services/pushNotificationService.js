// ============================================
// SERVICE DE NOTIFICATIONS PUSH NAVIGATEUR
// Utilise l'API Notification du navigateur
// ============================================

// Vérifier si les notifications sont supportées
const isSupported = () => {
  return 'Notification' in window;
};

// Obtenir le statut actuel de la permission
const getPermissionStatus = () => {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
};

// Demander la permission de notification
const requestPermission = async () => {
  if (!isSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Erreur demande permission notification:', error);
    return 'denied';
  }
};

// Envoyer une notification push
const sendNotification = (title, options = {}) => {
  if (!isSupported() || Notification.permission !== 'granted') {
    console.warn('Notifications non autorisées');
    return false;
  }
  try {
    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      body: '',
      tag: 'kodomarket-notification',
      requireInteraction: false,
      silent: false
    };
    new Notification(title, { ...defaultOptions, ...options });
    return true;
  } catch (error) {
    console.warn('Erreur envoi notification:', error);
    return false;
  }
};

// Notifications spécifiques pour le vendeur
const notifierVenteEffectuee = (montant, client) => {
  return sendNotification('🛒 Nouvelle vente KodoMarket', {
    body: "Vente de " + montant + " FCFA effectuée" + (client ? " pour " + client : ""),
    requireInteraction: false
  });
};

const notifierObjectifAtteint = (objectif) => {
  return sendNotification('🏆 Objectif atteint !', {
    body: 'Félicitations ! ' + objectif,
    requireInteraction: true
  });
};

const notifierStockFaible = (produit, stock) => {
  return sendNotification('⚠️ Stock faible', {
    body: "Le produit '" + produit + "' n'a plus que " + stock + " unité(s) en stock.",
    requireInteraction: true
  });
};

// Notification push lors de l'export PDF
const notifierExportPDF = (type) => {
  return sendNotification('📄 Export PDF réussi', {
    body: 'Le fichier ' + type + ' a été généré avec succès.',
    requireInteraction: false
  });
};

export const pushNotificationService = {
  isSupported,
  getPermissionStatus,
  requestPermission,
  sendNotification,
  notifierVenteEffectuee,
  notifierObjectifAtteint,
  notifierStockFaible,
  notifierExportPDF
};