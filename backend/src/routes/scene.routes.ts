import { FastifyInstance } from 'fastify';
import { smartThingsService } from '../services/smartthings.service';
import { authMiddleware, firstLoginMiddleware } from '../middleware/auth.middleware';
import { logAudit, logTelemetry } from '../utils/logger';

export async function sceneRoutes(fastify: FastifyInstance) {
  // Apply authentication and first login check to all scene routes
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', firstLoginMiddleware);

  /**
   * Get all scenes
   */
  fastify.get('/', async (request, reply) => {
    try {
      const scenes = await smartThingsService.getScenes();
      return { scenes };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch scenes' });
    }
  });

  /**
   * Execute a scene
   */
  fastify.post('/:sceneId/execute', async (request, reply) => {
    try {
      const { sceneId } = request.params as { sceneId: string };
      const startTime = Date.now();
      const mode = request.isDemoMode ? 'demo' : 'production';

      // Demo mode: skip SmartThings API call
      if (request.isDemoMode) {
        // Simulate scene execution
        const duration = Math.random() * 0.1 + 0.05;
        
        logTelemetry({
          metric: 'scene.execute',
          sceneId,
          responseTime: duration * 1000,
          success: true,
        });
        
        logAudit({
          action: 'scene.execute',
          user: request.user!.username,
          sceneId,
          success: true,
          ip: request.ip,
        });
        
        return { success: true };
      }

      // Production mode: call SmartThings API
      await smartThingsService.executeScene(sceneId);
      const duration = (Date.now() - startTime) / 1000;

      // Log audit
      logAudit({
        action: 'scene.execute',
        user: request.user!.username,
        sceneId,
        success: true,
        ip: request.ip,
      });

      // Log telemetry
      logTelemetry({
        metric: 'scene.execute',
        sceneId,
        responseTime: duration * 1000,
        success: true,
      });

      return { success: true };
    } catch (error) {
      const { sceneId } = request.params as { sceneId: string };
      
      fastify.log.error(error);

      // Log failed audit
      logAudit({
        action: 'scene.execute',
        user: request.user!.username,
        sceneId,
        success: false,
        ip: request.ip,
      });

      // Log failed telemetry
      logTelemetry({
        metric: 'scene.execute',
        sceneId,
        success: false,
      });

      return reply.code(500).send({ error: 'Failed to execute scene' });
    }
  });
}
