/**
 * WebSocket client for real-time device updates
 */

type DeviceUpdateCallback = (deviceId: string, status: any) => void;
type ConnectionCallback = (connected: boolean) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private deviceUpdateCallbacks: Set<DeviceUpdateCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private isConnected = false;
  private shouldReconnect = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;

  /**
   * Set session ID for WebSocket authentication
   */
  setSessionId(sessionId: string | null) {
    this.sessionId = sessionId;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    this.shouldReconnect = true;
    // Backend always runs on HTTPS in Docker, so WebSocket should use wss://
    const protocol = 'wss:';
    const host = window.location.hostname;
    const port = import.meta.env.DEV ? '3001' : window.location.port;
    
    const wsUrl = `${protocol}//${host}:${port}/ws${this.sessionId ? `?sessionId=${this.sessionId}` : ''}`;

    console.log('[WebSocket] Connecting to:', wsUrl.replace(/sessionId=[^&]+/, 'sessionId=***'));

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyConnectionCallbacks(true);
        this.startHeartbeat();
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        this.notifyConnectionCallbacks(false);

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any) {
    switch (message.type) {
      case 'connected':
        console.log('[WebSocket] Connection confirmed at', message.timestamp);
        break;

      case 'device-update':
        console.log('[WebSocket] Device update:', message.deviceId, message.status);
        this.notifyDeviceUpdateCallbacks(message.deviceId, message.status);
        break;

      case 'pong':
        console.log('[WebSocket] Pong received');
        break;

      case 'subscribed':
        console.log('[WebSocket] Subscribed to device:', message.deviceId);
        break;

      default:
        console.log('[WebSocket] Unknown message type:', message.type);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect() {
    if (!this.shouldReconnect) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      console.log('[WebSocket] Attempting reconnection...');
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 25000); // 25 seconds (server timeout is 30s)
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message to server
   */
  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }

  /**
   * Subscribe to device updates
   */
  subscribeToDevice(deviceId: string) {
    this.send({
      type: 'subscribe',
      deviceId,
    });
  }

  /**
   * Register callback for device updates
   */
  onDeviceUpdate(callback: DeviceUpdateCallback) {
    this.deviceUpdateCallbacks.add(callback);
    return () => this.deviceUpdateCallbacks.delete(callback);
  }

  /**
   * Register callback for connection status changes
   */
  onConnectionChange(callback: ConnectionCallback) {
    this.connectionCallbacks.add(callback);
    // Immediately notify of current status
    callback(this.isConnected);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Notify all device update callbacks
   */
  private notifyDeviceUpdateCallbacks(deviceId: string, status: any) {
    this.deviceUpdateCallbacks.forEach((callback) => {
      try {
        callback(deviceId, status);
      } catch (error) {
        console.error('[WebSocket] Error in device update callback:', error);
      }
    });
  }

  /**
   * Notify all connection callbacks
   */
  private notifyConnectionCallbacks(connected: boolean) {
    this.connectionCallbacks.forEach((callback) => {
      try {
        callback(connected);
      } catch (error) {
        console.error('[WebSocket] Error in connection callback:', error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    console.log('[WebSocket] Disconnecting...');
    this.shouldReconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.isConnected = false;
    this.notifyConnectionCallbacks(false);
  }

  /**
   * Check if connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const websocketClient = new WebSocketClient();
