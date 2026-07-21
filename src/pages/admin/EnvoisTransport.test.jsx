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
const mockData = { transport: [{ idEnvoi: 1, paysEnvoi: "France", paysReception: "Cameroun", coutTransport: 50000, statut: "en transit", dateEnvoi: "2024-01-15", produitsEnvoyes: [{ idProduit: 1, quantiteEnvoyee: 20 }] }], produits: [{ idProduit: 1, nomProduit: "Riz Basmati 5kg" }], stock: [] };
vi.mock("../../hooks/useDataQueries", () => ({ useAllData: () => ({ data: qs.isLoading ? undefined : mockData, isLoading: qs.isLoading }), useInvalidateQueries: () => vi.fn(), queryKeys: {} }));
vi.mock("../../services/dashboardService", () => ({ dashboardService: { loadData: () => mockData, saveData: vi.fn() } }));
vi.mock("../../utils/formatters", () => ({ formatCFA: v => (v||0).toLocaleString() + " FCFA" }));

let Comp;
beforeAll(async () => { const m = await import("./EnvoisTransport"); Comp = m.default; });

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(QueryClientProvider, { client: qc }, React.createElement(MemoryRouter, null, React.createElement(Comp))));
}

describe("EnvoisTransport", () => {
  beforeEach(() => { vi.clearAllMocks(); mockHasPermission.mockReturnValue(true); qs.isLoading = false; });
  it("permission refusee", () => { mockHasPermission.mockReturnValue(false); renderIt(); expect(screen.getByText(/Permission refus[eé]e/i)).toBeInTheDocument(); });
  it("loading", () => { qs.isLoading = true; renderIt(); expect(screen.getByText(/Chargement des envois/i)).toBeInTheDocument(); qs.isLoading = false; });
  it("titre", () => { renderIt(); expect(screen.getByText(/Gestion du transport/i)).toBeInTheDocument(); });
  it("stats", () => { renderIt(); expect(screen.getByText("Total envois")).toBeInTheDocument(); });
  it("envois", () => { renderIt(); expect(screen.getByText("France")).toBeInTheDocument(); });
});