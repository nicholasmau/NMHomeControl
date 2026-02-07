import { FastifyInstance } from 'fastify';
import { UserService } from '../services/user.service';
import { ACLService } from '../services/acl.service';
import { authMiddleware, firstLoginMiddleware } from '../middleware/auth.middleware';
import { logAudit } from '../utils/logger';
import { z } from 'zod';
import { getDemoUsers, getDemoAuditLogs } from '../data/demoAdminData';

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  role: z.enum(['admin', 'user']),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
});

const updateUserAccessSchema = z.object({
  devices: z.array(z.string()).default([]),
  rooms: z.array(z.string()).default([]),
});

export async function adminRoutes(fastify: FastifyInstance) {
  // All admin routes require authentication
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', firstLoginMiddleware);

  /**
   * Get all users
   * Demo mode: returns mock data
   * Real mode: requires admin role
   */
  fastify.get('/users', async (request, reply) => {
    // Demo mode returns mock data
    if (request.isDemoMode) {
      return { users: getDemoUsers() };
    }
    
    // Real mode requires admin role
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
    
    const users = UserService.getAllUsers();
    
    // Add access control info for each user
    const usersWithAccess = users.map(user => {
      const access = ACLService.getUserAccess(user.id);
      return {
        ...user,
        accessControl: {
          devices: access.filter(a => a.resourceType === 'device').map(a => a.resourceId),
          rooms: access.filter(a => a.resourceType === 'room').map(a => a.resourceId),
        },
      };
    });
    
    return { users: usersWithAccess };
  });

  /**
   * Create a new user
   * Demo mode: blocked (read-only)
   * Real mode: requires admin role
   */
  fastify.post('/users', async (request, reply) => {
    // Demo mode is read-only
    if (request.isDemoMode) {
      return reply.code(403).send({ error: 'Demo mode is read-only. Cannot create users.' });
    }
    
    // Real mode requires admin role
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
    
    try {
      const { username, password, role } = createUserSchema.parse(request.body);
      
      // Check if username already exists
      const existing = UserService.getUserByUsername(username);
      if (existing) {
        return reply.code(409).send({ error: 'Username already exists' });
      }
      
      const user = await UserService.createUser(username, password, role);
      
      logAudit({
        action: 'admin.user.created',
        user: request.user!.username,
        success: true,
        ip: request.ip,
        details: { createdUser: username, role },
      });
      
      return { user };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      throw error;
    }
  });

  /**
   * Delete a user
   * Demo mode: blocked (read-only)
   * Real mode: requires admin role
   */
  fastify.delete('/users/:userId', async (request, reply) => {
    // Demo mode is read-only
    if (request.isDemoMode) {
      return reply.code(403).send({ error: 'Demo mode is read-only. Cannot delete users.' });
    }
    
    // Real mode requires admin role
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
    
    const { userId } = request.params as { userId: string };
    
    // Prevent deleting yourself
    if (userId === request.user!.id) {
      return reply.code(400).send({ error: 'Cannot delete yourself' });
    }
    
    const user = UserService.getUserById(userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    UserService.deleteUser(userId);
    
    logAudit({
      action: 'admin.user.deleted',
      user: request.user!.username,
      success: true,
      ip: request.ip,
      details: { deletedUser: user.username },
    });
    
    return { success: true };
  });

  /**
   * Update user role
   * Demo mode: blocked (read-only)
   * Real mode: requires admin role
   */
  fastify.patch('/users/:userId/role', async (request, reply) => {
    // Demo mode is read-only
    if (request.isDemoMode) {
      return reply.code(403).send({ error: 'Demo mode is read-only. Cannot update user roles.' });
    }
    
    // Real mode requires admin role
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
    
    try {
      const { userId } = request.params as { userId: string };
      const { role } = updateUserRoleSchema.parse(request.body);
      
      // Prevent changing your own role
      if (userId === request.user!.id) {
        return reply.code(400).send({ error: 'Cannot change your own role' });
      }
      
      const user = UserService.getUserById(userId);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      UserService.updateUserRole(userId, role);
      
      logAudit({
        action: 'admin.user.role_changed',
        user: request.user!.username,
        success: true,
        ip: request.ip,
        details: { targetUser: user.username, newRole: role },
      });
      
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      throw error;
    }
  });

  /**
   * Update user access control
   * Demo mode: blocked (read-only)
   * Real mode: requires admin role
   */
  fastify.put('/users/:userId/access', async (request, reply) => {
    // Demo mode is read-only
    if (request.isDemoMode) {
      return reply.code(403).send({ error: 'Demo mode is read-only. Cannot update access control.' });
    }
    
    // Real mode requires admin role
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
    
    try {
      const { userId } = request.params as { userId: string };
      const { devices, rooms } = updateUserAccessSchema.parse(request.body);
      
      const user = UserService.getUserById(userId);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      // Only update ACL for non-admin users
      if (user.role === 'admin') {
        return reply.code(400).send({ error: 'Cannot set access control for admin users' });
      }
      
      ACLService.setUserAccess(userId, devices, rooms);
      
      logAudit({
        action: 'admin.user.access_updated',
        user: request.user!.username,
        success: true,
        ip: request.ip,
        details: { 
          targetUser: user.username, 
          devicesCount: devices.length,
          roomsCount: rooms.length,
        },
      });
      
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: error.errors });
      }
      throw error;
    }
  });

  /**
   * Get audit logs
   * Demo mode: returns mock data
   * Real mode: requires admin role
   */
  fastify.get('/audit-logs', async (request, reply) => {
    const { limit = 100, offset = 0, action, user, success } = request.query as { 
      limit?: number; 
      offset?: number;
      action?: string;
      user?: string;
      success?: boolean;
    };
    
    // Demo mode returns mock data
    if (request.isDemoMode) {
      const allLogs = getDemoAuditLogs({ action, user, success: success !== undefined ? success : undefined });
      const paginatedLogs = allLogs.slice(offset, offset + limit);
      
      return {
        logs: paginatedLogs,
        total: allLogs.length,
        limit,
        offset,
      };
    }
    
    // Real mode requires admin role
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
    
    const logs = fastify.db.prepare(`
      SELECT id, timestamp, action, username, device_id as deviceId, 
             device_name as deviceName, command, success, ip
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    const total = fastify.db.prepare(`
      SELECT COUNT(*) as count FROM audit_logs
    `).get() as { count: number };
    
    return {
      logs,
      total: total.count,
      limit,
      offset,
    };
  });
}
