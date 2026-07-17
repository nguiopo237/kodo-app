import React, { createContext, useState, useContext, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger l'utilisateur depuis localStorage au démarrage
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

    // Petit délai pour laisser le spinner s'afficher et simuler une requête
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      if (!username || !password) {
        throw new Error('Nom d\'utilisateur et mot de passe requis');
      }

      // Charger les utilisateurs depuis la base de données centralisée
      const data = dashboardService.loadData();
      const utilisateurs = data.utilisateurs || [];

      // Chercher l'utilisateur par nom d'utilisateur (insensible à la casse)
      const found = utilisateurs.find(
        u => u.username.toLowerCase() === username.toLowerCase()
      );

      if (!found) {
        throw new Error('Utilisateur introuvable');
      }

      if (found.password !== password) {
        throw new Error('Mot de passe incorrect');
      }

      if (found.actif === false) {
        throw new Error('Ce compte est désactivé. Contactez l\'administrateur.');
      }

      // Créer l'objet utilisateur sans le mot de passe (sécurité)
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
    // Mettre à jour l'utilisateur dans le state et localStorage
    setUser(updatedData);
    localStorage.setItem('kodomarket_user', JSON.stringify(updatedData));
    return updatedData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kodomarket_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      updateUser,
      logout, 
      loading,
      isAdmin: user?.role === 'admin',
      isVendeur: user?.role === 'vendeur'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);