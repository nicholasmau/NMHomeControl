import { FastifyRequest, FastifyReply } from 'fastify';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      role: 'admin' | 'user';
      firstLogin: boolean;
    };
    sessionId?: string;
    isDemoMode?: boolean;
  }
}

/**
 * Authentication middleware
 * Verifies that the user has a valid session
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies.sessionId;
  
  if (!sessionId) {
    return reply.code(401).send({ error: 'Not authenticated' });
  }
  
  const session = SessionService.getSession(sessionId);
  
  if (!session) {
    return reply.code(401).send({ error: 'Invalid or expired session' });
  }
  
  // Handle demo user (doesn't exist in database)
  let user;
  if (session.isDemoMode && session.userId === 'demo-user-id') {
    user = {
      id: 'demo-user-id',
      username: 'demo',
      role: 'user' as const,
      firstLogin: false,
    };
  } else {
    user = UserService.getUserById(session.userId);
    
    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }
  }
  
  // Refresh session on each request
  SessionService.refreshSession(sessionId);
  
  // Attach user and demo mode flag to request
  request.user = user;
  request.sessionId = sessionId;
  request.isDemoMode = session.isDemoMode || false;
}

/**
 * Admin-only middleware
 * Must be used after authMiddleware
 * Blocks demo mode users from accessing real admin data
 * @deprecated Use per-endpoint demo mode checks instead
 */
export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Block demo mode users - they should only see mock data
  if (request.isDemoMode) {
    return reply.code(403).send({ error: 'Demo mode cannot access real admin data' });
  }
  
  if (!request.user || request.user.role !== 'admin') {
    return reply.code(403).send({ error: 'Admin access required' });
  }
}

/**
 * First login check middleware
 * Forces password change on first login
 */
export async function firstLoginMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (request.user?.firstLogin && request.url !== '/api/auth/change-password') {
    return reply.code(403).send({ 
      error: 'Password change required',
      requiresPasswordChange: true,
    });
  }
}
