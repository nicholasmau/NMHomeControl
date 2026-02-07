import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
import { WebSocket, WebSocketServer } from 'ws';
import { parse as parseCookie } from 'cookie';
import { SessionService } from './session.service';
import { logger } from '../utils/logger';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAlive?: boolean;
  isDemoMode?: boolean;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer | HTTPSServer) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });

    logger.info('WebSocket server initializing...');

    this.wss.on('connection', async (ws: AuthenticatedWebSocket, request) => {
      logger.info('New WebSocket connection attempt');

      // Authenticate the connection using session from query parameter
      const url = new URL(request.url || '', 'ws://localhost');
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        logger.warn('WebSocket connection rejected: No sessionId in query');
        ws.close(1008, 'Authentication required');
        return;
      }

      const session = SessionService.getSession(sessionId);
      if (!session) {
        logger.warn('WebSocket connection rejected: Invalid session');
        ws.close(1008, 'Invalid or expired session');
        return;
      }

      // Attach user info to WebSocket
      ws.userId = session.userId;
      ws.isDemoMode = session.isDemoMode || false;
      ws.isAlive = true;

      // Get username (handle demo user)
      if (ws.isDemoMode && ws.userId === 'demo-user-id') {
        ws.username = 'demo';
      } else {
        const { UserService } = await import('./user.service');
        const user = UserService.getUserById(session.userId);
        ws.username = user?.username || 'unknown';
      }

      logger.info(`WebSocket authenticated: userId=${ws.userId}, username=${ws.username}, isDemoMode=${ws.isDemoMode}`);

      // Add to clients map
      if (!this.clients.has(ws.userId)) {
        this.clients.set(ws.userId, new Set());
      }
      this.clients.get(ws.userId)!.add(ws);

      // Set up pong handler for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        logger.info(`WebSocket disconnected: userId=${ws.userId}, username=${ws.username}`);
        const userClients = this.clients.get(ws.userId!);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            this.clients.delete(ws.userId!);
          }
        }
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for userId=${ws.userId}:`, error);
      });

      // Send initial connection success message
      this.sendToClient(ws, {
        type: 'connected',
        timestamp: new Date().toISOString(),
      });
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    logger.info('✓ WebSocket server initialized');
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(ws: AuthenticatedWebSocket, message: any) {
    logger.debug(`WebSocket message from ${ws.username}:`, message);

    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      case 'subscribe':
        // Client can subscribe to specific device updates
        // For now, all authenticated clients receive all updates
        this.sendToClient(ws, { 
          type: 'subscribed', 
          deviceId: message.deviceId,
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        logger.warn(`Unknown WebSocket message type: ${message.type}`);
    }
  }

  /**
   * Start heartbeat to detect and close dead connections
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws: WebSocket) => {
        const client = ws as AuthenticatedWebSocket;
        
        if (client.isAlive === false) {
          logger.info(`Terminating dead connection: userId=${client.userId}`);
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: AuthenticatedWebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast device status update to all connected clients
   */
  broadcastDeviceUpdate(deviceId: string, status: any, isDemoMode = false) {
    if (!this.wss) return;

    const message = {
      type: 'device-update',
      deviceId,
      status,
      timestamp: new Date().toISOString(),
    };

    let broadcastCount = 0;

    this.wss.clients.forEach((ws: WebSocket) => {
      const client = ws as AuthenticatedWebSocket;
      
      // Only send to clients in the same mode (demo vs real)
      if (client.isDemoMode === isDemoMode && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
        broadcastCount++;
      }
    });

    logger.debug(`Broadcasted device update for ${deviceId} to ${broadcastCount} clients (isDemoMode=${isDemoMode})`);
  }

  /**
   * Broadcast to specific user
   */
  broadcastToUser(userId: string, data: any) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const message = JSON.stringify(data);
    let sentCount = 0;

    userClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    });

    logger.debug(`Sent message to user ${userId} (${sentCount} connections)`);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(data: any) {
    if (!this.wss) return;

    const message = JSON.stringify(data);
    let broadcastCount = 0;

    this.wss.clients.forEach((ws: WebSocket) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        broadcastCount++;
      }
    });

    logger.debug(`Broadcasted to ${broadcastCount} clients`);
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalConnections: this.wss?.clients.size || 0,
      uniqueUsers: this.clients.size,
      userBreakdown: Array.from(this.clients.entries()).map(([userId, clients]) => ({
        userId,
        connections: clients.size,
      })),
    };
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.wss) {
      this.wss.clients.forEach((ws) => {
        ws.close(1001, 'Server shutting down');
      });
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    logger.info('WebSocket server shut down');
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
