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

const qs = { isLoading: false };
const mockCats = [{ id: 1, nom: 'Alimentation', icon: '🍎', couleur: '#10b981' }];
const mockProds = [
  { idProduit: 1, nomProduit: 'Riz Basmati 5kg', categorie: 'Alimentation', prixExact: 7000, prixBoutique: 10000, quantiteRestante: 50, alerteSeuil: 10, quantiteVendue: 20, codeBarre: 'KODO-001', categorieCouleur: '#10b981', categorieIcon: '🍎' },
  { idProduit: 2, nomProduit: 'Café Arabica 1kg', categorie: 'Alimentation', prixExact: 3000, prixBoutique: 4500, quantiteRestante: 5, alerteSeuil: 10, quantiteVendue: 15, codeBarre: 'KODO-002', categorieCouleur: '#10b981', categorieIcon: '🍎' },
];

vi.mock('../../hooks/useDataQueries', () => ({
  useProduits: () => ({ data: qs.isLoading ? undefined : mockProds, isLoading: qs.isLoading }),
  useCategories: () => ({ data: qs.isLoading ? undefined : mockCats, isLoading: qs.isLoading }),
  useInvalidateQueries: () => vi.fn(),
  queryKeys: { produits: 'produits', categories: 'categories', stock: 'stock', stats: 'stats' },
}));

vi.mock('../../services/produitService', () => ({ produitService: { ajouterProduit: vi.fn(), mettreAJourProduit: vi.fn(), supprimerProduit: vi.fn() } }));
vi.mock('../../services/categorieService', () => ({ categorieService: { getCategories: () => mockCats, ajouterCategorie: vi.fn() } }));
vi.mock('../../utils/formatters', () => ({ formatCFA: (v) => (v || 0).toLocaleString('fr-FR') + ' FCFA' }));
vi.mock('../../components/EtiquetteProduit', () => ({ ImprimerEtiquettes: () => null, genererCodeBarre: () => '' }));
vi.mock('../../components/BarcodeCell', () => ({ default: () => null }));

describe('GestionProduits - Permission', () => {
  beforeEach(() => { vi.clearAllMocks(); mockHasPermission.mockReturnValue(false); qs.isLoading = false; });
  it('affiche permission refusee', () => { renderIt(); expect(screen.getByText(/Permission refus[eé]e/i)).toBeInTheDocument(); });
});

describe('GestionProduits - Loading', () => {
  beforeEach(() => { vi.clearAllMocks(); mockHasPermission.mockReturnValue(true); });
  it('affiche le spinner', () => { qs.isLoading = true; renderIt(); expect(screen.getByText(/Chargement des produits/i)).toBeInTheDocument(); qs.isLoading = false; });
});

let Comp;
beforeAll(async () => { const m = await import("./GestionProduits"); Comp = m.default; });

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(QueryClientProvider, { client: qc }, React.createElement(MemoryRouter, null, React.createElement(Comp))));
}

describe('GestionProduits - Rendu', () => {
  beforeEach(() => { vi.clearAllMocks(); mockHasPermission.mockReturnValue(true); qs.isLoading = false; });
  it('affiche le titre', () => { renderIt(); expect(screen.getByText(/Gestion des produits/i)).toBeInTheDocument(); });
  it('affiche les stats', () => { renderIt(); expect(screen.getByText('Total produits')).toBeInTheDocument(); });
  it('affiche les produits', () => { renderIt(); expect(screen.getByText('Riz Basmati 5kg')).toBeInTheDocument(); });
  it('affiche le bouton nouveau produit', () => { renderIt(); expect(screen.getByText(/Nouveau produit/i)).toBeInTheDocument(); });
});
