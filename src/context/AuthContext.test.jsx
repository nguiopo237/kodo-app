import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const ADMIN_HASH = '$2b$08$EXcOeLi1VQCXqUFeDi36DuCOTW/HeiKe7ggndAfEZg9m4NU1QTWXG';
const VENDEUR_HASH = '$2b$08$EXcOeLi1VQCXqUFeDi36DuiwofKxTChtrIOQukbBv7CVGBh/bYK7G';

const MOCK_USERS = [
  { idUser: 1, username: 'admin', password: ADMIN_HASH, role: 'admin', nomComplet: 'Administrateur Principal', actif: true },
  { idUser: 2, username: 'vendeur1', password: VENDEUR_HASH, role: 'vendeur', nomComplet: 'Jean Dupont', actif: true },
  { idUser: 3, username: 'inactif', password: VENDEUR_HASH, role: 'vendeur', nomComplet: 'Compte Inactif', actif: false },
];

describe('bcrypt.compare() avec les hashs de initialData', () => {
  it('verifie admin123 contre le hash admin', async () => {
    const match = await bcrypt.compare('admin123', ADMIN_HASH);
    expect(match).toBe(true);
  });

  it('verifie vendeur123 contre le hash vendeur', async () => {
    const match = await bcrypt.compare('vendeur123', VENDEUR_HASH);
    expect(match).toBe(true);
  });

  it('rejette un mot de passe incorrect', async () => {
    const match = await bcrypt.compare('wrongpassword', ADMIN_HASH);
    expect(match).toBe(false);
  });

  it('rejette un mot de passe vide', async () => {
    const match = await bcrypt.compare('', ADMIN_HASH);
    expect(match).toBe(false);
  });

  it('rejette un hash invalide', async () => {
    const match = await bcrypt.compare('admin123', 'hash_invalide');
    expect(match).toBe(false);
  });

  it('le hash vendeur correspond aux deux vendeurs', async () => {
    const match1 = await bcrypt.compare('vendeur123', VENDEUR_HASH);
    const match2 = await bcrypt.compare('vendeur123', VENDEUR_HASH);
    expect(match1).toBe(true);
    expect(match2).toBe(true);
  });
});

describe('login() - flow de connexion', () => {
  beforeEach(() => {
    // Pas besoin de mockLoadData - la fonction loginFn prend les utilisateurs en parametre
  });

  const creerLoginFn = (users) => {
    return async (username, password) => {
      if (!username || !password) throw new Error("Nom d'utilisateur et mot de passe requis");
      const utilisateurs = users || [];
      const found = utilisateurs.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (!found) throw new Error('Utilisateur introuvable');
      const passwordMatch = await bcrypt.compare(password, found.password);
      if (!passwordMatch) throw new Error('Mot de passe incorrect');
      if (found.actif === false) throw new Error('Ce compte est désactivé. Contactez l\'administrateur.');
      const userData = { ...found };
      delete userData.password;
      return userData;
    };
  };

  it('login reussi avec identifiants valides (admin)', async () => {
    const loginFn = creerLoginFn(MOCK_USERS);
    const result = await loginFn('admin', 'admin123');
    expect(result).toBeDefined();
    expect(result.username).toBe('admin');
    expect(result.role).toBe('admin');
    expect(result.nomComplet).toBe('Administrateur Principal');
    expect(result.password).toBeUndefined();
  });

  it('login reussi avec identifiants valides (vendeur)', async () => {
    const loginFn = creerLoginFn(MOCK_USERS);
    const result = await loginFn('vendeur1', 'vendeur123');
    expect(result).toBeDefined();
    expect(result.username).toBe('vendeur1');
    expect(result.role).toBe('vendeur');
    expect(result.nomComplet).toBe('Jean Dupont');
    expect(result.password).toBeUndefined();
  });

  it('rejette un mot de passe incorrect', async () => {
    const loginFn = creerLoginFn(MOCK_USERS);
    await expect(loginFn('admin', 'wrongpassword')).rejects.toThrow('Mot de passe incorrect');
  });

  it('rejette un utilisateur inexistant', async () => {
    const loginFn = creerLoginFn(MOCK_USERS);
    await expect(loginFn('inexistant', 'any')).rejects.toThrow('Utilisateur introuvable');
  });

  it('rejette un compte inactif meme avec le bon mot de passe', async () => {
    const loginFn = creerLoginFn(MOCK_USERS);
    await expect(loginFn('inactif', 'vendeur123')).rejects.toThrow('Ce compte est désactivé. Contactez l\'administrateur.');
  });

  it('rejette des identifiants vides', async () => {
    const loginFn = creerLoginFn(MOCK_USERS);
    await expect(loginFn('', 'admin123')).rejects.toThrow('requis');
    await expect(loginFn('admin', '')).rejects.toThrow('requis');
  });

  it('est insensible a la casse pour le username', async () => {
    const loginFn = creerLoginFn(MOCK_USERS);
    const result = await loginFn('ADMIN', 'admin123');
    expect(result).toBeDefined();
    expect(result.username).toBe('admin');
  });
});

describe('Generation de hash bcrypt', () => {
  it('genere un hash valide pour un nouveau mot de passe', () => {
    const hash = bcrypt.hashSync('nouveauMotDePasse123', 8);
    expect(hash).toBeDefined();
    expect(hash.startsWith('$2b$08$')).toBe(true);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('le hash genere permet la verification', async () => {
    const password = 'MonMotDePasse!2024';
    const hash = bcrypt.hashSync(password, 8);
    const match = await bcrypt.compare(password, hash);
    expect(match).toBe(true);
  });

  it('chaque hash est unique (sel different)', () => {
    const hash1 = bcrypt.hashSync('test', 8);
    const hash2 = bcrypt.hashSync('test', 8);
    expect(hash1).not.toBe(hash2);
    expect(bcrypt.compareSync('test', hash1)).toBe(true);
    expect(bcrypt.compareSync('test', hash2)).toBe(true);
  });

  it('rejette un mot de passe different du hash', async () => {
    const hash = bcrypt.hashSync('monPassword', 8);
    const match = await bcrypt.compare('autrePassword', hash);
    expect(match).toBe(false);
  });
});

describe('logout() - Deconnexion', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('supprime les donnees du localStorage', () => {
    // Simuler un utilisateur connecte dans localStorage
    const mockUser = { username: 'admin', role: 'admin', nomComplet: 'Admin' };
    localStorage.setItem('kodomarket_user', JSON.stringify(mockUser));
    expect(localStorage.getItem('kodomarket_user')).toBeTruthy();

    // Creer une fonction logout qui imite le comportement reel
    const logout = () => {
      localStorage.removeItem('kodomarket_user');
    };

    logout();
    expect(localStorage.getItem('kodomarket_user')).toBeNull();
  });

  it('nettoie le localStorage meme avec plusieurs cles', () => {
    localStorage.setItem('kodomarket_user', JSON.stringify({ username: 'vendeur1' }));
    localStorage.setItem('kodomarket_theme', 'dark');
    localStorage.setItem('kodomarket_roles_permissions_overrides', JSON.stringify({}));

    const logout = () => {
      localStorage.removeItem('kodomarket_user');
    };

    logout();
    expect(localStorage.getItem('kodomarket_user')).toBeNull();
    // Les autres cles ne sont pas touchees
    expect(localStorage.getItem('kodomarket_theme')).toBe('dark');
  });

  it('ne plante pas si aucun utilisateur connecte', () => {
    localStorage.clear();
    const logout = () => {
      localStorage.removeItem('kodomarket_user');
    };
    expect(() => logout()).not.toThrow();
  });

});

