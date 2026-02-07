import { randomBytes } from 'crypto';
import { db } from '../database/db';

export interface AccessControl {
  id: string;
  userId: string;
  resourceType: 'device' | 'room';
  resourceId: string;
  createdAt: string;
}

export class ACLService {
  /**
   * Grant access to a resource
   */
  static grantAccess(userId: string, resourceType: 'device' | 'room', resourceId: string): AccessControl {
    const aclId = randomBytes(16).toString('hex');
    
    db.prepare(`
      INSERT OR IGNORE INTO access_control (id, user_id, resource_type, resource_id, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(aclId, userId, resourceType, resourceId);
    
    return {
      id: aclId,
      userId,
      resourceType,
      resourceId,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Revoke access to a resource
   */
  static revokeAccess(userId: string, resourceType: 'device' | 'room', resourceId: string): void {
    db.prepare(`
      DELETE FROM access_control
      WHERE user_id = ? AND resource_type = ? AND resource_id = ?
    `).run(userId, resourceType, resourceId);
  }

  /**
   * Check if user has access to a resource
   */
  static hasAccess(userId: string, resourceType: 'device' | 'room', resourceId: string): boolean {
    const row = db.prepare(`
      SELECT id FROM access_control
      WHERE user_id = ? AND resource_type = ? AND resource_id = ?
    `).get(userId, resourceType, resourceId);
    
    return !!row;
  }

  /**
   * Get all resources a user has access to
   */
  static getUserAccess(userId: string): AccessControl[] {
    return db.prepare<unknown[], AccessControl>(`
      SELECT id, user_id as userId, resource_type as resourceType, 
             resource_id as resourceId, created_at as createdAt
      FROM access_control
      WHERE user_id = ?
    `).all(userId);
  }

  /**
   * Get all accessible device IDs for a user
   */
  static getAccessibleDeviceIds(userId: string): string[] {
    const rows = db.prepare<unknown[], { resourceId: string }>(`
      SELECT resource_id as resourceId
      FROM access_control
      WHERE user_id = ? AND resource_type = 'device'
    `).all(userId);
    
    return rows.map(r => r.resourceId);
  }

  /**
   * Get all accessible room IDs for a user
   */
  static getAccessibleRoomIds(userId: string): string[] {
    const rows = db.prepare<unknown[], { resourceId: string }>(`
      SELECT resource_id as resourceId
      FROM access_control
      WHERE user_id = ? AND resource_type = 'room'
    `).all(userId);
    
    return rows.map(r => r.resourceId);
  }

  /**
   * Remove all access for a user
   */
  static removeAllUserAccess(userId: string): void {
    db.prepare('DELETE FROM access_control WHERE user_id = ?').run(userId);
  }

  /**
   * Set user access (replace all existing access)
   */
  static setUserAccess(userId: string, devices: string[], rooms: string[]): void {
    db.transaction(() => {
      // Remove all existing access
      this.removeAllUserAccess(userId);
      
      // Grant device access
      devices.forEach(deviceId => {
        this.grantAccess(userId, 'device', deviceId);
      });
      
      // Grant room access
      rooms.forEach(roomId => {
        this.grantAccess(userId, 'room', roomId);
      });
    })();
  }
}
