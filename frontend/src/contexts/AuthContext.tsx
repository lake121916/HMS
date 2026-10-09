import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export const DEMO_USERS: Record<string, User> = {
  'admin@hospital.et': { id: 1, email: 'admin@hospital.et', role: 'admin', firstName: 'Demo', lastName: 'Admin' },
  'superadmin@hospital.com': { id: 2, email: 'superadmin@hospital.com', role: 'super_admin', firstName: 'Demo', lastName: 'Super Admin' },
  'doctor@hospital.com': { id: 3, email: 'doctor@hospital.com', role: 'doctor', firstName: 'Demo', lastName: 'Doctor' },
  'nurse@gmail.com': { id: 4, email: 'nurse@gmail.com', role: 'nurse', firstName: 'Demo', lastName: 'Nurse' },
  'reception@hospital.com': { id: 5, email: 'reception@hospital.com', role: 'receptionist', firstName: 'Demo', lastName: 'Receptionist' },
  'cashier@hospital.com': { id: 6, email: 'cashier@hospital.com', role: 'cashier', firstName: 'Demo', lastName: 'Cashier' },
};

export const getDemoAuthUser = (email: string, password: string): User | null => {
  const normalizedEmail = email.trim().toLowerCase();
  if (password !== 'Hospital@2024') return null;

  const demoUser = DEMO_USERS[normalizedEmail];
  return demoUser ? { ...demoUser } : null;
};

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, refreshToken, user: userData } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (error) {
      const demoUser = getDemoAuthUser(email, password);
      if (!demoUser) {
        throw error;
      }

      localStorage.setItem('token', 'demo-token');
      localStorage.setItem('refreshToken', 'demo-refresh-token');
      localStorage.setItem('user', JSON.stringify(demoUser));
      setUser(demoUser);
      return demoUser;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
