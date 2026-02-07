import { useEffect, useState } from 'react';
import { websocketClient } from '../lib/websocket';

/**
 * Hook to subscribe to WebSocket connection status
 */
export function useWebSocketConnection() {
  const [isConnected, setIsConnected] = useState(websocketClient.getConnectionStatus());

  useEffect(() => {
    const unsubscribe = websocketClient.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  return isConnected;
}

/**
 * Hook to subscribe to device updates via WebSocket
 */
export function useDeviceUpdates(callback: (deviceId: string, status: any) => void) {
  useEffect(() => {
    const unsubscribe = websocketClient.onDeviceUpdate(callback);
    return unsubscribe;
  }, [callback]);
}

/**
 * Hook to subscribe to a specific device's updates
 */
export function useDeviceStatus(deviceId: string | undefined) {
  const [status, setStatus] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!deviceId) return;

    // Subscribe to this device
    websocketClient.subscribeToDevice(deviceId);

    // Listen for updates
    const unsubscribe = websocketClient.onDeviceUpdate((updatedDeviceId, newStatus) => {
      if (updatedDeviceId === deviceId) {
        setStatus(newStatus);
        setLastUpdate(new Date());
      }
    });

    return unsubscribe;
  }, [deviceId]);

  return { status, lastUpdate };
}
