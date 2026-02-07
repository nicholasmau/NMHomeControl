import { FastifyInstance } from 'fastify';
import { deviceHistoryService } from '../services/device-history.service';
import { authMiddleware, firstLoginMiddleware } from '../middleware/auth.middleware';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Apply authentication to all analytics routes
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', firstLoginMiddleware);

  /**
   * Get device usage statistics
   */
  fastify.get('/usage-stats', async (request, reply) => {
    try {
      const { startDate, endDate, limit } = request.query as {
        startDate?: string;
        endDate?: string;
        limit?: string;
      };

      const stats = deviceHistoryService.getDeviceUsageStats({
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : 20,
      });

      return { stats };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch usage statistics' });
    }
  });

  /**
   * Get device history
   */
  fastify.get('/device-history/:deviceId', async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const { startDate, endDate, capability, limit } = request.query as {
        startDate?: string;
        endDate?: string;
        capability?: string;
        limit?: string;
      };

      const history = deviceHistoryService.getDeviceHistory({
        deviceId,
        startDate,
        endDate,
        capability,
        limit: limit ? parseInt(limit) : 100,
      });

      return { history };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch device history' });
    }
  });

  /**
   * Get time series data for charts
   */
  fastify.get('/time-series', async (request, reply) => {
    try {
      const { deviceIds, startDate, endDate, capability, attribute } = request.query as {
        deviceIds?: string;
        startDate?: string;
        endDate?: string;
        capability?: string;
        attribute?: string;
      };

      const deviceIdArray = deviceIds ? deviceIds.split(',') : undefined;

      const data = deviceHistoryService.getTimeSeriesData({
        deviceIds: deviceIdArray,
        startDate,
        endDate,
        capability,
        attribute,
      });

      return { data };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch time series data' });
    }
  });

  /**
   * Get hourly aggregation for activity charts
   */
  fastify.get('/hourly-activity/:deviceId', async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      const data = deviceHistoryService.getHourlyAggregation({
        deviceId,
        startDate,
        endDate,
      });

      return { data };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch hourly activity' });
    }
  });
}
