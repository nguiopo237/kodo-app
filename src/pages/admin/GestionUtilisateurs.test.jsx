import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockHasPermission = vi.fn();
const mockUser = { idUser: 1, username: 'admin', role: 'admin', nomComplet: 'Admin' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ hasPermission: mockHasPermission, user: mockUser }),
}));

const mockWarn = vi.fn();
vi.mock('../../context/NotificationContext', () => ({
  useNotification: () => ({ success: vi.fn(), error: vi.fn(), warning: mockWarn }),
}));

vi.mock('../../services/roleService', () => ({
  getAllRoles: () => [
    { id: 'admin', label: 'Administrateur', icon: '👑', color: '#7c3aed', bgColor: '#ede9fe', description: 'Accès complet', level: 5, isBuiltIn: true },
    { id: 'vendeur', label: 'Vendeur', icon: '🛒', color: '#059669', bgColor: '#d1fae5', description: 'Gestion des ventes', level: 2, isBuiltIn: true },
  ],
  getRoleMetadata: (r) => ({ label: r === 'admin' ? 'Administrateur' : 'Vendeur', icon: r === 'admin' ? '👑' : '🛒', color: r === 'admin' ? '#7c3aed' : '#059669', bgColor: r === 'admin' ? '#ede9fe' : '#d1fae5' }),
  getRolePermissions: () => ['utilisateurs:lire'],
}));

const qs = { isLoading: false };
const mockUsers = [
  { idUser: 1, username: 'admin', role: 'admin', nomComplet: 'Admin', email: 'admin@kodomarket.com', localisation: 'Douala', actif: true, dateCreation: '2024-01-01' },
  { idUser: 2, username: 'vendeur1', role: 'vendeur', nomComplet: 'Jean Dupont', email: 'jean@example.com', localisation: 'Douala', actif: true, dateCreation: '2024-01-02' },
];

vi.mock('../../hooks/useDataQueries', () => ({
  useUtilisateurs: () => ({ data: qs.isLoading ? undefined : mockUsers, isLoading: qs.isLoading }),
  useInvalidateQueries: () => vi.fn(),
  queryKeys: { utilisateurs: 'utilisateurs' },
}));

vi.mock('../../services/dashboardService', () => ({ dashboardService: { loadData: () => ({ utilisateurs: mockUsers }), saveData: vi.fn() } }));
vi.mock('bcryptjs', () => ({ hashSync: (p, s) => p + '_hashed', compareSync: (p, h) => p === 'admin123' }));

let Comp;
beforeAll(async () => { const m = await import("./GestionUtilisateurs"); Comp = m.default; });

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(QueryClientProvider, { client: qc }, React.createElement(MemoryRouter, null, React.createElement(Comp))));
}

describe('GestionUtilisateurs', () => {
  beforeEach(() => { vi.clearAllMocks(); mockHasPermission.mockReturnValue(true); qs.isLoading = false; });

  it('affiche permission refusee', () => { mockHasPermission.mockReturnValue(false); renderIt(); expect(screen.getByText(/Permission refus[eé]e/i)).toBeInTheDocument(); });
  it('affiche le spinner', () => { qs.isLoading = true; renderIt(); expect(screen.getByText(/Chargement des utilisateurs/i)).toBeInTheDocument(); qs.isLoading = false; });
  it('affiche le titre', () => { renderIt(); expect(screen.getByText(/Gestion des utilisateurs/i)).toBeInTheDocument(); });
  it('affiche les stats', () => { renderIt(); expect(screen.getByText('Total utilisateurs')).toBeInTheDocument(); expect(screen.getByText('Administrateurs')).toBeInTheDocument(); expect(screen.getByText('Vendeurs')).toBeInTheDocument(); });
  it('affiche les utilisateurs', () => { renderIt(); expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1); });
  it('affiche les roles disponibles', () => { renderIt(); expect(screen.getByText(/R[oô]les disponibles/i)).toBeInTheDocument(); });
  it('affiche le bouton nouvel utilisateur', () => { renderIt(); expect(screen.getByText(/Nouvel utilisateur/i)).toBeInTheDocument(); });
});
