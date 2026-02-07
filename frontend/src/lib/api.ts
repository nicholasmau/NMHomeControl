import axios from 'axios';
import {
  getDemoDevices,
  getDemoDevice,
  getDemoDeviceStatus,
  executeDemoCommand,
  getDemoRooms,
  getDemoScenes,
  executeDemoScene,
} from './demoData';

const API_BASE_URL = '/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if we're not already there
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },
  
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
  
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  
  changePassword: async (currentPassword: string, newPassword: string) => {
    const body: { currentPassword?: string; newPassword: string } = {
      newPassword,
    };
    
    // Only include currentPassword if it's provided
    if (currentPassword) {
      body.currentPassword = currentPassword;
    }
    
    const response = await apiClient.post('/auth/change-password', body);
    return response.data;
  },
};

// Device API
export const deviceAPI = {
  getDevices: async () => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    if (isDemoMode) {
      return { devices: getDemoDevices() };
    }
    
    const response = await apiClient.get('/devices');
    return response.data;
  },
  
  getDevice: async (deviceId: string) => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    if (isDemoMode) {
      return { device: getDemoDevice(deviceId) };
    }
    
    const response = await apiClient.get(`/devices/${deviceId}`);
    return response.data;
  },
  
  getDeviceStatus: async (deviceId: string) => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    if (isDemoMode) {
      return { status: getDemoDeviceStatus(deviceId) };
    }
    
    const response = await apiClient.get(`/devices/${deviceId}/status`);
    return response.data;
  },
  
  executeCommand: async (deviceId: string, capability: string, command: string, args: any[] = []) => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    
    // Always call the backend to track metrics (even in demo mode)
    const response = await apiClient.post(`/devices/${deviceId}/command`, {
      capability,
      command,
      args,
    });
    
    // In demo mode, also update local state for UI
    if (isDemoMode) {
      executeDemoCommand(deviceId, capability, command, args);
    }
    
    return response.data;
  },
  
  getRooms: async () => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    if (isDemoMode) {
      return { rooms: getDemoRooms() };
    }
    
    const response = await apiClient.get('/devices/rooms/list');
    return response.data;
  },
};

// Scene API
export const sceneAPI = {
  getScenes: async () => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    if (isDemoMode) {
      return { scenes: getDemoScenes() };
    }
    
    const response = await apiClient.get('/scenes');
    return response.data;
  },
  
  executeScene: async (sceneId: string) => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    if (isDemoMode) {
      await executeDemoScene(sceneId);
      return { success: true };
    }
    
    const response = await apiClient.post(`/scenes/${sceneId}/execute`);
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },
  
  createUser: async (username: string, password: string, role: 'admin' | 'user') => {
    const response = await apiClient.post('/admin/users', { username, password, role });
    return response.data;
  },
  
  deleteUser: async (userId: string) => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },
  
  updateUserRole: async (userId: string, role: 'admin' | 'user') => {
    const response = await apiClient.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
  
  updateUserAccess: async (userId: string, devices: string[], rooms: string[]) => {
    const response = await apiClient.put(`/admin/users/${userId}/access`, { devices, rooms });
    return response.data;
  },
  
  getAuditLogs: async (limit = 100, offset = 0) => {
    const response = await apiClient.get('/admin/audit-logs', { params: { limit, offset } });
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getUsageStats: async (params?: { startDate?: string; endDate?: string; limit?: number }) => {
    const response = await apiClient.get('/analytics/usage-stats', { params });
    return response.data;
  },

  getDeviceHistory: async (
    deviceId: string,
    params?: { startDate?: string; endDate?: string; capability?: string; limit?: number }
  ) => {
    const response = await apiClient.get(`/analytics/device-history/${deviceId}`, { params });
    return response.data;
  },

  getTimeSeries: async (params?: {
    deviceIds?: string[];
    startDate?: string;
    endDate?: string;
    capability?: string;
    attribute?: string;
  }) => {
    const queryParams = params ? {
      ...params,
      deviceIds: params.deviceIds?.join(','),
    } : undefined;
    const response = await apiClient.get('/analytics/time-series', { params: queryParams });
    return response.data;
  },

  getHourlyActivity: async (
    deviceId: string,
    params?: { startDate?: string; endDate?: string }
  ) => {
    const response = await apiClient.get(`/analytics/hourly-activity/${deviceId}`, { params });
    return response.data;
  },
};
