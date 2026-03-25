import { createContext, useContext, useState, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, getToken, getRole } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken());
  const [role, setRole] = useState(getRole());

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    setToken(data.data.token);
    setRole(data.data.role);
    return data;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setToken(null);
    setRole(null);
  }, []);

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  return (
    <AuthContext.Provider value={{ token, role, login, logout, isAdmin, isManager, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
