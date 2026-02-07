import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { db } from '../database/db';
import { logAudit } from '../utils/logger';

/**
 * Audit logging middleware
 * Logs all authenticated requests
 */
export async function auditMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Skip logging for certain endpoints
  const skipPaths = ['/api/health', '/metrics', '/api/auth/me'];
  if (skipPaths.some(path => request.url.startsWith(path))) {
    return;
  }
  
  // Store original send function
  const originalSend = reply.send.bind(reply);
  
  // Override send to log after response
  reply.send = function(payload: any) {
    // Log the audit entry
    if (request.user) {
      const auditId = randomBytes(16).toString('hex');
      const timestamp = new Date().toISOString();
      
      const entry = {
        id: auditId,
        timestamp,
        action: `${request.method} ${request.url}`,
        user_id: request.user.id,
        username: request.user.username,
        success: reply.statusCode < 400,
        ip: request.ip,
      };
      
      // Log to audit logger
      logAudit({
        action: entry.action,
        user: entry.username,
        success: entry.success,
        ip: entry.ip,
      });
      
      // Save to database for querying
      try {
        // Skip database insert for demo users (they don't exist in the users table)
        if (request.user.id !== 'demo-user-id') {
          db.prepare(`
            INSERT INTO audit_logs (id, timestamp, action, user_id, username, success, ip)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            entry.id,
            entry.timestamp,
            entry.action,
            entry.user_id,
            entry.username,
            entry.success ? 1 : 0,
            entry.ip
          );
        }
      } catch (error) {
        // Don't fail request if audit logging fails
        console.error('Failed to save audit log:', error);
      }
    }
    
    // Call original send
    return originalSend(payload);
  };
}
