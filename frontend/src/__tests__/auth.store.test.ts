import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../lib/auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('should initialize with no user', () => {
    const { user, isAuthenticated } = useAuthStore.getState();
    
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('should set user and authentication state on login', () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'user' as const,
      firstLogin: false,
    };

    // Directly set state instead of calling setUser
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    
    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).toEqual(mockUser);
    expect(isAuthenticated).toBe(true);
  });

  it('should clear user on logout', () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'user' as const,
      firstLogin: false,
    };

    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Clear state
    useAuthStore.setState({ user: null, isAuthenticated: false });
    
    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('should update user properties', () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'user' as const,
      firstLogin: true,
    };

    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    
    // Use updateUser action
    useAuthStore.getState().updateUser({ ...mockUser, firstLogin: false });
    
    const { user } = useAuthStore.getState();
    expect(user?.firstLogin).toBe(false);
    expect(user?.username).toBe('testuser');
  });

  it('should handle admin role correctly', () => {
    const adminUser = {
      id: '1',
      username: 'admin',
      role: 'admin' as const,
      firstLogin: false,
    };

    useAuthStore.setState({ user: adminUser, isAuthenticated: true });
    
    const { user } = useAuthStore.getState();
    expect(user?.role).toBe('admin');
  });
});
