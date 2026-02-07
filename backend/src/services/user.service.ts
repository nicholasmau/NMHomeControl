import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { db } from '../database/db';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  firstLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export class UserService {
  private static readonly INITIAL_PASSWORD_FILE = path.join(__dirname, '../../../data/initial-password.txt');

  /**
   * Initialize admin user if none exists
   */
  static async initializeAdminUser(): Promise<void> {
    const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
    
    if (!existingAdmin) {
      logger.info('No admin user found. Creating initial admin...');
      
      // Check for initial password file
      let initialPassword: string;
      if (fs.existsSync(this.INITIAL_PASSWORD_FILE)) {
        initialPassword = fs.readFileSync(this.INITIAL_PASSWORD_FILE, 'utf8').trim();
        logger.info('Using password from initial-password.txt');
      } else {
        // Generate new password if file doesn't exist
        initialPassword = this.generateSecurePassword();
        
        // Ensure data directory exists
        const dataDir = path.dirname(this.INITIAL_PASSWORD_FILE);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(this.INITIAL_PASSWORD_FILE, initialPassword, { mode: 0o600 });
        
        logger.info('\n' + '='.repeat(60));
        logger.info('  INITIAL ADMIN PASSWORD GENERATED');
        logger.info('='.repeat(60));
        logger.info('  Password saved to: data/initial-password.txt');
        logger.info('  You will be required to change this on first login.');
        logger.info('  To reset: npm run reset-admin-password');
        logger.info('='.repeat(60) + '\n');
      }
      
      const passwordHash = await bcrypt.hash(initialPassword, config.security.bcryptRounds);
      const adminId = randomBytes(16).toString('hex');
      
      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, first_login, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(adminId, 'admin', passwordHash, 'admin', 1);
      
      logger.info('✓ Initial admin user created');
    }
  }

  /**
   * Generate a secure random password
   */
  private static generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const specialChars = '!@#$%^&*-_=+';
    let password = 'HomeCtrl-';
    
    for (let i = 0; i < length - 9; i++) {
      if (i > 0 && i % 4 === 0) {
        password += '-';
      } else {
        const useSpecial = Math.random() > 0.7;
        const chars = useSpecial ? specialChars : charset;
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    return password;
  }

  /**
   * Authenticate user
   */
  static async authenticate(username: string, password: string): Promise<User | null> {
    const row = db.prepare<unknown[], UserWithPassword>(`
      SELECT id, username, password_hash as passwordHash, role, 
             first_login as firstLogin, created_at as createdAt, updated_at as updatedAt
      FROM users
      WHERE username = ?
    `).get(username);
    
    if (!row) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, row.passwordHash);
    if (!isValid) {
      return null;
    }
    
    // Return user without password hash
    const { passwordHash, ...user } = row;
    return user;
  }

  /**
   * Create a new user
   */
  static async createUser(username: string, password: string, role: 'admin' | 'user'): Promise<User> {
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);
    const userId = randomBytes(16).toString('hex');
    
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, first_login, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(userId, username, passwordHash, role, 0);
    
    return this.getUserById(userId)!;
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);
    
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, first_login = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, userId);
    
    // Delete initial password file if it exists
    if (fs.existsSync(this.INITIAL_PASSWORD_FILE)) {
      fs.unlinkSync(this.INITIAL_PASSWORD_FILE);
      logger.info('✓ Deleted initial password file');
    }
  }

  /**
   * Get user by ID
   */
  static getUserById(userId: string): User | null {
    const row = db.prepare<unknown[], User>(`
      SELECT id, username, role, first_login as firstLogin, 
             created_at as createdAt, updated_at as updatedAt
      FROM users
      WHERE id = ?
    `).get(userId);
    
    return row || null;
  }

  /**
   * Get user by username
   */
  static getUserByUsername(username: string): User | null {
    const row = db.prepare<unknown[], User>(`
      SELECT id, username, role, first_login as firstLogin,
             created_at as createdAt, updated_at as updatedAt
      FROM users
      WHERE username = ?
    `).get(username);
    
    return row || null;
  }

  /**
   * Get all users
   */
  static getAllUsers(): User[] {
    return db.prepare<unknown[], User>(`
      SELECT id, username, role, first_login as firstLogin,
             created_at as createdAt, updated_at as updatedAt
      FROM users
      ORDER BY created_at DESC
    `).all();
  }

  /**
   * Delete user
   */
  static deleteUser(userId: string): void {
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  }

  /**
   * Update user role
   */
  static updateUserRole(userId: string, role: 'admin' | 'user'): void {
    db.prepare(`
      UPDATE users 
      SET role = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(role, userId);
  }
}
