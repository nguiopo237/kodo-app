import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockHasPermission = vi.fn();
const mockUser = { idUser: 1, username: "admin", role: "admin", nomComplet: "Admin" };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasPermission: mockHasPermission, user: mockUser }) }));
vi.mock("../../context/NotificationContext", () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }));

const qs = { isLoading: false };
const mockData = { ventes: [{ idVente: 1, idVendeur: 2, totalVente: 63500, date: "2024-01-20T10:30:00", typePaiement: "espèces", statut: "complétée", produitsVendus: [{ idProduit: 1, quantite: 5, prixTotal: 50000 }] }], depenses: [{ idDepense: 1, typeDepense: "logistique", montant: 37500 }], transport: [{ idEnvoi: 1, coutTransport: 50000 }], produits: [{ idProduit: 1, nomProduit: "Riz Basmati 5kg", prixExact: 7000 }] };
vi.mock("../../hooks/useDataQueries", () => ({ useAllData: () => ({ data: qs.isLoading ? undefined : mockData, isLoading: qs.isLoading }) }));
vi.mock("../../utils/formatters", () => ({ formatCFA: v => (v||0).toLocaleString() + " FCFA" }));

let Comp;
beforeAll(async () => { const m = await import("./ComptabiliteAdmin"); Comp = m.default; });

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(QueryClientProvider, { client: qc }, React.createElement(MemoryRouter, null, React.createElement(Comp))));
}

describe("ComptabiliteAdmin", () => {
  beforeEach(() => { vi.clearAllMocks(); mockHasPermission.mockReturnValue(true); qs.isLoading = false; });
  it("permission refusee", () => { mockHasPermission.mockReturnValue(false); renderIt(); expect(screen.getByText(/Permission refus[eé]e/i)).toBeInTheDocument(); });
  it("loading", () => { qs.isLoading = true; renderIt(); expect(screen.getByText(/Chargement des données comptables/i)).toBeInTheDocument(); qs.isLoading = false; });
  it("titre", () => { renderIt(); expect(screen.getByText(/Comptabilit[eé]/i)).toBeInTheDocument(); });
  it("kpis", () => { renderIt(); expect(screen.getAllByText(/Chiffre d'affaires/i).length).toBeGreaterThanOrEqual(1); });
  it("periode", () => { renderIt(); expect(screen.getByText("Toute la période")).toBeInTheDocument(); });
});