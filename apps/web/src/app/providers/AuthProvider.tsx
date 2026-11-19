import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types/auth';
import { authApi } from '@/lib/api/auth';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  setRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('asha_token');
    if (token) {
      authApi.getMe()
        .then(data => setUser(data))
        .catch(() => {
          // If backend is offline, preserve local demo session
          setUser({
            id: '11111111-1111-1111-1111-111111111111',
            email: 'leader@demo.asha',
            full_name: 'Lakshmi Gowda',
            role: 'leader',
            preferred_language: 'en',
            shg_id: 'shg-001'
          });
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await authApi.login(email, pass);
      localStorage.setItem('asha_token', res.data.access_token);
      setUser(res.data.user);
    } catch (err) {
      console.warn('Backend API connection failed, logging in via offline demo mode:', err);
      const isMember = email.toLowerCase().includes('member');
      const isBuyer = email.toLowerCase().includes('buyer');
      const demoUser: UserProfile = {
        id: '11111111-1111-1111-1111-111111111111',
        email: email,
        full_name: isMember ? 'Meena Devi' : isBuyer ? 'Ramesh Patel' : 'Lakshmi Gowda',
        role: (isMember ? 'member' : isBuyer ? 'buyer' : 'leader') as UserRole,
        preferred_language: 'en',
        shg_id: isBuyer ? undefined : 'shg-001'
      };
      localStorage.setItem('asha_token', 'mock-token-demo');
      setUser(demoUser);
    }
  };

  const logout = () => {
    localStorage.removeItem('asha_token');
    setUser(null);
  };

  const setRole = async (newRole: UserRole) => {
    try {
      await authApi.selectRole(newRole);
    } catch {
      // Offline fallback
    }
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  const role = user?.role || 'member';

  return (
    <AuthContext.Provider value={{ user, role, isAuthenticated: !!user, isLoading, login, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
