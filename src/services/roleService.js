// ============================================
// ROLE SERVICE - Système de rôles & permissions
// Gestion dynamique (CRUD) des rôles
// ============================================

import { dashboardService } from './dashboardService';

// ============================================
// RÔLES INTÉGRÉS (built-in)
// Ne peuvent pas être supprimés, mais permissions modifiables
// ============================================
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  VENDEUR: 'vendeur',
  LIVREUR: 'livreur',
  COMPTABLE: 'comptable',
};

const BUILT_IN_ROLES = Object.values(ROLES);

// ============================================
// PERMISSIONS DISPONIBLES
// ============================================
export const PERMISSIONS = {
  PRODUITS_LIRE: 'produits:lire',
  PRODUITS_CREER: 'produits:creer',
  PRODUITS_MODIFIER: 'produits:modifier',
  PRODUITS_SUPPRIMER: 'produits:supprimer',
  PRODUITS_EXPORTER: 'produits:exporter',
  VENTES_LIRE: 'ventes:lire',
  VENTES_CREER: 'ventes:creer',
  VENTES_MODIFIER: 'ventes:modifier',
  VENTES_SUPPRIMER: 'ventes:supprimer',
  VENTES_VOIR_TOUTES: 'ventes:voir_toutes',
  UTILISATEURS_LIRE: 'utilisateurs:lire',
  UTILISATEURS_CREER: 'utilisateurs:creer',
  UTILISATEURS_MODIFIER: 'utilisateurs:modifier',
  UTILISATEURS_SUPPRIMER: 'utilisateurs:supprimer',
  UTILISATEURS_CHANGER_ROLE: 'utilisateurs:changer_role',
  TRANSPORT_LIRE: 'transport:lire',
  TRANSPORT_CREER: 'transport:creer',
  TRANSPORT_MODIFIER: 'transport:modifier',
  TRANSPORT_SUPPRIMER: 'transport:supprimer',
  TRANSPORT_CONFIRMER: 'transport:confirmer',
  DEPENSES_LIRE: 'depenses:lire',
  DEPENSES_CREER: 'depenses:creer',
  DEPENSES_MODIFIER: 'depenses:modifier',
  DEPENSES_SUPPRIMER: 'depenses:supprimer',
  COMPTABILITE_LIRE: 'comptabilite:lire',
  COMPTABILITE_EXPORTER: 'comptabilite:exporter',
  RAPPORTS_LIRE: 'rapports:lire',
  RAPPORTS_GENERER: 'rapports:generer',
  RAPPORTS_EXPORTER: 'rapports:exporter',
  ADMIN_PARAMETRES: 'admin:parametres',
  ADMIN_REINITIALISER: 'admin:reinitialiser',
  ADMIN_STATS: 'admin:stats',
  ADMIN_LOGS: 'admin:logs',
};

// Groupes de permissions pour l'affichage
export const PERMISSION_GROUPS = {
  'Produits': ['produits:lire', 'produits:creer', 'produits:modifier', 'produits:supprimer', 'produits:exporter'],
  'Ventes': ['ventes:lire', 'ventes:creer', 'ventes:modifier', 'ventes:supprimer', 'ventes:voir_toutes'],
  'Utilisateurs': ['utilisateurs:lire', 'utilisateurs:creer', 'utilisateurs:modifier', 'utilisateurs:supprimer', 'utilisateurs:changer_role'],
  'Transport': ['transport:lire', 'transport:creer', 'transport:modifier', 'transport:supprimer', 'transport:confirmer'],
  'Dépenses': ['depenses:lire', 'depenses:creer', 'depenses:modifier', 'depenses:supprimer'],
  'Comptabilité': ['comptabilite:lire', 'comptabilite:exporter'],
  'Rapports': ['rapports:lire', 'rapports:generer', 'rapports:exporter'],
  'Administration': ['admin:parametres', 'admin:reinitialiser', 'admin:stats', 'admin:logs'],
};

// Noms lisibles des permissions
export const PERMISSION_LABELS = {
  'produits:lire': 'Voir les produits',
  'produits:creer': 'Créer des produits',
  'produits:modifier': 'Modifier des produits',
  'produits:supprimer': 'Supprimer des produits',
  'produits:exporter': 'Exporter les produits',
  'ventes:lire': 'Voir les ventes',
  'ventes:creer': 'Créer des ventes',
  'ventes:modifier': 'Modifier des ventes',
  'ventes:supprimer': 'Supprimer des ventes',
  'ventes:voir_toutes': 'Voir toutes les ventes',
  'utilisateurs:lire': 'Voir les utilisateurs',
  'utilisateurs:creer': 'Créer des utilisateurs',
  'utilisateurs:modifier': 'Modifier des utilisateurs',
  'utilisateurs:supprimer': 'Supprimer des utilisateurs',
  'utilisateurs:changer_role': 'Changer le rôle',
  'transport:lire': 'Voir les transports',
  'transport:creer': 'Créer des transports',
  'transport:modifier': 'Modifier des transports',
  'transport:supprimer': 'Supprimer des transports',
  'transport:confirmer': 'Confirmer des réceptions',
  'depenses:lire': 'Voir les dépenses',
  'depenses:creer': 'Créer des dépenses',
  'depenses:modifier': 'Modifier des dépenses',
  'depenses:supprimer': 'Supprimer des dépenses',
  'comptabilite:lire': 'Voir la comptabilité',
  'comptabilite:exporter': 'Exporter la comptabilité',
  'rapports:lire': 'Voir les rapports',
  'rapports:generer': 'Générer des rapports',
  'rapports:exporter': 'Exporter les rapports',
  'admin:parametres': 'Configurer les paramètres',
  'admin:reinitialiser': 'Réinitialiser les données',
  'admin:stats': 'Voir les statistiques',
  'admin:logs': 'Voir les logs',
};

// ============================================
// PERMISSIONS PAR DÉFAUT POUR RÔLES INTÉGRÉS
// ============================================
const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.PRODUITS_LIRE, PERMISSIONS.PRODUITS_CREER, PERMISSIONS.PRODUITS_MODIFIER,
    PERMISSIONS.PRODUITS_SUPPRIMER, PERMISSIONS.PRODUITS_EXPORTER, PERMISSIONS.VENTES_LIRE,
    PERMISSIONS.VENTES_VOIR_TOUTES, PERMISSIONS.UTILISATEURS_LIRE, PERMISSIONS.UTILISATEURS_CREER,
    PERMISSIONS.UTILISATEURS_MODIFIER, PERMISSIONS.UTILISATEURS_SUPPRIMER, PERMISSIONS.UTILISATEURS_CHANGER_ROLE,
    PERMISSIONS.TRANSPORT_LIRE, PERMISSIONS.TRANSPORT_CREER, PERMISSIONS.TRANSPORT_MODIFIER,
    PERMISSIONS.TRANSPORT_SUPPRIMER, PERMISSIONS.TRANSPORT_CONFIRMER, PERMISSIONS.DEPENSES_LIRE,
    PERMISSIONS.DEPENSES_CREER, PERMISSIONS.DEPENSES_MODIFIER, PERMISSIONS.DEPENSES_SUPPRIMER,
    PERMISSIONS.COMPTABILITE_LIRE, PERMISSIONS.COMPTABILITE_EXPORTER, PERMISSIONS.RAPPORTS_LIRE,
    PERMISSIONS.RAPPORTS_GENERER, PERMISSIONS.RAPPORTS_EXPORTER, PERMISSIONS.ADMIN_PARAMETRES,
    PERMISSIONS.ADMIN_REINITIALISER, PERMISSIONS.ADMIN_STATS, PERMISSIONS.ADMIN_LOGS,
  ],
  [ROLES.VENDEUR]: [
    PERMISSIONS.PRODUITS_LIRE, PERMISSIONS.VENTES_LIRE, PERMISSIONS.VENTES_CREER,
    PERMISSIONS.TRANSPORT_LIRE, PERMISSIONS.TRANSPORT_CONFIRMER, PERMISSIONS.DEPENSES_LIRE,
    PERMISSIONS.DEPENSES_CREER, PERMISSIONS.DEPENSES_MODIFIER, PERMISSIONS.COMPTABILITE_LIRE,
  ],
  [ROLES.LIVREUR]: [
    PERMISSIONS.TRANSPORT_LIRE, PERMISSIONS.TRANSPORT_CONFIRMER, PERMISSIONS.PRODUITS_LIRE,
  ],
  [ROLES.COMPTABLE]: [
    PERMISSIONS.VENTES_LIRE, PERMISSIONS.VENTES_VOIR_TOUTES, PERMISSIONS.DEPENSES_LIRE,
    PERMISSIONS.DEPENSES_CREER, PERMISSIONS.COMPTABILITE_LIRE, PERMISSIONS.COMPTABILITE_EXPORTER,
    PERMISSIONS.RAPPORTS_LIRE, PERMISSIONS.RAPPORTS_GENERER, PERMISSIONS.RAPPORTS_EXPORTER,
  ],
};

// ============================================
// MÉTADONNÉES DES RÔLES INTÉGRÉS
// ============================================
const DEFAULT_ROLE_METADATA = {
  [ROLES.SUPER_ADMIN]: { label: 'Super Admin', icon: '👑', color: '#7c3aed', bgColor: '#ede9fe', description: 'Accès complet à toutes les fonctionnalités', level: 5 },
  [ROLES.ADMIN]: { label: 'Administrateur', icon: '🛡️', color: '#2563eb', bgColor: '#dbeafe', description: 'Gestion complète de la plateforme', level: 4 },
  [ROLES.VENDEUR]: { label: 'Vendeur', icon: '🛒', color: '#059669', bgColor: '#d1fae5', description: 'Gestion des ventes et des dépenses', level: 2 },
  [ROLES.LIVREUR]: { label: 'Livreur', icon: '🚚', color: '#d97706', bgColor: '#fef3c7', description: 'Gestion des transports et réceptions', level: 1 },
  [ROLES.COMPTABLE]: { label: 'Comptable', icon: '📊', color: '#8b5cf6', bgColor: '#ede9fe', description: 'Consultation financière et rapports', level: 3 },
};

// ============================================
// STOCKAGE DES RÔLES PERSONNALISÉS
// ============================================

const getCustomRoles = () => {
  try {
    const data = dashboardService.loadData();
    return data.roles_config || [];
  } catch {
    return [];
  }
};

const saveCustomRoles = (customRoles) => {
  try {
    const data = dashboardService.loadData();
    data.roles_config = customRoles;
    dashboardService.saveData('roles_config', customRoles);
    return true;
  } catch (e) {
    console.error('Erreur sauvegarde rôles:', e);
    return false;
  }
};

// ============================================
// FONCTIONS DE GESTION DES RÔLES (CRUD)
// ============================================

/**
 * Récupère tous les rôles (intégrés + personnalisés)
 */
export const getAllRoles = () => {
  const builtIn = Object.entries(DEFAULT_ROLE_METADATA).map(([key, meta]) => ({
    id: key,
    isBuiltIn: true,
    ...meta,
  }));

  const custom = getCustomRoles().map(r => ({
    ...r,
    isBuiltIn: false,
  }));

  return [...builtIn, ...custom];
};

/**
 * Récupère les permissions d'un rôle
 */
export const getRolePermissions = (roleId) => {
  // Rôle personnalisé
  const custom = getCustomRoles().find(r => r.id === roleId);
  if (custom) return custom.permissions || [];

  // Vérifier les overrides pour les rôles intégrés
  try {
    const data = dashboardService.loadData();
    const overrides = data.roles_permissions_overrides || {};
    if (overrides[roleId]) {
      return overrides[roleId];
    }
  } catch {}

  // Rôle intégré (permissions par défaut)
  return DEFAULT_ROLE_PERMISSIONS[roleId] || [];
};

/**
 * Vérifie si un rôle est un built-in (non supprimable)
 */
export const isBuiltInRole = (roleId) => BUILT_IN_ROLES.includes(roleId);

/**
 * Ajoute un nouveau rôle personnalisé
 */
export const addRole = (roleData) => {
  const custom = getCustomRoles();
  
  // Vérifier unicité de l'ID
  if (custom.find(r => r.id === roleData.id)) {
    throw new Error('Un rôle avec cet identifiant existe déjà');
  }
  if (DEFAULT_ROLE_METADATA[roleData.id]) {
    throw new Error('Cet identifiant de rôle est réservé');
  }

  const newRole = {
    id: roleData.id,
    label: roleData.label || roleData.id,
    icon: roleData.icon || '🔶',
    color: roleData.color || '#6b7280',
    bgColor: roleData.bgColor || '#f3f4f6',
    description: roleData.description || '',
    level: roleData.level || 1,
    permissions: roleData.permissions || [],
  };

  custom.push(newRole);
  saveCustomRoles(custom);
  return newRole;
};

/**
 * Supprime un rôle personnalisé
 */
export const deleteRole = (roleId) => {
  if (isBuiltInRole(roleId)) {
    throw new Error('Impossible de supprimer un rôle intégré du système');
  }

  let custom = getCustomRoles();
  const exists = custom.find(r => r.id === roleId);
  if (!exists) {
    throw new Error('Rôle introuvable');
  }

  custom = custom.filter(r => r.id !== roleId);
  saveCustomRoles(custom);
  return true;
};

/**
 * Met à jour les métadonnées d'un rôle
 */
export const updateRole = (roleId, updates) => {
  const custom = getCustomRoles();
  const index = custom.findIndex(r => r.id === roleId);

  if (index !== -1) {
    // Rôle personnalisé
    custom[index] = { ...custom[index], ...updates, id: roleId };
    saveCustomRoles(custom);
    return custom[index];
  }

  // Pour les rôles intégrés, on ne peut que modifier les permissions
  // Les métadonnées restent inchangées
  throw new Error('Les rôles intégrés ne peuvent pas être renommés');
};

/**
 * Met à jour les permissions d'un rôle
 */
export const updateRolePermissions = (roleId, permissions) => {
  const custom = getCustomRoles();
  const index = custom.findIndex(r => r.id === roleId);

  if (index !== -1) {
    // Rôle personnalisé
    custom[index].permissions = permissions;
    saveCustomRoles(custom);
    return custom[index];
  }

  // Pour les rôles intégrés, on sauvegarde les overrides de permissions
  try {
    const data = dashboardService.loadData();
    const overrides = data.roles_permissions_overrides || {};
    overrides[roleId] = permissions;
    dashboardService.saveData('roles_permissions_overrides', overrides);
    return { id: roleId, permissions };
  } catch {
    throw new Error('Erreur lors de la mise à jour des permissions');
  }
};

// ============================================
// FONCTIONS DE VÉRIFICATION DES PERMISSIONS
// ============================================

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;

  // Vérifier les overrides pour les rôles intégrés
  try {
    const data = dashboardService.loadData();
    const overrides = data.roles_permissions_overrides || {};
    if (overrides[user.role]) {
      return overrides[user.role].includes(permission);
    }
  } catch {}

  // Vérifier les rôles personnalisés
  const custom = getCustomRoles().find(r => r.id === user.role);
  if (custom) {
    return custom.permissions.includes(permission);
  }

  // Vérifier les permissions par défaut des rôles intégrés
  const perms = DEFAULT_ROLE_PERMISSIONS[user.role];
  return !!(perms && perms.includes(permission));
};

export const hasAnyPermission = (user, perms) => perms.some(p => hasPermission(user, p));
export const hasAllPermissions = (user, perms) => perms.every(p => hasPermission(user, p));

/**
 * Vérifie si un rôle a au moins un certain niveau hiérarchique
 */
export const hasMinRoleLevel = (role, minLevel) => {
  const meta = getRoleMetadata(role);
  return meta && meta.level >= minLevel;
};

/**
 * Filtre les utilisateurs par rôle
 */
export const filterByRole = (users, role) => !role || role === 'tous' ? users : users.filter(u => u.role === role);

/**
 * Vérifie l'accès à une route selon le niveau du rôle
 */
export const canAccessRoute = (user, requiredRole) => {
  if (!user) return false;
  if (!requiredRole) return true;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  const userMeta = getRoleMetadata(user.role);
  const requiredMeta = getRoleMetadata(requiredRole);
  return userMeta && requiredMeta && userMeta.level >= requiredMeta.level;
};

// ============================================
// MÉTADONNÉES
// ============================================

export const ROLE_METADATA = { ...DEFAULT_ROLE_METADATA };

/**
 * Récupère les métadonnées d'un rôle (intégré ou personnalisé)
 */
export const getRoleMetadata = (role) => {
  if (!role) return { label: 'Inconnu', icon: '❓', color: '#6b7280', bgColor: '#f3f4f6', description: 'Rôle inconnu', level: 0 };

  // Rôle intégré
  if (DEFAULT_ROLE_METADATA[role]) {
    return DEFAULT_ROLE_METADATA[role];
  }

  // Rôle personnalisé
  const custom = getCustomRoles().find(r => r.id === role);
  if (custom) {
    return {
      label: custom.label,
      icon: custom.icon,
      color: custom.color,
      bgColor: custom.bgColor,
      description: custom.description,
      level: custom.level || 1,
    };
  }

  return { label: role, icon: '❓', color: '#6b7280', bgColor: '#f3f4f6', description: 'Rôle personnalisé', level: 1 };
};

/**
 * Retourne le style de badge pour un rôle
 */
export const getRoleBadgeStyle = (role) => {
  const meta = getRoleMetadata(role);
  return { className: 'role-badge--' + role, label: meta.icon + ' ' + meta.label, style: { backgroundColor: meta.bgColor, color: meta.color } };
};

// ============================================
// BACKUP / RESTORE DE LA CONFIGURATION DES RÔLES
// ============================================

/**
 * Récupère toutes les données de configuration des rôles pour export
 */
export const getRolesExportData = () => {
  const data = dashboardService.loadData();
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    roles_config: data.roles_config || [],
    roles_permissions_overrides: data.roles_permissions_overrides || {},
  };
};

/**
 * Exporte la configuration des rôles dans un fichier JSON téléchargé
 */
export const exportRolesConfig = () => {
  const exportData = getRolesExportData();
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kodomarket_roles_config_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return exportData;
};

/**
 * Importe et restaure la configuration des rôles depuis un objet JSON
 * Retourne un résumé de ce qui a été importé
 */
export const importRolesConfig = (jsonData) => {
  // Validation du format
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Format de fichier invalide');
  }

  if (!jsonData.roles_config || !Array.isArray(jsonData.roles_config)) {
    throw new Error('Le fichier ne contient pas de configuration de rôles valide');
  }

  // Validation de la version
  if (!jsonData.version) {
    throw new Error('Version du fichier non reconnue');
  }

  // Valider chaque rôle
  jsonData.roles_config.forEach((role, index) => {
    if (!role.id || !role.label) {
      throw new Error('Rôle #' + (index + 1) + ' : identifiant ou label manquant');
    }
    // Vérifier qu'il n'écrase pas un rôle intégré
    if (BUILT_IN_ROLES.includes(role.id)) {
      throw new Error('Le rôle "' + role.label + '" (' + role.id + ') est un rôle intégré et ne peut pas être importé en tant que rôle personnalisé');
    }
  });

  // Compter ce qui va être importé
  const customRolesCount = jsonData.roles_config.length;
  const overridesCount = jsonData.roles_permissions_overrides
    ? Object.keys(jsonData.roles_permissions_overrides).length
    : 0;

  // Sauvegarder la configuration
  const data = dashboardService.loadData();
  
  // Concaténer avec les rôles existants (éviter les doublons d'ID)
  const existingCustom = data.roles_config || [];
  const newIds = jsonData.roles_config.map(r => r.id);
  const mergedCustom = [
    ...existingCustom.filter(r => !newIds.includes(r.id)),
    ...jsonData.roles_config,
  ];
  
  data.roles_config = mergedCustom;
  
  // Fusionner les overrides de permissions (les nouveaux écrasent les anciens)
  const existingOverrides = data.roles_permissions_overrides || {};
  data.roles_permissions_overrides = {
    ...existingOverrides,
    ...(jsonData.roles_permissions_overrides || {}),
  };

  dashboardService.saveData('roles_config', data.roles_config);
  dashboardService.saveData('roles_permissions_overrides', data.roles_permissions_overrides);

  return {
    customRolesImported: customRolesCount,
    overridesImported: overridesCount,
    customRolesNew: jsonData.roles_config.length,
  };
};

/**
 * Importe la configuration depuis un fichier File (input file)
 */
export const importRolesFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const result = importRolesConfig(data);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
};
