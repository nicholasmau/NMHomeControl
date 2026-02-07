import { FastifyInstance } from 'fastify';
import { UserService } from '../services/user.service';
import { SessionService } from '../services/session.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { logAudit } from '../utils/logger';
import { authAttempts, activeSessions, connectedDevices } from '../services/metrics.service';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * Login
   */
  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = loginSchema.parse(request.body);
      
      // Handle demo mode login
      if (username === 'demo' && password === 'demo1234') {
        const demoUser = {
          id: 'demo-user-id',
          username: 'demo',
          role: 'user' as const,
          firstLogin: false,
        };
        
        // Create a demo session (stored in memory, not database)
        const session = SessionService.createSession(demoUser.id, true);
        
        authAttempts.inc({ success: 'true', mode: 'demo' });
        activeSessions.inc({ mode: 'demo' });
        connectedDevices.set({ mode: 'demo' }, 8); // 8 demo devices
        
        logAudit({
          action: 'auth.login.success',
          user: demoUser.username,
          success: true,
          ip: request.ip,
        });
        
        // Set session cookie
        reply.setCookie('sessionId', session.id, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        
        return {
          user: demoUser,
          sessionId: session.id, // Return sessionId for WebSocket connection
        };
      }
      
      const user = await UserService.authenticate(username, password);
      
      if (!user) {
        authAttempts.inc({ success: 'false', mode: 'production' });
        logAudit({
          action: 'auth.login.failed',
          user: username,
          success: false,
          ip: request.ip,
        });
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
      
      // Create session
      const session = SessionService.createSession(user.id);
      
      authAttempts.inc({ success: 'true', mode: 'production' });
      activeSessions.inc({ mode: 'production' });
      
      logAudit({
        action: 'auth.login.success',
        user: user.username,
        success: true,
        ip: request.ip,
      });
      
      // Set session cookie
      reply.setCookie('sessionId', session.id, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      
      return {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          firstLogin: user.firstLogin,
        },
        sessionId: session.id, // Return sessionId for WebSocket connection
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      throw error;
    }
  });

  /**
   * Logout
   */
  fastify.post('/logout', { preHandler: authMiddleware }, async (request, reply) => {
    const sessionId = request.sessionId!;
    const mode = request.isDemoMode ? 'demo' : 'production';
    
    SessionService.deleteSession(sessionId);
    activeSessions.dec({ mode });
    
    logAudit({
      action: 'auth.logout',
      user: request.user!.username,
      success: true,
      ip: request.ip,
    });
    
    reply.clearCookie('sessionId');
    
    return { success: true };
  });

  /**
   * Get current user
   */
  fastify.get('/me', { preHandler: authMiddleware }, async (request) => {
    // Handle demo user
    if (request.user!.id === 'demo-user-id') {
      return {
        user: {
          id: 'demo-user-id',
          username: 'demo',
          role: 'user' as const,
          firstLogin: false,
        },
      };
    }
    
    return {
      user: {
        id: request.user!.id,
        username: request.user!.username,
        role: request.user!.role,
        firstLogin: request.user!.firstLogin,
      },
    };
  });

  /**
   * Change password
   */
  fastify.post('/change-password', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
      
      // Verify current password (unless it's first login)
      if (!request.user!.firstLogin) {
        if (!currentPassword) {
          return reply.code(400).send({ error: 'Current password is required' });
        }
        const user = await UserService.authenticate(request.user!.username, currentPassword);
        if (!user) {
          return reply.code(401).send({ error: 'Current password is incorrect' });
        }
      }
      
      // Change password
      await UserService.changePassword(request.user!.id, newPassword);
      
      logAudit({
        action: 'auth.password.changed',
        user: request.user!.username,
        success: true,
        ip: request.ip,
      });
      
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      throw error;
    }
  });
}
