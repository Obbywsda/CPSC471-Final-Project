import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const ROLE_CONFIG = {
  manager: {
    label: 'Fleet Manager',
    canEdit: true,
    sidebarTitle: 'VEM',
    sidebarSubtitle: 'VEM ADMIN',
    headerPrefix: 'Vehicle Event Manager',
  },
  employee: {
    label: 'Fleet Employee',
    canEdit: false,
    sidebarTitle: 'VEM',
    sidebarSubtitle: 'VEM OPS',
    headerPrefix: 'Vehicle Event Manager',
  },
  mechanic: {
    label: 'Lead Mechanic',
    canEdit: false,
    sidebarTitle: 'VEM',
    sidebarSubtitle: 'VEM TECH',
    headerPrefix: 'Vehicle Event Manager',
  },
};

const MOCK_USERS = {
  manager: { name: 'Marcus Chen', id: 'E22DD7', role: 'manager', title: 'Fleet Manager' },
  employee: { name: 'Sarah Johnson', id: 'E10A23', role: 'employee', title: 'Service Advisor' },
  mechanic: { name: 'Marcus V.', id: 'E30B12', role: 'mechanic', title: 'Lead Mechanic (MECH)' },
};

export function AuthProvider({ children }) {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  const selectRole = useCallback((selectedRole) => {
    setRole(selectedRole);
    setUser(MOCK_USERS[selectedRole]);
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    setUser(null);
  }, []);

  const config = role ? ROLE_CONFIG[role] : null;
  const canEdit = config?.canEdit ?? false;
  const isMechanic = role === 'mechanic';
  const isManager = role === 'manager';

  return (
    <AuthContext.Provider value={{ role, user, config, canEdit, isMechanic, isManager, selectRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
