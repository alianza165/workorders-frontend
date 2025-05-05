// context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  id?: number;
  email?: string;
  username?: string;
  profile?: {
    is_manager: boolean;
    is_production: boolean;
    is_utilities: boolean;
    is_purchase: boolean;
    department: string;
    mobile_number?: string;
    image?: string;
  };
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (token: string, userData?: User) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  const initializeAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken) {
        setToken(storedToken);
      }
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(async (newToken: string, userData?: User) => {
    localStorage.setItem('token', newToken);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    setToken(newToken);
    console.log(userData)
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/signin');
  }, [router]);

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    authLoading,
    login,
    logout,
    initializeAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};