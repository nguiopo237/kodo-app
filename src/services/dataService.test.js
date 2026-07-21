import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLoadData, mockSaveData } = vi.hoisted(() => ({
  mockLoadData: vi.fn(),
  mockSaveData: vi.fn(),
}));
vi.mock("../services/dashboardService", () => ({ dashboardService: { loadData: mockLoadData, saveData: mockSaveData } }));

const sample = {
  utilisateurs: [{ idUser:1, username:"admin", role:"admin", nomComplet:"Admin" }],
  produits: [{ idProduit:1, nomProduit:"Riz", categorie:"Alim", prixExact:7000, prixBoutique:10000 }],
  ventes: [{ idVente:1, idVendeur:2, totalVente:63500, date:"2024-01-20", typePaiement:"esp", statut:"ok", produitsVendus:[{idProduit:1, quantite:5, prixUnitaire:10000, prixTotal:50000}] }],
  depenses: [{ idDepense:1, typeDepense:"logistique", montant:37500 }],
  transport: [{ idEnvoi:1, coutTransport:50000 }],
  stock: [{ id:1, idProduit:1, quantiteRestante:50, alerteSeuil:10, quantiteVendue:20 }],
  categories: [{ id:1, nom:"Alimentation" }],
};

import { dataService, produitService, venteService, userService, statsService } from "../services/dataService";

beforeEach(() => { vi.clearAllMocks(); mockLoadData.mockReturnValue({...sample}); });

describe("dataService.getAll", () => {
  it("retourne toutes les donnees", () => { const all = dataService.getAll(); expect(all).toHaveProperty("produits"); expect(all).toHaveProperty("ventes"); });
});

describe("dataService.getTable", () => {
  it("retourne une table", () => { const p = dataService.getTable("produits"); expect(Array.isArray(p)).toBe(true); expect(p[0].nomProduit).toBe("Riz"); });
  it("enrichit avec stock", () => { expect(dataService.getTable("produits")[0]).toHaveProperty("quantiteRestante"); });
});

describe("dataService.getById", () => {
  it("retourne element ou null", () => { expect(dataService.getById("produits",1).nomProduit).toBe("Riz"); expect(dataService.getById("produits",999)).toBeNull(); });
});

describe("dataService.add", () => {
  it("ajoute avec nouvel id", () => { const n = dataService.add("produits", {nomProduit:"Test"}); expect(n.idProduit).toBe(2); expect(n.nomProduit).toBe("Test"); });
});

describe("dataService.update", () => {
  it("met a jour existant", () => { const u = dataService.update("produits",1,{nomProduit:"Modifie"}); expect(u.nomProduit).toBe("Modifie"); expect(mockSaveData).toHaveBeenCalled(); });
  it("retourne null si absent", () => { expect(dataService.update("produits",999,{})).toBeNull(); });
});

describe("dataService.delete", () => {
  it("supprime existant", () => { expect(dataService.delete("ventes",1)).toBe(true); expect(mockSaveData).toHaveBeenCalled(); });
  it("retourne false si absent", () => { expect(dataService.delete("ventes",999)).toBe(false); });
});

describe("dataService.getResetSummary", () => {
  it("retourne le resume", () => { const s = dataService.getResetSummary(); expect(s.produits).toBe(1); expect(s.ventes).toBe(1); expect(s.totalCA).toBeGreaterThan(0); });
});

describe("dataService.getStats", () => {
  it("retourne les stats", () => { const s = dataService.getStats(); expect(s).toHaveProperty("totalVentes"); expect(s).toHaveProperty("totalCA"); expect(s).toHaveProperty("benefices"); });
});

describe("dataService.verifierStock", () => {
  it("true si suffisant", () => { expect(dataService.verifierStock(1,10)).toBe(true); });
  it("false si insuffisant", () => { expect(dataService.verifierStock(1,100)).toBe(false); });
});

describe("dataService.mettreAJourStock", () => {
  it("met a jour le stock", () => { expect(dataService.mettreAJourStock(1,5)).toBe(true); });
});

describe("produitService", () => {
  it("CRUD operations", () => { expect(produitService.getAll().length).toBe(1); expect(produitService.getById(1).nomProduit).toBe("Riz"); const p = produitService.create({nomProduit:"Nv"}); expect(p.idProduit).toBe(2); });
});

describe("venteService", () => {
  it("getAll", () => { expect(venteService.getAll().length).toBe(1); });
});

describe("userService", () => {
  it("getAll", () => { expect(userService.getAll().length).toBe(1); });
});

describe("statsService", () => {
  it("get", () => { const s = statsService.get(); expect(s).toHaveProperty("totalCA"); });
});