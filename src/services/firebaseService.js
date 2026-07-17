import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const DATA_COLLECTION = 'kodomarket';
const DATA_DOC = 'data';

// Cache en mémoire pour éviter de recharger Firestore à chaque accès
let dataCache = null;
let lastLoaded = null;
const CACHE_TTL = 30000; // 30 secondes

/**
 * Charge toutes les données depuis Firestore
 */
export const loadAllData = async () => {
  // Utiliser le cache si disponible et pas expiré
  if (dataCache && lastLoaded && Date.now() - lastLoaded < CACHE_TTL) {
    return { ...dataCache };
  }

  try {
    const docRef = doc(db, DATA_COLLECTION, DATA_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      dataCache = { ...docSnap.data() };
      lastLoaded = Date.now();
      return { ...dataCache };
    }

    return {};
  } catch (error) {
    console.warn('Erreur Firestore, utilisation du cache ou données vides:', error.message);
    return dataCache ? { ...dataCache } : {};
  }
};

/**
 * Sauvegarde toutes les données dans Firestore
 */
export const saveAllData = async (data) => {
  try {
    const docRef = doc(db, DATA_COLLECTION, DATA_DOC);
    await setDoc(docRef, data);
    dataCache = { ...data };
    lastLoaded = Date.now();
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde Firestore:', error.message);
    return false;
  }
};

/**
 * Sauvegarde une clé spécifique dans Firestore (sans recharger tout le document)
 */
export const saveField = async (key, value) => {
  try {
    const docRef = doc(db, DATA_COLLECTION, DATA_DOC);
    
    // Mettre à jour en mémoire d'abord
    if (dataCache) {
      dataCache[key] = value;
    }

    // Utiliser updateDoc pour ne mettre à jour qu'un champ
    // Si le document n'existe pas encore, utiliser setDoc
    await setDoc(docRef, { [key]: value }, { merge: true });
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde champ Firestore:', error.message);
    return false;
  }
};

/**
 * Vider le cache mémoire (force un rechargement depuis Firestore au prochain accès)
 */
export const clearCache = () => {
  dataCache = null;
  lastLoaded = null;
};
