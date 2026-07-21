import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockUser = { idUser:1, username:'admin', role:'admin', nomComplet:'Administrateur Principal' };
const mockStats = { totalCA:150000, totalVentes:45, benefices:45000, stockFaible:3 };
const mockAllData = { produits:[{idProduit:1,nomProduit:'Riz Basmati 5kg',prix:7500}], utilisateurs:[{idUser:1,nomComplet:'Admin'},{idUser:2,nomComplet:'Jean Dupont'}], ventes:[{idVente:1,idVendeur:2,totalVente:63500,date:'2024-01-20T10:30:00',typePaiement:'especes',produitsVendus:[{idProduit:1,quantite:5,prixTotal:50000}]}] };
const queryState = { isLoading: false };
const mockHasPerm = vi.fn(() => true);
const mockSuccess = vi.fn();
const mockWarning = vi.fn();

vi.mock('react-router-dom',async()=>{const a=await vi.importActual('react-router-dom');return{...a};});
vi.mock('../../context/AuthContext',async()=>{const a=await vi.importActual('../../context/AuthContext');return{...a,useAuth:()=>({user:mockUser,hasPermission:mockHasPerm})};});
vi.mock('../../context/NotificationContext',async()=>{const a=await vi.importActual('../../context/NotificationContext');return{...a,useNotification:()=>({success:mockSuccess,warning:mockWarning})};});
vi.mock('../../hooks/useDataQueries',async()=>{const a=await vi.importActual('../../hooks/useDataQueries');return{...a,useAllData:()=>({data:queryState.isLoading?null:mockAllData,isLoading:queryState.isLoading}),useStats:()=>({data:queryState.isLoading?null:mockStats,isLoading:queryState.isLoading}),useInvalidateQueries:()=>vi.fn()};});
vi.mock('../../services/dataService',async()=>{const a=await vi.importActual('../../services/dataService');return{...a,dataService:{...a.dataService,getResetSummary:vi.fn(()=>({produits:5,ventes:45,transport:2,depenses:3,totalCA:150000,totalDepenses:172500}))}};});

const DA=(await import('./DashboardAdmin')).default;
const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
const wrap=({children})=>React.createElement(QueryClientProvider,{client:qc},React.createElement(MemoryRouter,null,children));
const rd=()=>render(React.createElement(DA,null),{wrapper:wrap});

describe('DashboardAdmin - Rendu',()=>{
beforeEach(()=>{vi.clearAllMocks();mockHasPerm.mockReturnValue(true);});
it('affiche header',()=>{rd();expect(screen.getByText(/Bonjour.*Administrateur/i)).toBeInTheDocument();});
it('affiche 4 stats',()=>{rd();expect(screen.getByText(/Chiffre d'affaires/i)).toBeInTheDocument();expect(screen.getByText('Ventes')).toBeInTheDocument();expect(screen.getByText(/B[eé]n[eé]fices/i)).toBeInTheDocument();expect(screen.getByText(/Stock faible/i)).toBeInTheDocument();});
it('header gradient class',()=>{rd();expect(document.querySelector('.dashboard-header')).toBeInTheDocument();});
it('bouton reset stats',()=>{rd();expect(screen.getByText(/Remettre les stats/i)).toBeInTheDocument();});
it('ventes recentes',()=>{rd();expect(screen.getByText(/Ventes r[eé]centes/i)).toBeInTheDocument();expect(screen.getByText('Riz Basmati 5kg')).toBeInTheDocument();});
it('stats chargees',()=>{rd();expect(screen.getByText(/150.*000/)).toBeInTheDocument();expect(screen.getByText('45')).toBeInTheDocument();});
});

describe('DashboardAdmin - Permissions',()=>{
beforeEach(()=>{vi.clearAllMocks();mockHasPerm.mockReturnValue(true);});
it('appelle hasPermission',()=>{rd();expect(mockHasPerm).toHaveBeenCalledWith('admin:stats');});
it('affiche dashboard si OK',()=>{rd();expect(screen.getByText(/Bonjour.*Administrateur/i)).toBeInTheDocument();expect(screen.queryByText(/Permission refus[eé]e/i)).not.toBeInTheDocument();});
it('affiche permission refused',()=>{mockHasPerm.mockReturnValue(false);rd();expect(screen.getByText(/Permission refus[eé]e/i)).toBeInTheDocument();expect(screen.queryByText(/Bonjour.*Administrateur/i)).not.toBeInTheDocument();});
it('warning si refuse',()=>{mockHasPerm.mockReturnValue(false);rd();expect(mockWarning).toHaveBeenCalled();});
});

describe('DashboardAdmin - Loading',()=>{
beforeEach(()=>{vi.clearAllMocks();});
it('spinner',()=>{mockHasPerm.mockReturnValue(true);queryState.isLoading=true;rd();expect(screen.getByText(/Chargement du tableau de bord/i)).toBeInTheDocument();queryState.isLoading=false;});
});