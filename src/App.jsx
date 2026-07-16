import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import './App.css';

// Pages Admin
import DashboardAdmin from './pages/admin/DashboardAdmin';
import GestionComplete from './pages/admin/GestionComplete';
import GestionProduits from './pages/admin/GestionProduits';
import GestionUtilisateurs from './pages/admin/GestionUtilisateurs';
import EnvoisTransport from './pages/admin/EnvoisTransport';
import ComptabiliteAdmin from './pages/admin/ComptabiliteAdmin';
import Rapports from './pages/admin/Rapports';
import Parametres from './pages/admin/Parametres';

// Pages Vendeur
import DashboardVendeur from './pages/vendeur/DashboardVendeur';
import InterfaceVente from './pages/vendeur/InterfaceVente';
import MesVentes from './pages/vendeur/MesVentes';
import DeclarerDepenses from './pages/vendeur/DeclarerDepenses';
import ConfirmerReception from './pages/vendeur/ConfirmerReception';
import ComptabiliteVendeur from './pages/vendeur/ComptabiliteVendeur';

// Pages communes
import NotFound from './pages/NotFound';

// Loading spinner
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    flexDirection: 'column',
    gap: '20px'
  }}>
    <div style={{
      width: '50px',
      height: '50px',
      border: '5px solid #f3f3f3',
      borderTop: '5px solid #667eea',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p>Chargement...</p>
  </div>
);

// Composant de route protégée
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  const { user } = useAuth();

  return (
    <div className="App">
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={
          user ? <Navigate to="/" /> : <Login />
        } />

        {/* Routes administrateur */}
        <Route path="/" element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <DashboardAdmin /> : <DashboardVendeur />}
          </ProtectedRoute>
        } />

        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <DashboardAdmin />
          </ProtectedRoute>
        } />

        <Route path="/admin/gestion-complete" element={
          <ProtectedRoute requiredRole="admin">
            <GestionComplete />
          </ProtectedRoute>
        } />

        <Route path="/admin/produits" element={
          <ProtectedRoute requiredRole="admin">
            <GestionProduits />
          </ProtectedRoute>
        } />

        <Route path="/admin/utilisateurs" element={
          <ProtectedRoute requiredRole="admin">
            <GestionUtilisateurs />
          </ProtectedRoute>
        } />

        <Route path="/admin/transport" element={
          <ProtectedRoute requiredRole="admin">
            <EnvoisTransport />
          </ProtectedRoute>
        } />

        <Route path="/admin/comptabilite" element={
          <ProtectedRoute requiredRole="admin">
            <ComptabiliteAdmin />
          </ProtectedRoute>
        } />

        <Route path="/admin/rapports" element={
          <ProtectedRoute requiredRole="admin">
            <Rapports />
          </ProtectedRoute>
        } />

        <Route path="/admin/parametres" element={
          <ProtectedRoute requiredRole="admin">
            <Parametres />
          </ProtectedRoute>
        } />

        {/* Routes vendeur */}
        <Route path="/vendeur/vente" element={
          <ProtectedRoute requiredRole="vendeur">
            <InterfaceVente />
          </ProtectedRoute>
        } />

        <Route path="/vendeur/mes-ventes" element={
          <ProtectedRoute requiredRole="vendeur">
            <MesVentes />
          </ProtectedRoute>
        } />

        <Route path="/vendeur/depenses" element={
          <ProtectedRoute requiredRole="vendeur">
            <DeclarerDepenses />
          </ProtectedRoute>
        } />

        <Route path="/vendeur/reception" element={
          <ProtectedRoute requiredRole="vendeur">
            <ConfirmerReception />
          </ProtectedRoute>
        } />

        <Route path="/vendeur/comptabilite" element={
          <ProtectedRoute requiredRole="vendeur">
            <ComptabiliteVendeur />
          </ProtectedRoute>
        } />

        {/* Route 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;