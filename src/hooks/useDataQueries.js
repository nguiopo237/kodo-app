import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { dataService, produitService } from '../services/dataService';
import { venteService } from '../services/venteService';

// ============================================
// CLEFS DE QUERY
// ============================================
export const queryKeys = {
  produits: 'produits',
  ventes: 'ventes',
  depenses: 'depenses',
  transport: 'transport',
  utilisateurs: 'utilisateurs',
  stock: 'stock',
  categories: 'categories',
  stats: 'stats',
  roles: 'roles',
  rolesConfig: 'roles_config',
  all: 'allData',
};

// ============================================
// FONCTIONS DE REQUETE
// ============================================
const fetchAllData = () => {
  return dataService.getAll();
};

const fetchProduits = () => {
  return produitService.getAll();
};

const fetchVentes = () => {
  return venteService.getVentesDetaillees();
};

const fetchDepenses = () => {
  return dataService.getTable('depenses');
};

const fetchTransport = () => {
  return dataService.getTable('transport');
};

const fetchUtilisateurs = () => {
  return dataService.getTable('utilisateurs');
};

const fetchStats = () => {
  return dataService.getStats();
};

const fetchCategories = () => {
  return dataService.getTable('categories');
};

// ============================================
// HOOKS USEQUERY
// ============================================

/**
 * Hook principal - toutes les données
 */
export const useAllData = () => {
  return useQuery({
    queryKey: [queryKeys.all],
    queryFn: fetchAllData,
    staleTime: 30_000, // 30s avant re-fetch
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook produits
 */
export const useProduits = () => {
  return useQuery({
    queryKey: [queryKeys.produits],
    queryFn: fetchProduits,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook ventes
 */
export const useVentes = () => {
  return useQuery({
    queryKey: [queryKeys.ventes],
    queryFn: fetchVentes,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook depenses
 */
export const useDepenses = () => {
  return useQuery({
    queryKey: [queryKeys.depenses],
    queryFn: fetchDepenses,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook transport
 */
export const useTransport = () => {
  return useQuery({
    queryKey: [queryKeys.transport],
    queryFn: fetchTransport,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook utilisateurs
 */
export const useUtilisateurs = () => {
  return useQuery({
    queryKey: [queryKeys.utilisateurs],
    queryFn: fetchUtilisateurs,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook stats
 */
export const useStats = () => {
  return useQuery({
    queryKey: [queryKeys.stats],
    queryFn: fetchStats,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook categories
 */
export const useCategories = () => {
  return useQuery({
    queryKey: [queryKeys.categories],
    queryFn: fetchCategories,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

// ============================================
// HOOK USEMUTATION
// ============================================

/**
 * Hook pour invalider le cache apres une mutation
 * Exemple : apres avoir cree une vente, invalide 'ventes', 'stock', 'stats'
 */
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();

  const invalidate = (...keys) => {
    keys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  return invalidate;
};

/**
 * Mutation generique pour ajouter un element
 */
export const useAddItem = (tableName) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQueries();

  return useMutation({
    mutationFn: (item) => dataService.add(tableName, item),
    onSuccess: () => {
      invalidate(tableName, queryKeys.stats);
    },
  });
};

/**
 * Mutation generique pour mettre a jour un element
 */
export const useUpdateItem = (tableName) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQueries();

  return useMutation({
    mutationFn: ({ id, updates }) => dataService.update(tableName, id, updates),
    onSuccess: () => {
      invalidate(tableName, queryKeys.stats);
    },
  });
};

/**
 * Mutation generique pour supprimer un element
 */
export const useDeleteItem = (tableName) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQueries();

  return useMutation({
    mutationFn: (id) => dataService.delete(tableName, id),
    onSuccess: () => {
      invalidate(tableName, queryKeys.stats);
    },
  });
};
