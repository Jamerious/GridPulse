import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = 'gridpulse_auth_user';
const PENDING_STORAGE_KEY = 'gridpulse_pending_credentials';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse saved auth user:', e);
      return null;
    }
  });

  const [pendingCredentials, setPendingCredentialsState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(PENDING_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse pending credentials:', e);
      return null;
    }
  });

  const setPendingCredentials = (credentials) => {
    setPendingCredentialsState(credentials);
    try {
      if (credentials) {
        sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(credentials));
      } else {
        sessionStorage.removeItem(PENDING_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to store pending credentials:', e);
    }
  };

  const login = (role) => {
    const chosenRole = role || 'Homeowner';
    const newUser = {
      name: pendingCredentials?.name || user?.name || 'User',
      email: pendingCredentials?.email || user?.email || 'user@gridpulse.io',
      role: chosenRole,
      loginTimestamp: new Date().toISOString(),
    };

    setUser(newUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to save auth state:', e);
    }
    setPendingCredentialsState(null);
    return newUser;
  };

  const logout = () => {
    setUser(null);
    setPendingCredentialsState(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear auth state:', e);
    }
  };

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        pendingCredentials,
        setPendingCredentials,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

