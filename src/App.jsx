import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import * as roleService from './services/roleService';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import './App.css';

const DashboardAdmin = React.lazy(() => import('./pages/admin/DashboardAdmin'));
const GestionComplete = React.lazy(() => import('./pages/admin/GestionComplete'));
const GestionProduits = React.lazy(() => import('./pages/admin/GestionProduits'));
const GestionUtilisateurs = React.lazy(() => import('./pages/admin/GestionUtilisateurs'));
const EnvoisTransport = React.lazy(() => import('./pages/admin/EnvoisTransport'));
const ComptabiliteAdmin = React.lazy(() => import('./pages/admin/ComptabiliteAdmin'));
const Rapports = React.lazy(() => import('./pages/admin/Rapports'));
const Parametres = React.lazy(() => import('./pages/admin/Parametres'));
const GestionRoles = React.lazy(() => import('./pages/admin/GestionRoles'));

const DashboardVendeur = React.lazy(() => import('./pages/vendeur/DashboardVendeur'));
const InterfaceVente = React.lazy(() => import('./pages/vendeur/InterfaceVente'));
const MesVentes = React.lazy(() => import('./pages/vendeur/MesVentes'));
const DeclarerDepenses = React.lazy(() => import('./pages/vendeur/DeclarerDepenses'));
const ConfirmerReception = React.lazy(() => import('./pages/vendeur/ConfirmerReception'));
const ComptabiliteVendeur = React.lazy(() => import('./pages/vendeur/ComptabiliteVendeur'));
const ProfilVendeur = React.lazy(() => import('./pages/vendeur/ProfilVendeur'));

const NotFound = React.lazy(() => import('./pages/NotFound'));

const LoadingSpinner = () => (
  <div className="loading-screen">
    <div className="loading-screen-spinner"></div>
    <p className="loading-screen-text">Chargement...</p>
  </div>
);

const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    const hasAccess = roleService.canAccessRoute(user, requiredRole);
    if (!hasAccess) {
      return <Navigate to="/" replace />;
    }
  }

  if (requiredPermission) {
    const hasPerm = roleService.hasPermission(user, requiredPermission);
    if (!hasPerm) {
      return <Navigate to="/" replace />;
    }
  }

  return <Layout>{children}</Layout>;
};

function App() {
  const { user } = useAuth();

  return (
    <div className="App">
      <React.Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" replace /> : <Login />
          } />

          <Route path="/" element={
            <ProtectedRoute>
              {user?.role === 'admin' || user?.role === 'super_admin'
                ? <DashboardAdmin />
                : <DashboardVendeur />
              }
            </ProtectedRoute>
          } />

          {/* Routes administrateur */}
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
          <Route path="/admin/roles" element={
            <ProtectedRoute requiredRole="admin">
              <GestionRoles />
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
          <Route path="/vendeur/profil" element={
            <ProtectedRoute requiredRole="vendeur">
              <ProfilVendeur />
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </React.Suspense>
    </div>
  );
}

export default App;
