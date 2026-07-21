import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

const mockHasPermission = vi.fn();
const mockUser = { idUser: 1, username: "admin", role: "admin", nomComplet: "Admin" };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasPermission: mockHasPermission, user: mockUser }) }));
vi.mock("../../context/NotificationContext", () => ({ useNotification: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }));
vi.mock("../../services/roleService", () => ({
  getAllRoles: () => [
    { id: "admin", label: "Administrateur", icon: "👑", color: "#7c3aed", bgColor: "#ede9fe", description: "Accès complet", level: 5, isBuiltIn: true },
    { id: "vendeur", label: "Vendeur", icon: "🛒", color: "#059669", bgColor: "#d1fae5", description: "Gestion ventes", level: 2, isBuiltIn: true },
  ],
  getRolePermissions: () => ["produits:lire"],
  PERMISSION_GROUPS: { "Produits": ["produits:lire"] },
  PERMISSION_LABELS: { "produits:lire": "Voir les produits" },
  PERMISSIONS: { PRODUITS_LIRE: "produits:lire" },
  updateRolePermissions: vi.fn(),
  addRole: vi.fn(), deleteRole: vi.fn(), updateRole: vi.fn(),
  isBuiltInRole: id => id === "admin" || id === "vendeur",
}));

let Comp;
beforeAll(async () => { const m = await import("./GestionRoles"); Comp = m.default; });

function renderIt() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Comp)));
}

describe("GestionRoles", () => {
  beforeEach(() => { vi.clearAllMocks(); mockHasPermission.mockReturnValue(true); });
  it("permission refusee", () => { mockHasPermission.mockReturnValue(false); renderIt(); expect(screen.getByText(/Permission refus[eé]e/i)).toBeInTheDocument(); });
  it("titre", () => { renderIt(); expect(screen.getByText(/Gestion des r[oô]les/i)).toBeInTheDocument(); });
  it("stats", () => { renderIt(); expect(screen.getByText(/R[oô]les disponibles/i)).toBeInTheDocument(); });
  it("roles", () => { renderIt(); expect(screen.getByText("Administrateur")).toBeInTheDocument(); });
  it("bouton nouveau role", () => { renderIt(); expect(screen.getAllByText(/Nouveau r[oô]le/i).length).toBeGreaterThanOrEqual(1); });
});