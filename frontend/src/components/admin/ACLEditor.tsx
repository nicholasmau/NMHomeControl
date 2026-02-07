import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, deviceAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Users,
  Shield,
  ShieldCheck,
  Search,
  Lightbulb,
  Power,
  Thermometer,
  Video,
  Lock,
  ChevronRight,
  Check,
  X,
  Save,
  RotateCcw,
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  role: string;
  accessControl: {
    devices: string[];
    rooms: string[];
  };
}

interface Device {
  deviceId: string;
  label: string;
  type?: string;
  room?: string;
}

interface PendingChanges {
  [userId: string]: {
    devices: string[];
    rooms: string[];
  };
}

export default function ACLEditor() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchDevice, setSearchDevice] = useState('');
  const [searchRoom, setSearchRoom] = useState('');
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminAPI.getUsers,
  });

  const { data: devicesData, isLoading: loadingDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: deviceAPI.getDevices,
  });

  const updateAccessMutation = useMutation({
    mutationFn: ({ userId, devices, rooms }: { userId: string; devices: string[]; rooms: string[] }) =>
      adminAPI.updateUserAccess(userId, devices, rooms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setPendingChanges({});
    },
  });

  const users = usersData?.users?.filter((u: User) => u.role !== 'admin') || [];
  const devices = devicesData?.devices || [];
  const selectedUser = users.find((u: User) => u.id === selectedUserId);

  // Extract unique rooms
  const rooms = Array.from(new Set(devices.map((d: Device) => d.room).filter(Boolean))) as string[];

  // Get current access (either from pending changes or user's actual access)
  const getCurrentAccess = (userId: string) => {
    if (pendingChanges[userId]) {
      return pendingChanges[userId];
    }
    const user = users.find((u: User) => u.id === userId);
    return user?.accessControl || { devices: [], rooms: [] };
  };

  // Toggle device access
  const toggleDevice = (userId: string, deviceId: string) => {
    const current = getCurrentAccess(userId);
    const devices = current.devices.includes(deviceId)
      ? current.devices.filter((id: string) => id !== deviceId)
      : [...current.devices, deviceId];
    
    setPendingChanges({
      ...pendingChanges,
      [userId]: { ...current, devices },
    });
  };

  // Toggle room access (all devices in room)
  const toggleRoom = (userId: string, room: string) => {
    const current = getCurrentAccess(userId);
    const roomDevices: string[] = devices.filter((d: Device) => d.room === room).map((d: Device) => d.deviceId);
    const hasAllRoomDevices: boolean = roomDevices.every((id: string) => current.devices.includes(id));

    const updatedDevices: string[] = hasAllRoomDevices
      ? current.devices.filter((id: string) => !roomDevices.includes(id))
      : [...new Set([...current.devices, ...roomDevices])];

    setPendingChanges({
      ...pendingChanges,
      [userId]: { ...current, devices: updatedDevices },
    });
  };

  // Save changes for selected user
  const saveChanges = () => {
    if (!selectedUserId || !pendingChanges[selectedUserId]) return;
    
    const changes = pendingChanges[selectedUserId];
    updateAccessMutation.mutate({
      userId: selectedUserId,
      devices: changes.devices,
      rooms: changes.rooms,
    });
  };

  // Discard changes for selected user
  const discardChanges = () => {
    if (!selectedUserId) return;
    
    const newPending = { ...pendingChanges };
    delete newPending[selectedUserId];
    setPendingChanges(newPending);
  };

  const hasPendingChanges = selectedUserId && pendingChanges[selectedUserId];

  // Filter devices and rooms
  const filteredDevices = devices.filter((d: Device) =>
    d.label.toLowerCase().includes(searchDevice.toLowerCase())
  );

  const filteredRooms = rooms.filter(room =>
    room.toLowerCase().includes(searchRoom.toLowerCase())
  );

  const getDeviceIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'light':
      case 'switch':
        return Lightbulb;
      case 'thermostat':
        return Thermometer;
      case 'camera':
        return Video;
      case 'lock':
        return Lock;
      default:
        return Power;
    }
  };

  if (loadingUsers || loadingDevices) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <CardTitle>Access Control Manager</CardTitle>
          </div>
          {hasPendingChanges && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={discardChanges}
                disabled={updateAccessMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={saveChanges}
                disabled={updateAccessMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Users ({users.length})</h3>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No non-admin users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user: User) => {
                  const access = getCurrentAccess(user.id);
                  const hasChanges = !!pendingChanges[user.id];
                  
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedUserId === user.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      } ${hasChanges ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-muted-foreground">
                              {access.devices.length} devices
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasChanges && (
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Devices & Rooms */}
          {selectedUser ? (
            <>
              {/* Devices Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Devices ({getCurrentAccess(selectedUser.id).devices.length}/{devices.length})
                  </h3>
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search devices..."
                    value={searchDevice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchDevice(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredDevices.map((device: Device) => {
                    const hasAccess = getCurrentAccess(selectedUser.id).devices.includes(device.deviceId);
                    const Icon = getDeviceIcon(device.type);

                    return (
                      <button
                        key={device.deviceId}
                        onClick={() => toggleDevice(selectedUser.id, device.deviceId)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          hasAccess
                            ? 'border-green-500/50 bg-green-500/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              hasAccess ? 'bg-green-500/20' : 'bg-muted'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{device.label}</div>
                              {device.room && (
                                <div className="text-xs text-muted-foreground">{device.room}</div>
                              )}
                            </div>
                          </div>
                          {hasAccess ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground/30" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rooms Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Rooms ({rooms.length})</h3>
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rooms..."
                    value={searchRoom}
                    onChange={(e) => setSearchRoom(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredRooms.map((room) => {
                    const roomDevices = devices.filter((d: Device) => d.room === room);
                    const accessibleDevices = roomDevices.filter((d: Device) =>
                      getCurrentAccess(selectedUser.id).devices.includes(d.deviceId)
                    );
                    const hasFullAccess = roomDevices.length > 0 && accessibleDevices.length === roomDevices.length;

                    return (
                      <button
                        key={room}
                        onClick={() => toggleRoom(selectedUser.id, room)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          hasFullAccess
                            ? 'border-green-500/50 bg-green-500/5'
                            : accessibleDevices.length > 0
                            ? 'border-yellow-500/50 bg-yellow-500/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{room}</div>
                            <div className="text-xs text-muted-foreground">
                              {accessibleDevices.length}/{roomDevices.length} devices
                            </div>
                          </div>
                          {hasFullAccess ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : accessibleDevices.length > 0 ? (
                            <div className="w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            </div>
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground/30" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center py-12 text-center">
              <div>
                <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Select a User</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a user from the list to manage their device access
                </p>
              </div>
            </div>
          )}
        </div>

        {hasPendingChanges && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-white font-bold">!</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Unsaved Changes</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You have unsaved changes for {selectedUser?.username}. Click "Save Changes" to apply them.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
