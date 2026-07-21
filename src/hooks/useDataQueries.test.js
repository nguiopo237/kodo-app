import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ============ MOCKS ============
const mockAllData = {
  ventes: [{ idVente: 1, totalVente: 63500 }],
  produits: [{ idProduit: 1, nomProduit: "Riz" }],
  utilisateurs: [{ idUser: 1, nomComplet: "Admin" }],
  depenses: [{ idDepense: 1, montant: 5000 }],
  transport: [{ idEnvoi: 1 }],
  categories: [{ id: 1, nom: "Alimentation" }],
  stock: [],
};

const mockStats = { totalCA: 150000, totalVentes: 45, benefices: 45000 };
const mockProduits = [{ idProduit: 1, nomProduit: "Riz" }];
const mockVentes = [{ idVente: 1, totalVente: 63500 }];

vi.mock("../services/dataService", () => ({
  dataService: {
    getAll: vi.fn(() => Promise.resolve(mockAllData)),
    getTable: vi.fn((t) => {
      const tables = { ventes: mockVentes, produits: mockProduits, depenses: [], transport: [], utilisateurs: [], categories: [] };
      return Promise.resolve(tables[t] || []);
    }),
    getStats: vi.fn(() => Promise.resolve(mockStats)),
    add: vi.fn((t, item) => Promise.resolve({ id: 99, ...item })),
    update: vi.fn((t, id, updates) => Promise.resolve({ id, ...updates })),
    delete: vi.fn((t, id) => Promise.resolve(true)),
  },
  produitService: { getAll: vi.fn(() => Promise.resolve(mockProduits)) },
}));

vi.mock("../services/venteService", () => ({
  venteService: {
    getVentesDetaillees: vi.fn(() => Promise.resolve(mockVentes)),
  },
}));

vi.mock("../services/dashboardService", () => ({
  dashboardService: {},
}));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

// ============ IMPORTS APRES MOCKS ============
const {
  queryKeys,
  useAllData,
  useProduits,
  useVentes,
  useDepenses,
  useTransport,
  useUtilisateurs,
  useStats,
  useCategories,
  useInvalidateQueries,
  useAddItem,
  useUpdateItem,
  useDeleteItem,
} = await import("../hooks/useDataQueries");

// ============ TESTS ============
describe("queryKeys", () => {
  it("contient toutes les cles", () => {
    expect(queryKeys).toHaveProperty("produits");
    expect(queryKeys).toHaveProperty("ventes");
    expect(queryKeys).toHaveProperty("depenses");
    expect(queryKeys).toHaveProperty("transport");
    expect(queryKeys).toHaveProperty("utilisateurs");
    expect(queryKeys).toHaveProperty("stock");
    expect(queryKeys).toHaveProperty("categories");
    expect(queryKeys).toHaveProperty("stats");
    expect(queryKeys).toHaveProperty("roles");
    expect(queryKeys).toHaveProperty("all");
  });
});

describe("useAllData", () => {
  it("retourne un objet avec data et isLoading", async () => {
    const { result } = renderHook(() => useAllData(), { wrapper: createWrapper() });
    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockAllData);
  });
});

describe("useProduits", () => {
  it("retourne les produits", async () => {
    const { result } = renderHook(() => useProduits(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockProduits);
  });
});

describe("useVentes", () => {
  it("retourne les ventes", async () => {
    const { result } = renderHook(() => useVentes(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockVentes);
  });
});

describe("useDepenses", () => {
  it("retourne les depenses", async () => {
    const { result } = renderHook(() => useDepenses(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe("useTransport", () => {
  it("retourne le transport", async () => {
    const { result } = renderHook(() => useTransport(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe("useUtilisateurs", () => {
  it("retourne les utilisateurs", async () => {
    const { result } = renderHook(() => useUtilisateurs(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe("useStats", () => {
  it("retourne les stats", async () => {
    const { result } = renderHook(() => useStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockStats);
  });
});

describe("useCategories", () => {
  it("retourne les categories", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe("useInvalidateQueries", () => {
  it("retourne une fonction qui invalide le cache", () => {
    const { result } = renderHook(() => useInvalidateQueries(), { wrapper: createWrapper() });
    expect(typeof result.current).toBe("function");
  });
  it("appelle invalidateQueries avec les bonnes cles", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useInvalidateQueries(), {
      wrapper: function Wrapper({ children }) {
        return React.createElement(QueryClientProvider, { client: qc }, children);
      },
    });
    act(() => { result.current("ventes", "stock"); });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith({ queryKey: ["ventes"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["stock"] });
  });
});

describe("useAddItem", () => {
  it("retourne un objet mutation avec mutate", () => {
    const { result } = renderHook(() => useAddItem("ventes"), { wrapper: createWrapper() });
    expect(result.current).toHaveProperty("mutate");
    expect(result.current).toHaveProperty("mutateAsync");
  });
});

describe("useUpdateItem", () => {
  it("retourne un objet mutation avec mutate", () => {
    const { result } = renderHook(() => useUpdateItem("ventes"), { wrapper: createWrapper() });
    expect(result.current).toHaveProperty("mutate");
  });
});

describe("useDeleteItem", () => {
  it("retourne un objet mutation avec mutate", () => {
    const { result } = renderHook(() => useDeleteItem("ventes"), { wrapper: createWrapper() });
    expect(result.current).toHaveProperty("mutate");
  });
});