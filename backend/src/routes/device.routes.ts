import { FastifyInstance } from 'fastify';
import { smartThingsService } from '../services/smartthings.service';
import { deviceHistoryService } from '../services/device-history.service';
import { websocketService } from '../services/websocket.service';
import { authMiddleware, firstLoginMiddleware } from '../middleware/auth.middleware';
import { deviceACLMiddleware, filterDevicesByACL } from '../middleware/acl.middleware';
import { logAudit, logTelemetry } from '../utils/logger';
import { deviceCommands, deviceCommandDuration, smartthingsApiCalls, smartthingsApiDuration } from '../services/metrics.service';
import { z } from 'zod';

const executeCommandSchema = z.object({
  capability: z.string(),
  command: z.string(),
  args: z.array(z.unknown()).optional().default([]),
});

export async function deviceRoutes(fastify: FastifyInstance) {
  // Apply authentication and first login check to all device routes
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', firstLoginMiddleware);

  /**
   * Get all devices (filtered by ACL for non-admin users)
   */
  fastify.get('/', async (request, reply) => {
    try {
      const devices = await smartThingsService.getDevices();
      
      // Filter devices based on user's ACL
      const filteredDevices = filterDevicesByACL(
        devices,
        request.user!.id,
        request.user!.role
      );
      
      return { devices: filteredDevices };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch devices' });
    }
  });

  /**
   * Get single device details
   */
  fastify.get('/:deviceId', { preHandler: deviceACLMiddleware }, async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const device = await smartThingsService.getDevice(deviceId);
      
      return { device };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch device' });
    }
  });

  /**
   * Get device status
   */
  fastify.get('/:deviceId/status', { preHandler: deviceACLMiddleware }, async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const status = await smartThingsService.getDeviceStatus(deviceId);
      
      return { status };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch device status' });
    }
  });

  /**
   * Execute device command
   */
  fastify.post('/:deviceId/command', { preHandler: deviceACLMiddleware }, async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const { capability, command, args } = executeCommandSchema.parse(request.body);
      
      const startTime = Date.now();
      const mode = request.isDemoMode ? 'demo' : 'production';
      
      // Initialize device details for history recording
      let deviceLabel = deviceId;
      let room: string | undefined;
      let previousValue: string | undefined;
      
      // Demo mode: skip SmartThings API call, just track metrics and broadcast
      if (request.isDemoMode) {
        // In demo mode, we don't have device details from API, use basic info
        deviceLabel = deviceId.replace(/-/g, ' ');
        room = 'Demo';
        previousValue = undefined; // Demo mode doesn't track previous values for now
        // Track mock SmartThings API call for demo mode
        smartthingsApiCalls.inc({ endpoint: 'executeCommand', success: 'true', mode: 'demo' });
        // Simulate API call duration (50-150ms for demo)
        const mockApiDuration = (Math.random() * 0.1 + 0.05);
        smartthingsApiDuration.observe({ endpoint: 'executeCommand', mode: 'demo' }, mockApiDuration);
        
        // Simulate a small delay for realism
        await new Promise(resolve => setTimeout(resolve, mockApiDuration * 1000));
        
        // Broadcast demo device update (frontend handles local state)
        websocketService.broadcastDeviceUpdate(deviceId, { [capability]: { value: command === 'on' ? 'on' : 'off' } }, true);
      } else {
        // Production mode: call actual SmartThings API and get device details
        // Get current device details for history recording
        const device = await smartThingsService.getDevice(deviceId);
        deviceLabel = device.label || device.name || deviceId;
        room = device.room;
        
        // Get previous value if possible
        try {
          const currentStatus = await smartThingsService.getDeviceStatus(deviceId);
          const mainComponent = currentStatus.components?.main || {};
          const capabilityData = mainComponent[capability];
          if (capabilityData && typeof capabilityData === 'object') {
            const attributeName = Object.keys(capabilityData)[0];
            if (attributeName) {
              previousValue = capabilityData[attributeName]?.value?.toString();
            }
          }
        } catch (error) {
          // Ignore errors getting previous value
        }
        
        await smartThingsService.executeCommand(deviceId, capability, command, args);
        
        // Get updated device status and broadcast via WebSocket
        try {
          const updatedStatus = await smartThingsService.getDeviceStatus(deviceId);
          websocketService.broadcastDeviceUpdate(deviceId, updatedStatus, false);
        } catch (wsError) {
          fastify.log.warn('Failed to broadcast device update:', wsError);
          // Don't fail the request if WebSocket broadcast fails
        }
      }
      
      const duration = (Date.now() - startTime) / 1000;
      
      // Update metrics
      deviceCommands.inc({ 
        device_id: deviceId, 
        capability, 
        command, 
        success: 'true',
        mode
      });
      deviceCommandDuration.observe({ device_id: deviceId, capability, mode }, duration);
      
      // Record in device history
      deviceHistoryService.recordStateChange({
        deviceId,
        deviceLabel,
        room,
        capability,
        attribute: capability, // For simple commands, attribute matches capability
        value: command,
        previousValue,
        triggeredBy: request.user!.username,
      });
      
      // Log audit
      logAudit({
        action: 'device.command',
        user: request.user!.username,
        deviceId,
        command: `${capability}.${command}`,
        success: true,
        ip: request.ip,
      });
      
      // Log telemetry
      logTelemetry({
        metric: 'device.command.executed',
        deviceId,
        capability,
        newValue: command,
        responseTime: duration * 1000,
        success: true,
      });
      
      return { success: true };
    } catch (error) {
      const { deviceId } = request.params as { deviceId: string };
      const body = request.body as any;
      const mode = request.isDemoMode ? 'demo' : 'production';
      
      deviceCommands.inc({ 
        device_id: deviceId, 
        capability: body?.capability || 'unknown', 
        command: body?.command || 'unknown', 
        success: 'false',
        mode
      });
      
      logAudit({
        action: 'device.command',
        user: request.user!.username,
        deviceId,
        command: `${body?.capability}.${body?.command}`,
        success: false,
        ip: request.ip,
      });
      
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to execute command' });
    }
  });

  /**
   * Get all rooms
   */
  fastify.get('/rooms/list', async (request, reply) => {
    try {
      const rooms = await smartThingsService.getRooms();
      return { rooms };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch rooms' });
    }
  });
}
