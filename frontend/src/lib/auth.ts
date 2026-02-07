import { create } from 'zustand';
import { authAPI } from './api';
import { websocketClient } from './websocket';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  firstLogin: boolean;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  
  // Actions
  login: (username: string, password: string, demoMode?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isDemoMode: localStorage.getItem('demoMode') === 'true',
  
  login: async (username: string, password: string, demoMode = false) => {
    try {
      const data = await authAPI.login(username, password);
      
      // Determine if we're actually in demo mode based on the returned user
      const actuallyDemoMode = data.user.username === 'demo';
      
      // Store demo mode in localStorage
      if (actuallyDemoMode) {
        localStorage.setItem('demoMode', 'true');
      } else {
        localStorage.removeItem('demoMode');
      }
      
      set({ user: data.user, isAuthenticated: true, isDemoMode: actuallyDemoMode });
      
      // Set session ID and connect WebSocket after successful login
      if (data.sessionId) {
        websocketClient.setSessionId(data.sessionId);
      }
      websocketClient.connect();
    } catch (error) {
      localStorage.removeItem('demoMode');
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('demoMode');
      set({ user: null, isAuthenticated: false, isDemoMode: false });
      
      // Disconnect WebSocket on logout
      websocketClient.disconnect();
    } catch (error) {
      // Logout locally even if API fails
      localStorage.removeItem('demoMode');
      set({ user: null, isAuthenticated: false, isDemoMode: false });
      websocketClient.disconnect();
    }
  },
  
  checkAuth: async () => {
    console.log('[AuthStore] checkAuth called');
    try {
      const data = await authAPI.getMe();
      console.log('[AuthStore] checkAuth success:', data);
      
      // Determine demo mode from user data, not just localStorage
      const isDemoMode = data.user.username === 'demo';
      
      // Sync localStorage with actual state
      if (isDemoMode) {
        localStorage.setItem('demoMode', 'true');
      } else {
        localStorage.removeItem('demoMode');
      }
      
      set({ user: data.user, isAuthenticated: true, isLoading: false, isDemoMode });
      
      // Connect WebSocket AFTER successful authentication
      websocketClient.connect();
    } catch (error) {
      console.log('[AuthStore] checkAuth failed:', error);
      localStorage.removeItem('demoMode');
      set({ user: null, isAuthenticated: false, isLoading: false, isDemoMode: false });
    }
  },
  
  updateUser: (user: User) => {
    set({ user });
  },
}));
