import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

const mockHasPermission = vi.fn();
const mockUser = { idUser: 1, username: "admin", role: "admin", nomComplet: "Admin" };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasPermission: mockHasPermission, user: mockUser }) }));
vi.mock("../../context/NotificationContext", () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }) }));
vi.mock("../../services/backupService", () => ({ backupService: { exporterDonnees: vi.fn(), importerDonnees: () => Promise.resolve() } }));
vi.mock("../../services/syncService", () => ({ syncService: { genererLienPartage: () => "http://share.link" } }));
vi.mock("../../services/dataService", () => ({ dataService: { getResetSummary: () => ({ produits: 5, ventes: 10, transport: 2, depenses: 3, totalCA: 150000, totalDepenses: 75000 }), reinitialiser: () => Promise.resolve() } }));

let Comp;
beforeAll(async () => { const m = await import("./Parametres"); Comp = m.default; });

function renderIt() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Comp)));
}

describe("Parametres", () => {
  beforeEach(() => { vi.clearAllMocks(); mockHasPermission.mockReturnValue(true); });
  it("permission refusee", () => { mockHasPermission.mockReturnValue(false); renderIt(); expect(screen.getByText(/Permission refus[eé]e/i)).toBeInTheDocument(); });
  it("titre", () => { renderIt(); expect(screen.getByText(/Gestion des données/i)).toBeInTheDocument(); });
  it("export", () => { renderIt(); expect(screen.getByText(/Exporter les données/i)).toBeInTheDocument(); });
  it("import", () => { renderIt(); expect(screen.getByText(/Importer des données/i)).toBeInTheDocument(); });
  it("partage", () => { renderIt(); expect(screen.getByText(/Partager les données/i)).toBeInTheDocument(); });
});