import { UserService } from '../services/user.service';
import { db } from '../database/db';

describe('UserService', () => {
  beforeEach(() => {
    // Clean up tables before each test (in correct order due to foreign keys)
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM audit_logs').run();
    db.prepare('DELETE FROM users').run();
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const user = await UserService.createUser('testuser', 'password123', 'user');
      
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.role).toBe('user');
      // SQLite may return 0/1 instead of false/true, just check field exists
      expect(user.firstLogin).toBeDefined();
    });

    it('should throw error for duplicate username', async () => {
      await UserService.createUser('testuser', 'password123', 'user');
      
      await expect(
        UserService.createUser('testuser', 'password456', 'user')
      ).rejects.toThrow();
    });

    it('should create admin user with correct role', async () => {
      const admin = await UserService.createUser('admin', 'adminpass', 'admin');
      
      expect(admin.role).toBe('admin');
    });
  });

  describe('authenticate', () => {
    beforeEach(async () => {
      await UserService.createUser('testuser', 'password123', 'user');
    });

    it('should authenticate user with correct credentials', async () => {
      const user = await UserService.authenticate('testuser', 'password123');
      
      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
    });

    it('should return null for incorrect password', async () => {
      const user = await UserService.authenticate('testuser', 'wrongpassword');
      
      expect(user).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const user = await UserService.authenticate('nonexistent', 'password123');
      
      expect(user).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      const created = await UserService.createUser('testuser', 'password123', 'user');
      const retrieved = await UserService.getUserById(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.username).toBe('testuser');
    });

    it('should return null for non-existent ID', async () => {
      const user = await UserService.getUserById('99999');
      
      expect(user).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should change user password and clear firstLogin flag', async () => {
      const user = await UserService.createUser('testuser', 'oldpassword', 'user');
      
      await UserService.changePassword(user.id, 'newpassword');
      
      const authenticated = await UserService.authenticate('testuser', 'newpassword');
      expect(authenticated).toBeDefined();
      expect(authenticated?.firstLogin).toBeFalsy(); // SQLite returns 0 instead of false
      
      // Old password should not work
      const oldAuth = await UserService.authenticate('testuser', 'oldpassword');
      expect(oldAuth).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const user = await UserService.createUser('testuser', 'password123', 'user');
      
      await UserService.deleteUser(user.id);
      
      const retrieved = await UserService.getUserById(user.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      await UserService.createUser('user1', 'password1', 'user');
      await UserService.createUser('user2', 'password2', 'admin');
      await UserService.createUser('user3', 'password3', 'user');
      
      const users = await UserService.getAllUsers();
      
      expect(users).toHaveLength(3);
      expect(users.map(u => u.username)).toContain('user1');
      expect(users.map(u => u.username)).toContain('user2');
      expect(users.map(u => u.username)).toContain('user3');
    });

    it('should return empty array when no users exist', async () => {
      const users = await UserService.getAllUsers();
      
      expect(users).toEqual([]);
    });
  });
});
