import { createContext, useContext, useState, useMemo } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('isp_usuario');
    return raw ? JSON.parse(raw) : null;
  });

  const login = ({ token, usuario: nuevoUsuario }) => {
    localStorage.setItem('isp_token', token);
    localStorage.setItem('isp_usuario', JSON.stringify(nuevoUsuario));
    setUsuario(nuevoUsuario);
  };

  const logout = () => {
    localStorage.removeItem('isp_token');
    localStorage.removeItem('isp_usuario');
    setUsuario(null);
  };

  const value = useMemo(() => ({ usuario, login, logout }), [usuario]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
