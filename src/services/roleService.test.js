import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockLoadData, mockSaveData } = vi.hoisted(() => ({
  mockLoadData: vi.fn(),
  mockSaveData: vi.fn(),
}));

vi.mock('./dashboardService', () => ({
  dashboardService: {
    loadData: mockLoadData,
    saveData: mockSaveData,
  },
}));

import {
  getRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getAllRoles,
  isBuiltInRole,
  canAccessRoute,
  addRole,
  deleteRole,
  updateRole,
  updateRolePermissions,
  getRolesExportData,
  exportRolesConfig,
  importRolesConfig,
  ROLES,
  PERMISSIONS,
} from './roleService';

// ============================================
// getRolePermissions()
// ============================================
describe('getRolePermissions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne les permissions par defaut pour un role integre sans overrides', () => {
    mockLoadData.mockReturnValue({
      roles_config: [],
      roles_permissions_overrides: {},
    });
    const perms = getRolePermissions(ROLES.VENDEUR);
    expect(perms).toContain(PERMISSIONS.PRODUITS_LIRE);
    expect(perms).toContain(PERMISSIONS.VENTES_CREER);
    expect(perms).not.toContain(PERMISSIONS.UTILISATEURS_LIRE);
  });

  it('retourne toutes les permissions pour super_admin par defaut', () => {
    mockLoadData.mockReturnValue({
      roles_config: [],
      roles_permissions_overrides: {},
    });
    const perms = getRolePermissions(ROLES.SUPER_ADMIN);
    Object.values(PERMISSIONS).forEach(p => expect(perms).toContain(p));
  });

  it('retourne les permissions override pour un role integre avec overrides', () => {
    const overridePerms = [PERMISSIONS.PRODUITS_LIRE, PERMISSIONS.PRODUITS_CREER];
    mockLoadData.mockReturnValue({
      roles_config: [],
      roles_permissions_overrides: { [ROLES.VENDEUR]: overridePerms },
    });
    const perms = getRolePermissions(ROLES.VENDEUR);
    expect(perms).toEqual(overridePerms);
    expect(perms).not.toContain(PERMISSIONS.VENTES_CREER);
  });

  it('retourne un tableau vide si les overrides sont vides', () => {
    mockLoadData.mockReturnValue({
      roles_config: [],
      roles_permissions_overrides: { [ROLES.VENDEUR]: [] },
    });
    expect(getRolePermissions(ROLES.VENDEUR)).toEqual([]);
  });

  it('ignore les overrides des autres roles', () => {
    mockLoadData.mockReturnValue({
      roles_config: [],
      roles_permissions_overrides: { [ROLES.ADMIN]: [PERMISSIONS.ADMIN_STATS] },
    });
    const perms = getRolePermissions(ROLES.VENDEUR);
    expect(perms).toContain(PERMISSIONS.PRODUITS_LIRE);
    expect(perms).not.toContain(PERMISSIONS.ADMIN_PARAMETRES);
  });

  it('retourne les permissions d un role personnalise', () => {
    mockLoadData.mockReturnValue({
      roles_config: [
        { id: 'superviseur', label: 'Superviseur', permissions: [PERMISSIONS.RAPPORTS_LIRE] },
      ],
      roles_permissions_overrides: {},
    });
    expect(getRolePermissions('superviseur')).toEqual([PERMISSIONS.RAPPORTS_LIRE]);
  });

  it('retourne un tableau vide pour un role personnalise sans permissions', () => {
    mockLoadData.mockReturnValue({
      roles_config: [{ id: 'observateur', label: 'Observateur', permissions: [] }],
      roles_permissions_overrides: {},
    });
    expect(getRolePermissions('observateur')).toEqual([]);
  });

  it('priorise le role personnalise et traite les overrides independamment', () => {
    mockLoadData.mockReturnValue({
      roles_config: [
        { id: 'auditeur', label: 'Auditeur', permissions: [PERMISSIONS.RAPPORTS_LIRE] },
      ],
      roles_permissions_overrides: { vendeur: [PERMISSIONS.PRODUITS_LIRE] },
    });
    expect(getRolePermissions('auditeur')).toEqual([PERMISSIONS.RAPPORTS_LIRE]);
    expect(getRolePermissions('vendeur')).toEqual([PERMISSIONS.PRODUITS_LIRE]);
  });

  it('retourne un tableau vide pour un role inconnu', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(getRolePermissions('role_inexistant')).toEqual([]);
  });

  it('retourne les permissions par defaut si loadData plante', () => {
    mockLoadData.mockImplementation(() => {
      throw new Error('Erreur');
    });
    const perms = getRolePermissions(ROLES.VENDEUR);
    expect(perms).toContain(PERMISSIONS.PRODUITS_LIRE);
    expect(perms).toContain(PERMISSIONS.VENTES_CREER);
    expect(perms).not.toContain(PERMISSIONS.UTILISATEURS_LIRE);
  });
});

// ============================================
// hasPermission()
// ============================================
describe('hasPermission()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne false si user est null ou undefined', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(hasPermission(null, PERMISSIONS.PRODUITS_LIRE)).toBe(false);
    expect(hasPermission(undefined, PERMISSIONS.PRODUITS_LIRE)).toBe(false);
  });

  it('retourne false si user na pas de role', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(hasPermission({ nom: 'test' }, PERMISSIONS.PRODUITS_LIRE)).toBe(false);
  });

  it('super_admin a toutes les permissions', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    Object.values(PERMISSIONS).forEach(p => {
      expect(hasPermission({ role: ROLES.SUPER_ADMIN }, p)).toBe(true);
    });
  });

  it('vendeur a les permissions par defaut qui lui sont attribuees', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    const user = { role: ROLES.VENDEUR };
    expect(hasPermission(user, PERMISSIONS.PRODUITS_LIRE)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.VENTES_CREER)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.DEPENSES_LIRE)).toBe(true);
  });

  it('vendeur na pas les permissions hors de ses defauts', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    const user = { role: ROLES.VENDEUR };
    expect(hasPermission(user, PERMISSIONS.UTILISATEURS_LIRE)).toBe(false);
    expect(hasPermission(user, PERMISSIONS.ADMIN_PARAMETRES)).toBe(false);
    expect(hasPermission(user, PERMISSIONS.RAPPORTS_GENERER)).toBe(false);
  });

  it('override ajoute une permission que le role na pas par defaut', () => {
    mockLoadData.mockReturnValue({
      roles_config: [],
      roles_permissions_overrides: {
        [ROLES.VENDEUR]: [PERMISSIONS.PRODUITS_LIRE, PERMISSIONS.VENTES_CREER, PERMISSIONS.UTILISATEURS_LIRE],
      },
    });
    const user = { role: ROLES.VENDEUR };
    expect(hasPermission(user, PERMISSIONS.UTILISATEURS_LIRE)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.DEPENSES_LIRE)).toBe(false);
  });

  it('override vide retire toutes les permissions', () => {
    mockLoadData.mockReturnValue({
      roles_config: [],
      roles_permissions_overrides: { [ROLES.VENDEUR]: [] },
    });
    const user = { role: ROLES.VENDEUR };
    expect(hasPermission(user, PERMISSIONS.PRODUITS_LIRE)).toBe(false);
    expect(hasPermission(user, PERMISSIONS.VENTES_CREER)).toBe(false);
  });

  it('utilisateur avec un role personnalise a ses permissions', () => {
    mockLoadData.mockReturnValue({
      roles_config: [
        { id: 'superviseur', label: 'Superviseur', permissions: [PERMISSIONS.UTILISATEURS_LIRE, PERMISSIONS.RAPPORTS_LIRE] },
      ],
      roles_permissions_overrides: {},
    });
    const user = { role: 'superviseur' };
    expect(hasPermission(user, PERMISSIONS.UTILISATEURS_LIRE)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.RAPPORTS_LIRE)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.ADMIN_PARAMETRES)).toBe(false);
  });

  it('retourne false pour les permissions non attribuees sur tous les roles integres', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });

    // Vendeur - permissions hors defaut
    // Vendeur n'a pas: produits:creer, utilisateurs:*, transport:creer, admin:*
    const vendeur = { role: ROLES.VENDEUR };
    expect(hasPermission(vendeur, PERMISSIONS.UTILISATEURS_CREER)).toBe(false);
    expect(hasPermission(vendeur, PERMISSIONS.ADMIN_PARAMETRES)).toBe(false);
    expect(hasPermission(vendeur, PERMISSIONS.PRODUITS_CREER)).toBe(false);

    // Admin - permissions hors defaut
    // Admin n'a pas: ventes:creer, ventes:modifier, ventes:supprimer
    const admin = { role: ROLES.ADMIN };
    expect(hasPermission(admin, PERMISSIONS.VENTES_CREER)).toBe(false);
    expect(hasPermission(admin, PERMISSIONS.VENTES_MODIFIER)).toBe(false);

    // Livreur - permissions hors defaut
    // Livreur a: transport:lire, transport:confirmer, produits:lire
    // Livreur n'a pas: ventes:creer, admin:stats, utilisateurs:lire
    const livreur = { role: ROLES.LIVREUR };
    expect(hasPermission(livreur, PERMISSIONS.VENTES_CREER)).toBe(false);
    expect(hasPermission(livreur, PERMISSIONS.ADMIN_STATS)).toBe(false);
    expect(hasPermission(livreur, PERMISSIONS.UTILISATEURS_LIRE)).toBe(false);

    // Comptable - permissions hors defaut
    // Comptable n'a pas: produits:*, ventes:creer, utilisateurs:*, transport:*, admin:*
    const comptable = { role: ROLES.COMPTABLE };
    expect(hasPermission(comptable, PERMISSIONS.UTILISATEURS_CREER)).toBe(false);
    expect(hasPermission(comptable, PERMISSIONS.VENTES_CREER)).toBe(false);
    expect(hasPermission(comptable, PERMISSIONS.PRODUITS_LIRE)).toBe(false);

    // Super_Admin a toutes les permissions (jamais false)
    Object.values(PERMISSIONS).forEach(p => {
      expect(hasPermission({ role: ROLES.SUPER_ADMIN }, p)).toBe(true);
    });
  });

  it('retourne false pour un role inconnu', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(hasPermission({ role: 'role_inexistant' }, PERMISSIONS.PRODUITS_LIRE)).toBe(false);
  });

  it('ne plante pas si loadData plante et utilise les permissions par defaut', () => {
    mockLoadData.mockImplementation(() => { throw new Error('Erreur'); });
    const user = { role: ROLES.VENDEUR };
    expect(hasPermission(user, PERMISSIONS.PRODUITS_LIRE)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.UTILISATEURS_LIRE)).toBe(false);
  });
});

// ============================================
// hasAnyPermission()
// ============================================
describe('hasAnyPermission()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne true si au moins une permission est accordee', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    const user = { role: ROLES.VENDEUR };
    expect(hasAnyPermission(user, [PERMISSIONS.PRODUITS_LIRE, PERMISSIONS.ADMIN_PARAMETRES])).toBe(true);
  });

  it('retourne false si aucune permission accordee', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    const user = { role: ROLES.VENDEUR };
    expect(hasAnyPermission(user, [PERMISSIONS.ADMIN_PARAMETRES, PERMISSIONS.UTILISATEURS_LIRE])).toBe(false);
  });

  it('super_admin a toujours true', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(hasAnyPermission({ role: ROLES.SUPER_ADMIN }, [PERMISSIONS.ADMIN_PARAMETRES])).toBe(true);
  });
});

// ============================================
// hasAllPermissions()
// ============================================
describe('hasAllPermissions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne true si toutes les permissions sont accordees', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    const user = { role: ROLES.VENDEUR };
    expect(hasAllPermissions(user, [PERMISSIONS.PRODUITS_LIRE, PERMISSIONS.VENTES_CREER])).toBe(true);
  });

  it('retourne false si une permission manque', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    const user = { role: ROLES.VENDEUR };
    expect(hasAllPermissions(user, [PERMISSIONS.PRODUITS_LIRE, PERMISSIONS.ADMIN_PARAMETRES])).toBe(false);
  });

  it('super_admin a toujours true', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(
      hasAllPermissions(
        { role: ROLES.SUPER_ADMIN },
        [PERMISSIONS.ADMIN_PARAMETRES, PERMISSIONS.UTILISATEURS_SUPPRIMER],
      ),
    ).toBe(true);
  });
});

// ============================================
// getAllRoles()
// ============================================
describe('getAllRoles()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne les 5 roles integres quand aucun role personnalise', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    const roles = getAllRoles();
    expect(roles).toHaveLength(5);
    roles.forEach(r => expect(r.isBuiltIn).toBe(true));
    expect(roles.map(r => r.id)).toEqual(
      expect.arrayContaining(['super_admin', 'admin', 'vendeur', 'livreur', 'comptable']),
    );
  });

  it('inclut les roles personnalises avec isBuiltIn false', () => {
    mockLoadData.mockReturnValue({
      roles_config: [
        { id: 'superviseur', label: 'Superviseur', icon: '⭐', level: 3, permissions: [] },
      ],
      roles_permissions_overrides: {},
    });
    const roles = getAllRoles();
    expect(roles).toHaveLength(6);
    const custom = roles.find(r => r.id === 'superviseur');
    expect(custom).toBeDefined();
    expect(custom.isBuiltIn).toBe(false);
    expect(custom.label).toBe('Superviseur');
  });

  it('preserve les metadonnees des roles integres', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    const roles = getAllRoles();
    const admin = roles.find(r => r.id === 'admin');
    expect(admin.label).toBe('Administrateur');
    expect(admin.icon).toBe('🛡️');
    expect(admin.level).toBe(4);
    expect(admin.isBuiltIn).toBe(true);
  });
});

// ============================================
// isBuiltInRole()
// ============================================
describe('isBuiltInRole()', () => {
  it('retourne true pour les roles integres', () => {
    expect(isBuiltInRole(ROLES.SUPER_ADMIN)).toBe(true);
    expect(isBuiltInRole(ROLES.ADMIN)).toBe(true);
    expect(isBuiltInRole(ROLES.VENDEUR)).toBe(true);
    expect(isBuiltInRole(ROLES.LIVREUR)).toBe(true);
    expect(isBuiltInRole(ROLES.COMPTABLE)).toBe(true);
  });

  it('retourne false pour un role personnalise', () => {
    expect(isBuiltInRole('superviseur')).toBe(false);
    expect(isBuiltInRole('auditeur')).toBe(false);
  });

  it('retourne false pour un role inconnu', () => {
    expect(isBuiltInRole('role_inexistant')).toBe(false);
  });
});

// ============================================
// canAccessRoute()
// ============================================
describe('canAccessRoute()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne false si user est null ou undefined', () => {
    expect(canAccessRoute(null, 'admin')).toBe(false);
    expect(canAccessRoute(undefined, 'admin')).toBe(false);
  });

  it('retourne true si aucun requiredRole', () => {
    expect(canAccessRoute({ role: 'vendeur' }, null)).toBe(true);
    expect(canAccessRoute({ role: 'vendeur' }, undefined)).toBe(true);
    expect(canAccessRoute({ role: 'vendeur' }, '')).toBe(true);
  });

  it('super_admin peut acceder a toutes les routes', () => {
    expect(canAccessRoute({ role: ROLES.SUPER_ADMIN }, 'admin')).toBe(true);
    expect(canAccessRoute({ role: ROLES.SUPER_ADMIN }, 'vendeur')).toBe(true);
    expect(canAccessRoute({ role: ROLES.SUPER_ADMIN }, 'livreur')).toBe(true);
  });

  it('retourne true si le niveau du user est superieur ou egal au requis', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(canAccessRoute({ role: ROLES.ADMIN }, ROLES.VENDEUR)).toBe(true);
    expect(canAccessRoute({ role: ROLES.VENDEUR }, ROLES.LIVREUR)).toBe(true);
    expect(canAccessRoute({ role: ROLES.VENDEUR }, ROLES.VENDEUR)).toBe(true);
  });

  it('retourne false si le niveau du user est inferieur au requis', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(canAccessRoute({ role: ROLES.VENDEUR }, ROLES.ADMIN)).toBe(false);
    expect(canAccessRoute({ role: ROLES.LIVREUR }, ROLES.VENDEUR)).toBe(false);
  });

  it('retourne false si le role du user est inconnu', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(canAccessRoute({ role: 'role_inexistant' }, ROLES.VENDEUR)).toBe(false);
  });
});

// ============================================
// addRole() - CRUD
// ============================================
describe('addRole()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ajoute un nouveau role personnalise avec succes', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    mockSaveData.mockReturnValue(true);

    const result = addRole({
      id: 'superviseur',
      label: 'Superviseur',
      icon: '⭐',
      description: 'Supervise les ventes',
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      level: 3,
      permissions: [PERMISSIONS.PRODUITS_LIRE],
    });

    expect(result.id).toBe('superviseur');
    expect(result.label).toBe('Superviseur');
    expect(result.icon).toBe('⭐');
    expect(result.level).toBe(3);
    expect(result.permissions).toEqual([PERMISSIONS.PRODUITS_LIRE]);
    expect(mockSaveData).toHaveBeenCalledWith('roles_config', expect.arrayContaining([
      expect.objectContaining({ id: 'superviseur' }),
    ]));
  });

  it('applique les valeurs par defaut si non fournies', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    mockSaveData.mockReturnValue(true);

    const result = addRole({ id: 'observateur', label: 'Observateur' });
    expect(result.icon).toBe('🔶');
    expect(result.color).toBe('#6b7280');
    expect(result.bgColor).toBe('#f3f4f6');
    expect(result.description).toBe('');
    expect(result.level).toBe(1);
    expect(result.permissions).toEqual([]);
  });

  it('utilise id comme label si label non fourni', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    mockSaveData.mockReturnValue(true);

    const result = addRole({ id: 'testeur' });
    expect(result.label).toBe('testeur');
  });

  it('jette une erreur si ID existe deja dans les roles personnalises', () => {
    mockLoadData.mockReturnValue({
      roles_config: [{ id: 'superviseur', label: 'Superviseur', permissions: [] }],
      roles_permissions_overrides: {},
    });

    expect(() => addRole({ id: 'superviseur', label: 'Superviseur 2' }))
      .toThrow('Un rôle avec cet identifiant existe déjà');
  });

  it('jette une erreur si ID est un role integre', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });

    expect(() => addRole({ id: 'admin', label: 'Admin 2' }))
      .toThrow('Cet identifiant de rôle est réservé');
    expect(() => addRole({ id: 'vendeur', label: 'Vendeur 2' }))
      .toThrow('Cet identifiant de rôle est réservé');
  });
});

// ============================================
// deleteRole() - CRUD
// ============================================
describe('deleteRole()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('supprime un role personnalise avec succes', () => {
    mockLoadData.mockReturnValue({
      roles_config: [{ id: 'superviseur', label: 'Superviseur', permissions: [] }],
      roles_permissions_overrides: {},
    });
    mockSaveData.mockReturnValue(true);

    const result = deleteRole('superviseur');
    expect(result).toBe(true);
    expect(mockSaveData).toHaveBeenCalledWith('roles_config', []);
  });

  it('jette une erreur si le role est integre', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(() => deleteRole('admin')).toThrow('Impossible de supprimer un rôle intégré');
    expect(() => deleteRole('vendeur')).toThrow('Impossible de supprimer un rôle intégré');
  });

  it('jette une erreur si le role est introuvable', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(() => deleteRole('role_inexistant')).toThrow('Rôle introuvable');
  });
});

// ============================================
// updateRole() - CRUD
// ============================================
describe('updateRole()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('met a jour un role personnalise avec succes', () => {
    mockLoadData.mockReturnValue({
      roles_config: [{ id: 'superviseur', label: 'Superviseur', icon: '⭐', level: 3, permissions: [] }],
      roles_permissions_overrides: {},
    });
    mockSaveData.mockReturnValue(true);

    const result = updateRole('superviseur', { label: 'Superviseur V2', level: 4, color: '#000' });
    expect(result.label).toBe('Superviseur V2');
    expect(result.level).toBe(4);
    expect(result.color).toBe('#000');
    expect(result.icon).toBe('⭐');
    expect(mockSaveData).toHaveBeenCalled();
  });

  it('jette une erreur si le role est integre', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(() => updateRole('admin', { label: 'Admin 2' }))
      .toThrow('Les rôles intégrés ne peuvent pas être renommés');
  });

  it('jette une erreur si le role est introuvable', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    expect(() => updateRole('inexistant', { label: 'Nouveau' }))
      .toThrow('Les rôles intégrés ne peuvent pas être renommés');
  });
});

// ============================================
// updateRolePermissions() - CRUD
// ============================================
describe('updateRolePermissions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('met a jour les permissions d un role personnalise', () => {
    mockLoadData.mockReturnValue({
      roles_config: [{ id: 'superviseur', label: 'Superviseur', permissions: [PERMISSIONS.PRODUITS_LIRE] }],
      roles_permissions_overrides: {},
    });
    mockSaveData.mockReturnValue(true);

    const newPerms = [PERMISSIONS.PRODUITS_LIRE, PERMISSIONS.VENTES_LIRE];
    const result = updateRolePermissions('superviseur', newPerms);
    expect(result.permissions).toEqual(newPerms);
    expect(mockSaveData).toHaveBeenCalledWith('roles_config', expect.arrayContaining([
      expect.objectContaining({ id: 'superviseur', permissions: newPerms }),
    ]));
  });

  it('sauvegarde les overrides pour un role integre', () => {
    mockLoadData
      .mockReturnValueOnce({ roles_config: [], roles_permissions_overrides: {} })
      .mockReturnValueOnce({ roles_config: [], roles_permissions_overrides: {} });
    mockSaveData.mockReturnValue(true);

    const newPerms = [PERMISSIONS.PRODUITS_LIRE, PERMISSIONS.UTILISATEURS_LIRE];
    const result = updateRolePermissions(ROLES.VENDEUR, newPerms);
    expect(result.id).toBe(ROLES.VENDEUR);
    expect(result.permissions).toEqual(newPerms);
    expect(mockSaveData).toHaveBeenCalledWith('roles_permissions_overrides', {
      [ROLES.VENDEUR]: newPerms,
    });
  });

  it('fusionne les nouveaux overrides avec les existants', () => {
    mockLoadData
      .mockReturnValueOnce({ roles_config: [], roles_permissions_overrides: { admin: [PERMISSIONS.ADMIN_STATS] } })
      .mockReturnValueOnce({ roles_config: [], roles_permissions_overrides: { admin: [PERMISSIONS.ADMIN_STATS] } });
    mockSaveData.mockReturnValue(true);

    updateRolePermissions(ROLES.VENDEUR, [PERMISSIONS.PRODUITS_LIRE]);
    expect(mockSaveData).toHaveBeenCalledWith('roles_permissions_overrides', {
      admin: [PERMISSIONS.ADMIN_STATS],
      [ROLES.VENDEUR]: [PERMISSIONS.PRODUITS_LIRE],
    });
  });
});

// ============================================
// getRolesExportData()
// ============================================
describe('getRolesExportData()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne la structure attendue avec version et date', () => {
    mockLoadData.mockReturnValue({
      roles_config: [{ id: 'superviseur', label: 'Superviseur', permissions: [] }],
      roles_permissions_overrides: { vendeur: [PERMISSIONS.PRODUITS_LIRE] },
    });

    const result = getRolesExportData();
    expect(result).toHaveProperty('version', '1.0');
    expect(result).toHaveProperty('exportedAt');
    expect(typeof result.exportedAt).toBe('string');
    expect(result.roles_config).toHaveLength(1);
    expect(result.roles_permissions_overrides).toEqual({ vendeur: [PERMISSIONS.PRODUITS_LIRE] });
  });

  it('retourne des tableaux/objets vides si aucune donnee', () => {
    mockLoadData.mockReturnValue({});

    const result = getRolesExportData();
    expect(result.roles_config).toEqual([]);
    expect(result.roles_permissions_overrides).toEqual({});
  });
});

// ============================================
// exportRolesConfig()
// ============================================
describe('exportRolesConfig()', () => {
  let createObjectURLSpy;
  let revokeObjectURLSpy;
  let appendChildSpy;
  let removeChildSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
  });

  afterEach(() => {
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('retourne les donnees exportees', () => {
    mockLoadData.mockReturnValue({
      roles_config: [{ id: 'superviseur', label: 'Superviseur', permissions: [] }],
      roles_permissions_overrides: {},
    });

    const result = exportRolesConfig();
    expect(result.roles_config).toHaveLength(1);
    expect(result.roles_config[0].id).toBe('superviseur');
  });

  it('cree un element a avec le bon href et le telecharge', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });

    exportRolesConfig();
    expect(createObjectURLSpy).toHaveBeenCalled();
    const anchor = appendChildSpy.mock.calls[0][0];
    expect(anchor.tagName).toBe('A');
    expect(anchor.href).toBe('blob:test-url');
    expect(anchor.download).toMatch(/^kodomarket_roles_config_/);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('cree un blob avec le bon contenu JSON', () => {
    function MockBlob(content, options) {
      this.size = content[0].length;
      this.type = options.type;
    }
    const blobSpy = vi.spyOn(globalThis, 'Blob').mockImplementation(MockBlob);
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });

    exportRolesConfig();
    expect(blobSpy).toHaveBeenCalled();
    const blobCall = blobSpy.mock.calls[0];
    expect(blobCall[1]).toEqual({ type: 'application/json' });
    const parsed = JSON.parse(blobCall[0][0]);
    expect(parsed.version).toBe('1.0');

    blobSpy.mockRestore();
  });
});

// ============================================
// importRolesConfig()
// ============================================
describe('importRolesConfig()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('jette une erreur si jsonData est null ou non-objet', () => {
    expect(() => importRolesConfig(null)).toThrow('Format de fichier invalide');
    expect(() => importRolesConfig('string')).toThrow('Format de fichier invalide');
    expect(() => importRolesConfig(42)).toThrow('Format de fichier invalide');
  });

  it('jette une erreur si roles_config est manquant ou non-array', () => {
    expect(() => importRolesConfig({ version: '1.0' })).toThrow('Le fichier ne contient pas de configuration');
    expect(() => importRolesConfig({ version: '1.0', roles_config: 'string' })).toThrow('Le fichier ne contient pas de configuration');
  });

  it('jette une erreur si version est manquante', () => {
    expect(() => importRolesConfig({ roles_config: [] })).toThrow('Version du fichier non reconnue');
  });

  it('jette une erreur si un role manque id ou label', () => {
    const data = { version: '1.0', roles_config: [{ id: '', label: 'Test' }] };
    expect(() => importRolesConfig(data)).toThrow('identifiant ou label manquant');
  });

  it('jette une erreur si un role a un id integre', () => {
    const data = { version: '1.0', roles_config: [{ id: 'admin', label: 'Admin' }] };
    expect(() => importRolesConfig(data)).toThrow('est un rôle intégré');
  });

  it('importe avec succes et retourne le nombre de roles importes', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    mockSaveData.mockReturnValue(true);

    const data = {
      version: '1.0',
      roles_config: [{ id: 'superviseur', label: 'Superviseur', permissions: [PERMISSIONS.PRODUITS_LIRE] }],
    };

    const result = importRolesConfig(data);
    expect(result.customRolesImported).toBe(1);
    expect(result.customRolesNew).toBe(1);
    expect(mockSaveData).toHaveBeenCalledWith('roles_config', expect.arrayContaining([
      expect.objectContaining({ id: 'superviseur' }),
    ]));
  });

  it('importe les overrides et retourne le bon compte', () => {
    mockLoadData.mockReturnValue({ roles_config: [], roles_permissions_overrides: {} });
    mockSaveData.mockReturnValue(true);

    const data = {
      version: '1.0',
      roles_config: [{ id: 'superviseur', label: 'Superviseur', permissions: [] }],
      roles_permissions_overrides: { vendeur: [PERMISSIONS.PRODUITS_LIRE] },
    };

    const result = importRolesConfig(data);
    expect(result.overridesImported).toBe(1);
    expect(mockSaveData).toHaveBeenCalledWith('roles_permissions_overrides', {
      vendeur: [PERMISSIONS.PRODUITS_LIRE],
    });
  });

  it('fusionne les roles sans creer de doublons', () => {
    mockLoadData.mockReturnValue({
      roles_config: [{ id: 'ancien', label: 'Ancien', permissions: [] }],
      roles_permissions_overrides: {},
    });
    mockSaveData.mockReturnValue(true);

    const data = {
      version: '1.0',
      roles_config: [
        { id: 'nouveau', label: 'Nouveau', permissions: [] },
        { id: 'ancien', label: 'Ancien mis a jour', permissions: [PERMISSIONS.PRODUITS_LIRE] },
      ],
    };

    importRolesConfig(data);
    const savedRoles = mockSaveData.mock.calls.find(c => c[0] === 'roles_config')[1];
    expect(savedRoles).toHaveLength(2);
    // 'ancien' a ete remplace par la nouvelle version
    expect(savedRoles.find(r => r.id === 'ancien').permissions).toEqual([PERMISSIONS.PRODUITS_LIRE]);
  });

  it('fusionne les overrides (nouveaux ecrasent anciens)', () => {
    mockLoadData.mockReturnValue({
      roles_config: [],
      roles_permissions_overrides: { admin: [PERMISSIONS.ADMIN_STATS] },
    });
    mockSaveData.mockReturnValue(true);

    const data = {
      version: '1.0',
      roles_config: [],
      roles_permissions_overrides: {
        admin: [PERMISSIONS.ADMIN_LOGS], // ecrase l'ancien
        vendeur: [PERMISSIONS.PRODUITS_LIRE], // nouveau
      },
    };

    importRolesConfig(data);
    const savedOverrides = mockSaveData.mock.calls.find(c => c[0] === 'roles_permissions_overrides')[1];
    expect(savedOverrides.admin).toEqual([PERMISSIONS.ADMIN_LOGS]);
    expect(savedOverrides.vendeur).toEqual([PERMISSIONS.PRODUITS_LIRE]);
  });
});
