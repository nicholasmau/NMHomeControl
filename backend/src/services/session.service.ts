import { randomBytes } from 'crypto';
import { db } from '../database/db';
import { config } from '../config/env';

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  isDemoMode?: boolean;
}

// In-memory storage for demo sessions
const demoSessions = new Map<string, Session>();

export class SessionService {
  /**
   * Create a new session for a user
   */
  static createSession(userId: string, isDemoMode = false): Session {
    const sessionId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + config.session.timeoutMinutes * 60 * 1000).toISOString();
    
    const session: Session = {
      id: sessionId,
      userId,
      expiresAt,
      createdAt: new Date().toISOString(),
      isDemoMode,
    };
    
    // Store demo sessions in memory instead of database
    if (isDemoMode) {
      demoSessions.set(sessionId, session);
    } else {
      db.prepare(`
        INSERT INTO sessions (id, user_id, expires_at, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(sessionId, userId, expiresAt);
    }
    
    return session;
  }

  /**
   * Get session by ID
   */
  static getSession(sessionId: string): Session | null {
    // Check demo sessions first
    const demoSession = demoSessions.get(sessionId);
    if (demoSession) {
      // Check if session has expired
      if (new Date(demoSession.expiresAt) < new Date()) {
        demoSessions.delete(sessionId);
        return null;
      }
      return demoSession;
    }
    
    const row = db.prepare<unknown[], Session>(`
      SELECT id, user_id as userId, expires_at as expiresAt, created_at as createdAt
      FROM sessions
      WHERE id = ?
    `).get(sessionId);
    
    if (!row) {
      return null;
    }
    
    // Check if session has expired
    if (new Date(row.expiresAt) < new Date()) {
      this.deleteSession(sessionId);
      return null;
    }
    
    return row;
  }

  /**
   * Refresh session expiration
   */
  static refreshSession(sessionId: string): void {
    const expiresAt = new Date(Date.now() + config.session.timeoutMinutes * 60 * 1000).toISOString();
    
    // Check if it's a demo session
    const demoSession = demoSessions.get(sessionId);
    if (demoSession) {
      demoSession.expiresAt = expiresAt;
      return;
    }
    
    db.prepare(`
      UPDATE sessions
      SET expires_at = ?
      WHERE id = ?
    `).run(expiresAt, sessionId);
  }

  /**
   * Delete a session (logout)
   */
  static deleteSession(sessionId: string): void {
    // Check if it's a demo session
    if (demoSessions.has(sessionId)) {
      demoSessions.delete(sessionId);
      return;
    }
    
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  /**
   * Delete all sessions for a user
   */
  static deleteUserSessions(userId: string): void {
    // Delete demo sessions for this user
    for (const [sessionId, session] of demoSessions.entries()) {
      if (session.userId === userId) {
        demoSessions.delete(sessionId);
      }
    }
    
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): void {
    db.prepare(`
      DELETE FROM sessions
      WHERE datetime(expires_at) < datetime('now')
    `).run();
  }
}

// Clean up expired sessions every 5 minutes
setInterval(() => {
  SessionService.cleanupExpiredSessions();
}, 5 * 60 * 1000);
