import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockHasPermission = vi.fn();
const mockUser = { idUser: 1, username: 'admin', role: 'admin', nomComplet: 'Admin' };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ hasPermission: mockHasPermission, user: mockUser }) }));

vi.mock('../../context/NotificationContext', () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }));

const qs = { isLoading: false };
const mockCats = [{ id: 1, nom: 'Alimentation', icon: '🍎', couleur: '#10b981' }];
const mockProds = [{ idProduit: 1, nomProduit: 'Riz Basmati 5kg', categorie: 'Alimentation', prixExact: 7000, prixBoutique: 10000, quantiteRestante: 50, alerteSeuil: 10, quantiteVendue: 20 }];

vi.mock('../../hooks/useDataQueries', () => ({ useCategories: () => ({ data: qs.isLoading ? undefined : mockCats, isLoading: qs.isLoading }), useProduits: () => ({ data: qs.isLoading ? undefined : mockProds, isLoading: qs.isLoading }), useInvalidateQueries: () => vi.fn(), queryKeys: {} }));
vi.mock('../../services/categorieService', () => ({ categorieService: { getCategories: () => mockCats, ajouterCategorie: vi.fn() } }));
vi.mock('../../services/produitService', () => ({ produitService: { ajouterProduit: vi.fn(), mettreAJourProduit: vi.fn(), supprimerProduit: vi.fn() } }));
vi.mock('../../utils/formatters', () => ({ formatCFA: v => (v||0).toLocaleString() + ' FCFA' }));
vi.mock('../../components/EtiquetteProduit', () => ({ ImprimerEtiquettes: () => null, genererCodeBarre: () => '' }));
vi.mock('../../components/BarcodeCell', () => ({ default: () => null }));

let Comp;
beforeAll(async () => { const m = await import("./GestionComplete"); Comp = m.default; });

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(QueryClientProvider, { client: qc }, React.createElement(MemoryRouter, null, React.createElement(Comp))));
}

describe('GestionComplete', () => {
  beforeEach(() => { vi.clearAllMocks(); mockHasPermission.mockReturnValue(true); qs.isLoading = false; });
  it('permission refusee', () => { mockHasPermission.mockReturnValue(false); renderIt(); expect(screen.getByText(/Permission refus[eé]e/i)).toBeInTheDocument(); });
  it('loading', () => { qs.isLoading = true; renderIt(); expect(screen.getByText(/Chargement/i)).toBeInTheDocument(); qs.isLoading = false; });
  it('titre', () => { renderIt(); expect(screen.getAllByText(/Gestion Compl[eè]te/i).length).toBeGreaterThanOrEqual(1); });
});
