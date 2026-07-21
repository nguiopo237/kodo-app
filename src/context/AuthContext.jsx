import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';
import * as roleService from '../services/roleService';
import bcrypt from 'bcryptjs';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('kodomarket_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('kodomarket_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      if (!username || !password) {
        throw new Error('Nom d\'utilisateur et mot de passe requis');
      }

      const data = dashboardService.loadData();
      const utilisateurs = data.utilisateurs || [];

      const found = utilisateurs.find(
        u => u.username.toLowerCase() === username.toLowerCase()
      );

      if (!found) {
        throw new Error('Utilisateur introuvable');
      }

      const passwordMatch = await bcrypt.compare(password, found.password);
      if (!passwordMatch) {
        throw new Error('Mot de passe incorrect');
      }

      if (found.actif === false) {
        throw new Error('Ce compte est désactivé. Contactez l\'administrateur.');
      }

      const userData = { ...found };
      delete userData.password;

      setUser(userData);
      localStorage.setItem('kodomarket_user', JSON.stringify(userData));
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updatedData) => {
    setUser(updatedData);
    localStorage.setItem('kodomarket_user', JSON.stringify(updatedData));
    return updatedData;
  };

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('kodomarket_user');
  }, []);

  const hasPermission = useCallback((permission) => {
    return roleService.hasPermission(user, permission);
  }, [user]);

  const hasAnyPermission = useCallback((permissions) => {
    return roleService.hasAnyPermission(user, permissions);
  }, [user]);

  const hasAllPermissions = useCallback((permissions) => {
    return roleService.hasAllPermissions(user, permissions);
  }, [user]);

  const canAccessRoute = useCallback((requiredRole) => {
    return roleService.canAccessRoute(user, requiredRole);
  }, [user]);

  const value = {
    user,
    login,
    updateUser,
    logout,
    loading,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isVendeur: user?.role === 'vendeur',
    isSuperAdmin: user?.role === 'super_admin',
    roleMetadata: roleService.getRoleMetadata(user?.role),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => useContext(AuthContext);
