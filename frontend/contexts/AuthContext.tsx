import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthAPI, clearToken } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'ADMIN' | 'TRAINER' | 'MEMBER';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Decodificar JWT para obtener información del usuario
function decodeToken(token: string): User | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'ADMIN',
    };
  } catch (e) {
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar si hay un token guardado al cargar
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUser(decoded);
      } else {
        // Token inválido, limpiarlo
        clearToken();
      }
    }
    setIsLoading(false);
  }, []);

  // Login con usuario y contraseña (API real)
  const login = useCallback(async (usuario: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await AuthAPI.login(usuario, password);
      if (result.token) {
        const decoded = decodeToken(result.token);
        if (decoded) {
          setUser(decoded);
          setIsLoading(false);
          return true;
        }
      }
      setError('Usuario o contraseña incorrectos');
      setIsLoading(false);
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    AuthAPI.logout();
    setUser(null);
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
