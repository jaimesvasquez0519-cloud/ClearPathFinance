import { create } from 'zustand';
import api from '../utils/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  currency: string;
  role?: string;
  status?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') as string) : null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const token = get().token;
      if (!token) return;
      const res = await api.get('/auth/me');
      const freshUser = res.data;
      localStorage.setItem('user', JSON.stringify(freshUser));
      set({ user: freshUser });
    } catch {
      // Silently ignore
    }
  },
}));
