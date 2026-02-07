import { FastifyRequest, FastifyReply } from 'fastify';
import { ACLService } from '../services/acl.service';

/**
 * Device ACL middleware
 * Checks if user has permission to access a specific device
 */
export async function deviceACLMiddleware(request: FastifyRequest<{
  Params: { deviceId: string };
}>, reply: FastifyReply) {
  const { deviceId } = request.params;
  const user = request.user!;
  
  // Demo mode users have access to all demo devices
  if (request.isDemoMode) {
    return;
  }
  
  // Admins have access to all devices
  if (user.role === 'admin') {
    return;
  }
  
  // Check if user has explicit device access
  const hasDeviceAccess = ACLService.hasAccess(user.id, 'device', deviceId);
  
  if (hasDeviceAccess) {
    return;
  }
  
  // TODO: Check room-based access when we have device-to-room mapping
  // For now, deny access if no explicit device permission
  
  return reply.code(403).send({ 
    error: 'Access denied',
    message: 'You do not have permission to access this device',
  });
}

/**
 * Filter devices based on user ACL
 * Returns only devices the user has access to
 */
export function filterDevicesByACL(devices: any[], userId: string, userRole: string): any[] {
  // Demo mode or admins see all devices
  if (userRole === 'admin' || userId === 'demo-user-id') {
    return devices;
  }
  
  // Get user's accessible device IDs
  const accessibleDeviceIds = ACLService.getAccessibleDeviceIds(userId);
  const accessibleRoomIds = ACLService.getAccessibleRoomIds(userId);
  
  // Filter devices
  return devices.filter(device => {
    // Check direct device access
    if (accessibleDeviceIds.includes(device.deviceId)) {
      return true;
    }
    
    // Check room-based access
    if (device.roomId && accessibleRoomIds.includes(device.roomId)) {
      return true;
    }
    
    return false;
  });
}
