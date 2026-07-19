import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import * as roleService from '../services/roleService';

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  const { user } = useAuth();

  const value = useMemo(() => ({
    user,
    role: user?.role || null,
    roleMeta: roleService.getRoleMetadata(user?.role),
    hasPermission: (permission) => roleService.hasPermission(user, permission),
    hasAnyPermission: (permissions) => roleService.hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions) => roleService.hasAllPermissions(user, permissions),
    canAccessRoute: (routeRole) => roleService.canAccessRoute(user, routeRole),
    hasMinLevel: (level) => roleService.hasMinRoleLevel(user?.role, level),
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isVendeur: user?.role === 'vendeur',
    isSuperAdmin: user?.role === 'super_admin',
    roleBadge: roleService.getRoleBadgeStyle(user?.role),
    getRoleBadge: (role) => roleService.getRoleBadgeStyle(role),
    getAllRoles: roleService.getAllRoles,
    getRoleMetadata: roleService.getRoleMetadata,
  }), [user]);

  return React.createElement(RoleContext.Provider, { value }, children);
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

export default RoleContext;
