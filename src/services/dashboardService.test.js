import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLoadAllData, mockSaveField, mockSaveAllData, mockClearCache } = vi.hoisted(() => ({
  mockLoadAllData: vi.fn(),
  mockSaveField: vi.fn(),
  mockSaveAllData: vi.fn(),
  mockClearCache: vi.fn(),
}));
vi.mock("../services/firebaseService", () => ({ loadAllData: mockLoadAllData, saveField: mockSaveField, saveAllData: mockSaveAllData, clearCache: mockClearCache }));

const localStorageMock = (() => { let s = {}; return { getItem: vi.fn(k => s[k]||null), setItem: vi.fn((k,v) => { s[k]=v; }), removeItem: vi.fn(k => { delete s[k]; }), clear: vi.fn(() => { s={}; }), }; })();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

vi.mock("../data/initialData", () => ({
  initialData: {
    utilisateurs: [{ idUser:1, username:"admin", role:"admin", nomComplet:"Admin", actif:true }, { idUser:2, username:"vendeur1", role:"vendeur", nomComplet:"Jean", actif:true }],
    produits: [{ idProduit:1, nomProduit:"Riz", categorie:"Alim", prixExact:7000, prixBoutique:10000 }, { idProduit:2, nomProduit:"Huile", categorie:"Alim", prixExact:3000, prixBoutique:4500 }],
    ventes: [{ idVente:1, idVendeur:2, totalVente:63500, date:"2024-01-20", typePaiement:"esp", statut:"ok", produitsVendus:[{idProduit:1, quantite:5, prixTotal:50000}] }],
    depenses: [{ idDepense:1, typeDepense:"logistique", montant:37500, date:"2024-01-20" }],
    transport: [{ idEnvoi:1, paysEnvoi:"France", paysReception:"Cameroun", coutTransport:50000, statut:"en transit", dateEnvoi:"2024-01-15" }],
    stock: [{ id:1, idProduit:1, quantiteRestante:50, alerteSeuil:10, quantiteVendue:20 }],
  },
}));

import { dashboardService, initFromFirestore } from "../services/dashboardService";

async function initFresh() { await dashboardService.initializeData(true); }

describe("initFromFirestore", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorageMock.clear(); });
  it("charge Firestore", async () => {
    mockLoadAllData.mockResolvedValue({ utilisateurs:[{idUser:1, username:"fs_admin"}], produits:[] });
    await initFromFirestore();
    expect(dashboardService.loadData().utilisateurs[0].username).toBe("fs_admin");
  });
  it("migre localStorage", async () => {
    mockLoadAllData.mockResolvedValue({});
    localStorageMock.setItem("kodomarket_utilisateurs", JSON.stringify([{idUser:1, username:"local_admin"}]));
    await initFromFirestore();
    expect(mockSaveAllData).toHaveBeenCalled();
  });
  it("charge initialData", async () => {
    mockLoadAllData.mockResolvedValue({});
    await initFromFirestore();
    expect(dashboardService.loadData().produits.length).toBeGreaterThan(0);
  });
});

describe("getStats", () => {
  beforeEach(async () => { vi.clearAllMocks(); await initFresh(); });
  it("retourne les stats", () => {
    const s = dashboardService.getStats();
    expect(s).toHaveProperty("chiffreAffaires");
    expect(s).toHaveProperty("ventesMensuelles");
    expect(s).toHaveProperty("benefices");
  });
});

describe("getVentesRecent", () => {
  beforeEach(async () => { vi.clearAllMocks(); await initFresh(); });
  it("retourne les dernieres ventes", () => {
    const r = dashboardService.getVentesRecent();
    expect(Array.isArray(r)).toBe(true);
    if(r.length > 0) { expect(r[0]).toHaveProperty("produit"); expect(r[0]).toHaveProperty("montant"); }
  });
});

describe("getProduitsPopulaires", () => {
  beforeEach(async () => { vi.clearAllMocks(); await initFresh(); });
  it("retourne top produits", () => {
    const p = dashboardService.getProduitsPopulaires();
    expect(Array.isArray(p)).toBe(true);
    if(p.length > 0) { expect(p[0]).toHaveProperty("nom"); }
  });
});

describe("getAlertes", () => {
  beforeEach(async () => { vi.clearAllMocks(); await initFresh(); });
  it("retourne les alertes", () => { expect(Array.isArray(dashboardService.getAlertes())).toBe(true); });
});

describe("getAllKeys", () => {
  it("retourne les cles", () => {
    const k = dashboardService.getAllKeys();
    expect(k).toContain("utilisateurs");
    expect(k).toContain("produits");
    expect(k).toContain("categories");
  });
});

describe("saveData", () => {
  beforeEach(async () => { vi.clearAllMocks(); mockLoadAllData.mockResolvedValue({utilisateurs:[{idUser:1}]}); await initFromFirestore(); });
  it("sauvegarde et charge", async () => {
    await dashboardService.saveData("produits", [{id:99}]);
    expect(mockSaveField).toHaveBeenCalledWith("produits", [{id:99}]);
    expect(dashboardService.loadData().produits).toEqual([{id:99}]);
  });
});

describe("refreshCache", () => {
  beforeEach(async () => { vi.clearAllMocks(); mockLoadAllData.mockResolvedValue({utilisateurs:[{idUser:1}]}); await initFromFirestore(); });
  it("rafraichit depuis Firestore", async () => {
    mockLoadAllData.mockResolvedValue({produits:[{idProduit:99,nomProduit:"Nouveau"}]});
    const r = await dashboardService.refreshCache();
    expect(r.produits[0].nomProduit).toBe("Nouveau");
  });
});