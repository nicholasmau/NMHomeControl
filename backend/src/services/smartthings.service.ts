import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { logger, logTelemetry } from '../utils/logger';

export interface SmartThingsDevice {
  deviceId: string;
  name: string;
  label: string;
  roomId?: string;
  manufacturerName?: string;
  presentationId?: string;
  deviceTypeName?: string;
  components: Record<string, Component>;
}

export interface Component {
  id: string;
  capabilities: Capability[];
}

export interface Capability {
  id: string;
  version?: number;
}

export interface DeviceStatus {
  components: Record<string, ComponentStatus>;
}

export interface ComponentStatus {
  [capabilityId: string]: {
    [attributeName: string]: {
      value: unknown;
      unit?: string;
      timestamp: string;
    };
  };
}

export interface Room {
  roomId: string;
  name: string;
}

export interface SceneAction {
  deviceId: string;
  deviceLabel?: string;
  capability: string;
  command: string;
  arguments?: unknown[];
}

export interface Scene {
  sceneId: string;
  sceneName: string;
  sceneIcon?: string;
  sceneColor?: string;
  locationId: string;
  createdBy: string;
  createdDate: string;
  lastUpdatedDate: string;
  lastExecutedDate?: string;
  actions?: SceneAction[];
}

export class SmartThingsService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.smartthings.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.smartthings.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Get all devices
   */
  async getDevices(): Promise<SmartThingsDevice[]> {
    try {
      const startTime = Date.now();
      const response = await this.client.get('/devices');
      const responseTime = Date.now() - startTime;
      
      logTelemetry({
        metric: 'smartthings.api.devices.list',
        responseTime,
        success: true,
      });
      
      // Fetch rooms to map roomId to room name
      let roomsMap: Record<string, string> = {};
      try {
        const rooms = await this.getRooms();
        rooms.forEach(room => {
          roomsMap[room.roomId] = room.name;
        });
      } catch (roomsError) {
        logger.warn('Failed to fetch rooms for device mapping');
      }
      
      // Transform components from array to object keyed by component ID
      // and fetch status for each device
      const devices = await Promise.all((response.data.items || []).map(async (device: any) => {
        // Transform components array to object
        if (Array.isArray(device.components)) {
          const componentsObj: Record<string, any> = {};
          device.components.forEach((component: any) => {
            componentsObj[component.id] = component;
          });
          device.components = componentsObj;
        }
        
        // Add room name based on roomId
        if (device.roomId && roomsMap[device.roomId]) {
          device.room = roomsMap[device.roomId];
        }
        
        // Fetch current status for the device
        try {
          const statusResponse = await this.client.get(`/devices/${device.deviceId}/status`);
          // Merge status into components
          if (statusResponse.data?.components && device.components) {
            Object.keys(statusResponse.data.components).forEach(componentId => {
              if (device.components[componentId]) {
                device.components[componentId] = {
                  ...device.components[componentId],
                  ...statusResponse.data.components[componentId]
                };
              }
            });
          }
        } catch (statusError) {
          // If status fetch fails, just log and continue without status
          logger.warn(`Failed to fetch status for device ${device.deviceId}`);
        }
        
        return device;
      }));
      
      return devices;
    } catch (error) {
      logger.error('Failed to fetch devices from SmartThings:', error);
      logTelemetry({
        metric: 'smartthings.api.devices.list',
        success: false,
      });
      throw new Error('Failed to fetch devices');
    }
  }

  /**
   * Get device details
   */
  async getDevice(deviceId: string): Promise<SmartThingsDevice> {
    try {
      const startTime = Date.now();
      const response = await this.client.get(`/devices/${deviceId}`);
      const responseTime = Date.now() - startTime;
      
      logTelemetry({
        metric: 'smartthings.api.device.get',
        deviceId,
        responseTime,
        success: true,
      });
      
      // Transform components from array to object keyed by component ID
      const device = response.data;
      if (Array.isArray(device.components)) {
        const componentsObj: Record<string, any> = {};
        device.components.forEach((component: any) => {
          componentsObj[component.id] = component;
        });
        device.components = componentsObj;
      }
      
      return device;
    } catch (error) {
      logger.error(`Failed to fetch device ${deviceId}:`, error);
      logTelemetry({
        metric: 'smartthings.api.device.get',
        deviceId,
        success: false,
      });
      throw new Error('Failed to fetch device');
    }
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    try {
      const startTime = Date.now();
      const response = await this.client.get(`/devices/${deviceId}/status`);
      const responseTime = Date.now() - startTime;
      
      logTelemetry({
        metric: 'smartthings.api.device.status',
        deviceId,
        responseTime,
        success: true,
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch status for device ${deviceId}:`, error);
      logTelemetry({
        metric: 'smartthings.api.device.status',
        deviceId,
        success: false,
      });
      throw new Error('Failed to fetch device status');
    }
  }

  /**
   * Execute device command
   */
  async executeCommand(
    deviceId: string,
    capability: string,
    command: string,
    args: unknown[] = []
  ): Promise<void> {
    try {
      const startTime = Date.now();
      
      await this.client.post(`/devices/${deviceId}/commands`, {
        commands: [
          {
            component: 'main',
            capability,
            command,
            arguments: args,
          },
        ],
      });
      
      const responseTime = Date.now() - startTime;
      
      logTelemetry({
        metric: 'smartthings.device.command',
        deviceId,
        capability,
        newValue: command,
        responseTime,
        success: true,
      });
      
      logger.info(`Command executed: ${command} on device ${deviceId}`);
    } catch (error: any) {
      logger.error(`Failed to execute command on device ${deviceId}:`, {
        capability,
        command,
        args,
        error: error.message,
        status: error.response?.status,
        details: error.response?.data,
      });
      logTelemetry({
        metric: 'smartthings.device.command',
        deviceId,
        capability,
        newValue: command,
        success: false,
      });
      throw new Error('Failed to execute device command');
    }
  }

  /**
   * Get all rooms
   */
  async getRooms(): Promise<Room[]> {
    try {
      const startTime = Date.now();
      const response = await this.client.get('/locations');
      
      if (!response.data.items || response.data.items.length === 0) {
        logger.warn('No locations found in SmartThings account');
        return [];
      }
      
      // Get rooms from the first location
      const locationId = response.data.items[0].locationId;
      const roomsResponse = await this.client.get(`/locations/${locationId}/rooms`);
      const responseTime = Date.now() - startTime;
      
      logTelemetry({
        metric: 'smartthings.api.rooms.list',
        responseTime,
        success: true,
      });
      
      return roomsResponse.data.items || [];
    } catch (error: any) {
      // Log detailed error information
      if (error.response) {
        logger.error('SmartThings API error for rooms:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
      } else {
        logger.error('Failed to fetch rooms from SmartThings:', error);
      }
      
      logTelemetry({
        metric: 'smartthings.api.rooms.list',
        success: false,
      });
      
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  }

  /**
   * Get all scenes
   */
  async getScenes(): Promise<Scene[]> {
    try {
      const startTime = Date.now();
      
      // First, get the location ID
      const locationsResponse = await this.client.get('/locations');
      if (!locationsResponse.data.items || locationsResponse.data.items.length === 0) {
        return [];
      }
      
      const locationId = locationsResponse.data.items[0].locationId;
      
      // Get scenes for the location
      const scenesResponse = await this.client.get(`/scenes`, {
        params: { locationId }
      });
      
      const scenes = scenesResponse.data.items || [];
      
      // Fetch full details for each scene including actions
      const detailedScenes = await Promise.all(
        scenes.map(async (scene: Scene) => {
          try {
            const detailResponse = await this.client.get(`/scenes/${scene.sceneId}`);
            const sceneDetail = detailResponse.data;
            
            // Get all devices to map deviceIds to labels
            const devices = await this.getDevices();
            const deviceMap = new Map(devices.map(d => [d.deviceId, d.label || d.name]));
            
            // Extract and format actions
            const actions: SceneAction[] = (sceneDetail.actions || []).map((action: any) => ({
              deviceId: action.deviceId,
              deviceLabel: deviceMap.get(action.deviceId) || 'Unknown Device',
              capability: action.capability,
              command: action.command,
              arguments: action.arguments,
            }));
            
            return {
              ...scene,
              actions,
            };
          } catch (error) {
            logger.warn(`Failed to fetch details for scene ${scene.sceneId}:`, error);
            return scene; // Return basic scene info if details fetch fails
          }
        })
      );
      
      const responseTime = Date.now() - startTime;
      
      logTelemetry({
        metric: 'smartthings.api.scenes.list',
        responseTime,
        success: true,
        sceneCount: detailedScenes.length,
      });
      
      return detailedScenes;
    } catch (error: any) {
      if (error.response) {
        logger.error('SmartThings API error for scenes:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
      } else {
        logger.error('Failed to fetch scenes from SmartThings:', error);
      }
      logTelemetry({
        metric: 'smartthings.api.scenes.list',
        success: false,
      });
      return [];
    }
  }

  /**
   * Execute a scene
   */
  async executeScene(sceneId: string): Promise<void> {
    try {
      const startTime = Date.now();
      
      await this.client.post(`/scenes/${sceneId}/execute`);
      
      const responseTime = Date.now() - startTime;
      
      logTelemetry({
        metric: 'smartthings.scene.execute',
        sceneId,
        responseTime,
        success: true,
      });
      
      logger.info(`Scene executed: ${sceneId}`);
    } catch (error) {
      logger.error(`Failed to execute scene ${sceneId}:`, error);
      logTelemetry({
        metric: 'smartthings.scene.execute',
        sceneId,
        success: false,
      });
      throw new Error('Failed to execute scene');
    }
  }

  /**
   * Test connection to SmartThings API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/devices');
      return true;
    } catch (error) {
      logger.error('SmartThings connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const smartThingsService = new SmartThingsService();
