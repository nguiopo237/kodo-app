import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockUser = { idUser:2, username:'vendeur1', role:'vendeur', nomComplet:'Jean Dupont', prenom:'Jean', nom:'Dupont', localisation:'Douala, Cameroun' };
const queryState = { isLoading: false };
const mockAllData = {
  utilisateurs: [{idUser:1,nomComplet:'Administrateur',role:'admin'},{idUser:2,nomComplet:'Jean Dupont',prenom:'Jean',nom:'Dupont',role:'vendeur'}],
  produits: [{idProduit:1,nomProduit:'Riz Basmati 5kg',prix:7500,prixBoutique:10000,categorie:'Alimentation'},{idProduit:2,nomProduit:'Huile vegetale 2L',prix:3500,prixBoutique:4500,categorie:'Alimentation'},{idProduit:3,nomProduit:'Cafe Arabica 1kg',prix:12500,prixBoutique:15000,categorie:'Boissons'}],
  ventes: [
    {idVente:1,idVendeur:2,totalVente:63500,date:'2024-01-20T10:30:00',typePaiement:'especes',produitsVendus:[{idProduit:1,quantite:5,prixTotal:50000},{idProduit:2,quantite:3,prixTotal:13500}]},
    {idVente:2,idVendeur:2,totalVente:45000,date:'2024-01-18T09:10:00',typePaiement:'mobile money',produitsVendus:[{idProduit:3,quantite:2,prixTotal:30000}]},
  ],
};

vi.mock('react-router-dom',async()=>{const a=await vi.importActual('react-router-dom');return{...a};});
vi.mock('../../context/AuthContext',async()=>{const a=await vi.importActual('../../context/AuthContext');return{...a,useAuth:()=>({user:mockUser})};});
vi.mock('../../hooks/useDataQueries',async()=>{const a=await vi.importActual('../../hooks/useDataQueries');return{...a,useAllData:()=>({data:queryState.isLoading?{}:mockAllData,isLoading:queryState.isLoading}),useInvalidateQueries:()=>vi.fn()};});
vi.mock('../../services/dashboardService',async()=>{const a=await vi.importActual('../../services/dashboardService');return{...a};});

const DV=(await import('./DashboardVendeur')).default;
const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
const wrap=({children})=>React.createElement(QueryClientProvider,{client:qc},React.createElement(MemoryRouter,{initialEntries:['/vendeur/dashboard']},children));
const rd=()=>render(React.createElement(DV,null),{wrapper:wrap});

describe('DashboardVendeur - Rendu',()=>{
beforeEach(()=>{vi.clearAllMocks();});
it('header avec prenom',()=>{rd();expect(screen.getByText(/Bonjour.*Jean/i)).toBeInTheDocument();});
it('date du jour',()=>{rd();const d=new Date().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});expect(screen.getByText(d)).toBeInTheDocument();});
it('4 stats principales',()=>{rd();expect(screen.getAllByText(/Chiffre d'affaires/i).length).toBeGreaterThanOrEqual(1);expect(screen.getAllByText(/Ventes/i).length).toBeGreaterThan(0);expect(screen.getByText(/Aujourd'hui/i)).toBeInTheDocument();expect(screen.getByText(/CA du jour/i)).toBeInTheDocument();});
it('header gradient class',()=>{rd();expect(document.querySelector('.dashboard-header')).toBeInTheDocument();});
it('badges header',()=>{rd();expect(screen.getByText(/Compte actif/i)).toBeInTheDocument();expect(screen.getByText(/Cameroun/i)).toBeInTheDocument();expect(screen.getByText(/Mon profil/i)).toBeInTheDocument();});
it('bouton nouvelle vente',()=>{rd();expect(screen.getAllByText(/Nouvelle vente/i).length).toBeGreaterThanOrEqual(1);});
});

describe('DashboardVendeur - Stats',()=>{
beforeEach(()=>{vi.clearAllMocks();});
it('total ventes',()=>{rd();expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);});
it('ventes recentes',()=>{rd();expect(screen.getByText(/Vos derni[eè]res ventes/i)).toBeInTheDocument();expect(screen.getAllByText('Riz Basmati 5kg').length).toBeGreaterThanOrEqual(1);});
it('lien voir tout',()=>{rd();expect(screen.getByText(/Voir tout/i)).toBeInTheDocument();});
});

describe('DashboardVendeur - Profil',()=>{
beforeEach(()=>{vi.clearAllMocks();});
it('affiche au clic',async()=>{rd();const u=userEvent.setup();await u.click(screen.getByText(/Mon profil/i));expect(screen.getAllByText(/Jean Dupont/i).length).toBeGreaterThanOrEqual(1);});
it('ferme au clic X',async()=>{rd();const u=userEvent.setup();await u.click(screen.getByText(/Mon profil/i));expect(screen.getByText(/@vendeur1/i)).toBeInTheDocument();await u.click(screen.getByText('✕'));await waitFor(()=>{expect(screen.queryByText(/@vendeur1/i)).not.toBeInTheDocument();});});
});

describe('DashboardVendeur - Actions rapides',()=>{
beforeEach(()=>{vi.clearAllMocks();});
it('affiche actions',()=>{rd();expect(screen.getByText(/Actions rapides/i)).toBeInTheDocument();expect(screen.getByText(/D[eé]clarer d[eé]pense/i)).toBeInTheDocument();expect(screen.getByText(/Confirmer r[eé]ception/i)).toBeInTheDocument();});
});

describe('DashboardVendeur - Produits populaires',()=>{
beforeEach(()=>{vi.clearAllMocks();});
it('affiche produits populaires',()=>{rd();expect(screen.getAllByText(/Vos produits les plus vendus/i).length).toBeGreaterThanOrEqual(1);expect(screen.getAllByText(/Riz Basmati 5kg/i).length).toBeGreaterThanOrEqual(1);});
it('footer total ventes',()=>{rd();expect(screen.getByText(/Total ventes/i)).toBeInTheDocument();});
});

describe('DashboardVendeur - Loading',()=>{
beforeEach(()=>{vi.clearAllMocks();});
it('spinner',()=>{queryState.isLoading=true;rd();expect(screen.getByText(/Chargement de votre tableau de bord/i)).toBeInTheDocument();queryState.isLoading=false;});
});