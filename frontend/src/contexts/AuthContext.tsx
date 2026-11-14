import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface User {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  mustChangePassword?: boolean;
  profilePhotoUpdatedAt?: string | null;
}

export const DEMO_USERS: Record<string, User> = {
  'admin@hospital.com': { id: 37, email: 'admin@hospital.com', role: 'super_admin', firstName: 'System', lastName: 'Admin' },
  'admin@hospital.et': { id: 2, email: 'admin@hospital.et', role: 'admin', firstName: 'Hospital', lastName: 'Admin' },
  'superadmin@hospital.com': { id: 1, email: 'superadmin@hospital.com', role: 'super_admin', firstName: 'Super', lastName: 'Admin' },
  'manager@hospital.com': { id: 38, email: 'manager@hospital.com', role: 'hospital_manager', firstName: 'Hospital', lastName: 'Manager' },
  'doctor@hospital.com': { id: 4, email: 'doctor@hospital.com', role: 'doctor', firstName: 'Dr. Dawit', lastName: 'Physician' },
  'nurse@hospital.com': { id: 18, email: 'nurse@hospital.com', role: 'nurse', firstName: 'Nurse', lastName: 'Selamawit' },
  'nurse@gmail.com': { id: 7, email: 'nurse@gmail.com', role: 'nurse', firstName: 'Nurse', lastName: 'Bethlehem' },
  'reception@hospital.com': { id: 5, email: 'reception@hospital.com', role: 'receptionist', firstName: 'Reception', lastName: 'Staff' },
  'receptionist@hospital.com': { id: 40, email: 'receptionist@hospital.com', role: 'receptionist', firstName: 'Receptionist', lastName: 'Officer' },
  'cashier@hospital.com': { id: 3, email: 'cashier@hospital.com', role: 'cashier', firstName: 'Cashier', lastName: 'Finance' },
  'labtech@hospital.com': { id: 41, email: 'labtech@hospital.com', role: 'lab_technician', firstName: 'Lab', lastName: 'Technician' },
  'lab@hospital.com': { id: 42, email: 'lab@hospital.com', role: 'lab_technician', firstName: 'Lab', lastName: 'Technician' },
  'pharmacist@hospital.com': { id: 43, email: 'pharmacist@hospital.com', role: 'pharmacist', firstName: 'Pharmacy', lastName: 'Dispenser' },
  'patient@hospital.com': { id: 45, email: 'patient@hospital.com', role: 'patient', firstName: 'Patient', lastName: 'User' },
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
  demoSwitchRole: (role: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
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

  const demoSwitchRole = async (role: string): Promise<User> => {
    try {
      const response = await api.post('/auth/demo-switch', { role });
      const { token, refreshToken, user: userData } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      const targetUser = Object.values(DEMO_USERS).find(u => u.role === role);
      if (targetUser) {
        localStorage.setItem('token', 'demo-token');
        localStorage.setItem('refreshToken', 'demo-refresh-token');
        localStorage.setItem('user', JSON.stringify(targetUser));
        setUser(targetUser);
        return targetUser;
      }
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, demoSwitchRole, logout, isAuthenticated: !!user, loading, setUser }}>
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
