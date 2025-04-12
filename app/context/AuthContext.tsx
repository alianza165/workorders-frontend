// context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  email?: string;
  name?: string;
  // Add other user properties as needed
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, userData?: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize from localStorage if available
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken) {
      setToken(storedToken);
    }
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (newToken: string, userData?: User) => {
    localStorage.setItem('token', newToken);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/signin');
  };

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    login,
    logout
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