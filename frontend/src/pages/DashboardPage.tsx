import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';
import { deviceAPI, sceneAPI } from '@/lib/api';
import { useWebSocketConnection, useDeviceUpdates } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { SceneCard } from '@/components/SceneCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { 
  Home, LogOut, Settings, Lightbulb, Power, Wifi, WifiOff, Grid, Play, BarChart3,
  Thermometer, Video, DoorOpen, Refrigerator, Fan, Lock, Droplet, Zap, Gauge
} from 'lucide-react';

const ROOM_ORDER_KEY = 'homecontrol_room_tab_order';

// Get appropriate icon based on device type and capabilities
const getDeviceIcon = (device: any, isOn: boolean) => {
  const label = (device.label || device.name || '').toLowerCase();
  const capabilities = device.components?.main?.capabilities || [];
  const hasCapability = (capId: string) => capabilities.some((c: any) => c.id === capId);
  
  const iconClass = `w-5 h-5 ${isOn ? 'text-yellow-500' : 'text-gray-400'}`;
  
  // Thermostat
  if (hasCapability('thermostatMode') || hasCapability('thermostatCoolingSetpoint') || label.includes('thermostat')) {
    return <Thermometer className={iconClass} />;
  }
  
  // Camera or Doorbell
  if (label.includes('camera') || label.includes('doorbell') || label.includes('cam')) {
    return <Video className={iconClass} />;
  }
  
  // Lock
  if (hasCapability('lock') || label.includes('lock')) {
    return <Lock className={iconClass} />;
  }
  
  // Refrigerator
  if (label.includes('fridge') || label.includes('refrigerator') || label.includes('freezer')) {
    return <Refrigerator className={iconClass} />;
  }
  
  // Fan
  if (label.includes('fan') || hasCapability('fanSpeed')) {
    return <Fan className={iconClass} />;
  }
  
  // Moisture/Leak Sensor
  if (hasCapability('waterSensor') || label.includes('leak') || label.includes('water')) {
    return <Droplet className={iconClass} />;
  }
  
  // Energy/Power Monitor
  if (hasCapability('powerMeter') || hasCapability('energyMeter') || label.includes('energy')) {
    return <Zap className={iconClass} />;
  }
  
  // Door Sensor
  if (hasCapability('contactSensor') || label.includes('door') || label.includes('contact')) {
    return <DoorOpen className={iconClass} />;
  }
  
  // Temperature Sensor
  if (hasCapability('temperatureMeasurement') && !hasCapability('switch')) {
    return <Gauge className={iconClass} />;
  }
  
  // Default: Light bulb for switches
  return <Lightbulb className={iconClass} />;
};

// Device Card Component
const DeviceCard = ({ device, showRoomName, onCommand, executingCommands }: any) => {
  const switchStatus = device.components?.main?.switch?.switch?.value || device.status?.switch?.value;
  const isOn = switchStatus === 'on';
  
  // Get temperature for thermostats
  const temperature = device.components?.main?.temperatureMeasurement?.temperature?.value;
  const tempUnit = device.components?.main?.temperatureMeasurement?.temperature?.unit || 'F';
  
  // Check if device is dimmable (has switchLevel capability)
  const hasSwitchLevel = device.components?.main?.capabilities?.some((c: any) => c.id === 'switchLevel');
  const currentLevel = device.components?.main?.switchLevel?.level?.value || 0;
  const [localLevel, setLocalLevel] = useState(currentLevel);
  const [manualInput, setManualInput] = useState(currentLevel.toString());
  
  // Update local state when device level changes
  useEffect(() => {
    setLocalLevel(currentLevel);
    setManualInput(currentLevel.toString());
  }, [currentLevel]);
  
  const handleLevelChange = (newLevel: number) => {
    setLocalLevel(newLevel);
    onCommand(device.deviceId, 'switchLevel', 'setLevel', [newLevel]);
  };
  
  const handleManualInput = (value: string) => {
    // Only allow numbers
    const filtered = value.replace(/[^0-9]/g, '');
    setManualInput(filtered);
    
    if (filtered !== '') {
      const numValue = parseInt(filtered, 10);
      if (numValue >= 0 && numValue <= 100) {
        setLocalLevel(numValue);
      }
    }
  };
  
  const handleManualSubmit = () => {
    const numValue = parseInt(manualInput, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onCommand(device.deviceId, 'switchLevel', 'setLevel', [numValue]);
    } else {
      // Reset to current level if invalid
      setManualInput(currentLevel.toString());
    }
  };
  
  return (
    <Card key={device.deviceId} className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {getDeviceIcon(device, isOn)}
          {showRoomName && device.room ? `${device.room} - ${device.label || device.name}` : device.label || device.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Thermostat display */}
        {device.components?.main?.capabilities?.some((c: any) => c.id === 'thermostatMode') && temperature && (
          <div className="text-center py-4">
            <div className="text-3xl font-bold">{Math.round(temperature)}°{tempUnit}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {device.components?.main?.thermostatMode?.thermostatMode?.value || 'off'}
            </p>
          </div>
        )}
        
        {/* Switch capability */}
        {(device.components?.main?.capabilities?.some((c: any) => c.id === 'switch') || 
          device.capabilities?.includes('switch')) && (
          <>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <Power className={`w-5 h-5 ${isOn ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">
                  {device.deviceTypeName || 'Smart Device'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${
                  isOn ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {isOn ? 'ON' : 'OFF'}
                </span>
                <Switch
                  checked={isOn}
                  disabled={executingCommands.has(`${device.deviceId}-switch`)}
                  onCheckedChange={(checked) => {
                    const newCommand = checked ? 'on' : 'off';
                    onCommand(device.deviceId, 'switch', newCommand);
                  }}
                />
              </div>
            </div>
            
            {/* Dimmer control for dimmable lights */}
            {hasSwitchLevel && (
              <div className="space-y-3 mt-4 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Brightness</span>
                  <span className="text-sm font-medium">{localLevel}%</span>
                </div>
                
                {/* Slider control */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localLevel}
                  onChange={(e) => setLocalLevel(parseInt(e.target.value, 10))}
                  onMouseUp={() => handleLevelChange(localLevel)}
                  onTouchEnd={() => handleLevelChange(localLevel)}
                  disabled={executingCommands.has(`${device.deviceId}-switchLevel`)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${localLevel}%, #e5e7eb ${localLevel}%, #e5e7eb 100%)`
                  }}
                />
                
                {/* Manual numeric input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={manualInput}
                    onChange={(e) => handleManualInput(e.target.value)}
                    onBlur={handleManualSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleManualSubmit();
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={executingCommands.has(`${device.deviceId}-switchLevel`)}
                    className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="0-100"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={executingCommands.has(`${device.deviceId}-switchLevel`)}
                    className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Set
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Read-only devices (sensors, etc.) */}
        {!(device.components?.main?.capabilities?.some((c: any) => c.id === 'switch') || 
          device.capabilities?.includes('switch') ||
          device.components?.main?.capabilities?.some((c: any) => c.id === 'thermostatMode')) && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              {device.deviceTypeName || 'Sensor'}
            </p>
            {temperature && (
              <p className="text-lg font-semibold mt-2">{Math.round(temperature)}°{tempUnit}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Read-only device
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const { user, logout, isDemoMode } = useAuthStore();
  const navigate = useNavigate();
  const isWsConnected = useWebSocketConnection();
  const queryClient = useQueryClient();
  const [executingCommands, setExecutingCommands] = useState<Set<string>>(new Set());
  const [customRoomOrder, setCustomRoomOrder] = useState<string[] | null>(null);
  
  const { data: devicesData, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: deviceAPI.getDevices,
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: deviceAPI.getRooms,
  });

  const { data: scenesData } = useQuery({
    queryKey: ['scenes'],
    queryFn: sceneAPI.getScenes,
  });

  // Group devices by room
  const devicesByRoom = useMemo(() => {
    if (!devicesData?.devices) return {};
    
    const grouped: Record<string, any[]> = {};
    
    devicesData.devices.forEach((device: any) => {
      const roomName = device.room || 'Unassigned';
      if (!grouped[roomName]) {
        grouped[roomName] = [];
      }
      grouped[roomName].push(device);
    });
    
    return grouped;
  }, [devicesData]);

  // Get sorted room names
  const roomNames = useMemo(() => {
    const rooms = Object.keys(devicesByRoom);
    
    // Try to use custom order from localStorage
    if (customRoomOrder && customRoomOrder.length > 0) {
      // Filter to only include rooms that still exist
      const orderedRooms = customRoomOrder.filter(r => rooms.includes(r));
      // Add any new rooms that aren't in the saved order
      const newRooms = rooms.filter(r => !customRoomOrder.includes(r)).sort();
      return [...orderedRooms, ...newRooms];
    }
    
    // Default: alphabetical order
    return rooms.sort();
  }, [devicesByRoom, customRoomOrder]);

  // Load custom room order on mount
  useEffect(() => {
    const loadRoomOrder = () => {
      const savedOrder = localStorage.getItem(ROOM_ORDER_KEY);
      if (savedOrder) {
        try {
          setCustomRoomOrder(JSON.parse(savedOrder));
        } catch (e) {
          console.error('Failed to parse room order:', e);
        }
      }
    };

    loadRoomOrder();

    // Listen for room order changes from admin panel
    const handleRoomOrderChange = () => {
      loadRoomOrder();
    };

    window.addEventListener('roomOrderChanged', handleRoomOrderChange);
    return () => window.removeEventListener('roomOrderChanged', handleRoomOrderChange);
  }, []);

  // Listen for WebSocket device updates
  const handleDeviceUpdate = useCallback((deviceId: string, status: any) => {
    console.log('[Dashboard] WebSocket device update:', deviceId, status);
    
    // Directly update the cache with new device status
    queryClient.setQueryData(['devices'], (oldData: any) => {
      if (!oldData?.devices) return oldData;
      
      return {
        ...oldData,
        devices: oldData.devices.map((device: any) => {
          if (device.deviceId === deviceId) {
            // Update the device status based on the structure
            if (device.components?.main?.switch) {
              return {
                ...device,
                components: {
                  ...device.components,
                  main: {
                    ...device.components.main,
                    switch: {
                      ...device.components.main.switch,
                      switch: status.switch || device.components.main.switch.switch,
                    },
                  },
                },
              };
            } else if (device.status) {
              return {
                ...device,
                status: {
                  ...device.status,
                  ...status,
                },
              };
            }
          }
          return device;
        }),
      };
    });
  }, [queryClient]);
  
  useDeviceUpdates(handleDeviceUpdate);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCommand = async (deviceId: string, capability: string, command: string, args: any[] = []) => {
    const commandKey = `${deviceId}-${capability}`;
    
    try {
      console.log('[Dashboard] Executing command:', { deviceId, capability, command, args });
      
      // Mark command as executing
      setExecutingCommands(prev => new Set(prev).add(commandKey));
      
      // Optimistic update - immediately update UI before server responds
      queryClient.setQueryData(['devices'], (oldData: any) => {
        if (!oldData?.devices) return oldData;
        
        return {
          ...oldData,
          devices: oldData.devices.map((device: any) => {
            if (device.deviceId === deviceId && capability === 'switch') {
              const newValue = { value: command };
              
              // Create updated device with all possible structures
              const updatedDevice = { ...device };
              
              // Update components.main.switch.switch if it exists
              if (device.components?.main?.switch?.switch) {
                updatedDevice.components = {
                  ...device.components,
                  main: {
                    ...device.components.main,
                    switch: {
                      ...device.components.main.switch,
                      switch: newValue,
                    },
                  },
                };
              }
              
              // Update status.switch if it exists
              if (device.status?.switch) {
                updatedDevice.status = {
                  ...device.status,
                  switch: newValue,
                };
              }
              
              return updatedDevice;
            }
            return device;
          }),
        };
      });
      
      // Execute the command
      const result = await deviceAPI.executeCommand(deviceId, capability, command, args);
      console.log('[Dashboard] Command result:', result);
      
      // After command succeeds, refetch to get the updated state
      // In demo mode, this will get the updated demoDeviceStates
      // In real mode, WebSocket will handle updates, but we refetch as backup
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
      
    } catch (error) {
      console.error('Failed to execute command:', error);
      // Revert optimistic update on error by refetching
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    } finally {
      // Remove from executing commands
      setExecutingCommands(prev => {
        const next = new Set(prev);
        next.delete(commandKey);
        return next;
      });
    }
  };

  const handleSceneExecute = async (sceneId: string) => {
    try {
      console.log('[Dashboard] Executing scene:', sceneId);
      await sceneAPI.executeScene(sceneId);
      console.log('[Dashboard] Scene executed successfully');
    } catch (error) {
      console.error('Failed to execute scene:', error);
      throw error; // Re-throw so SceneCard can show error
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-yellow-500 text-yellow-950 px-4 py-2 text-center text-sm font-medium">
          🎭 Demo Mode Active - Using test devices (no real SmartThings connection)
        </div>
      )}{/* WebSocket Connection Indicator */}
            <div className="flex items-center gap-2">
              {isWsConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-600 hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 hidden sm:inline">Offline</span>
                </>
              )}
            </div>
            
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Home Control</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.username} {user?.role === 'admin' && '(Admin)'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/analytics')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            {(user?.role === 'admin' || isDemoMode) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Your Devices</h2>
          <p className="text-muted-foreground">
            Control and monitor your smart home devices
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : devicesData?.devices?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No devices found</h3>
              <p className="text-sm text-muted-foreground">
                {user?.role === 'admin'
                  ? 'No devices are connected to your SmartThings account.'
                  : 'You don\'t have access to any devices yet. Contact your admin.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={roomNames[0] || 'all'} className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="scenes">
                <Play className="w-4 h-4 mr-2" />
                Scenes ({scenesData?.scenes?.length || 0})
              </TabsTrigger>
              {roomNames.map((roomName) => (
                <TabsTrigger key={roomName} value={roomName}>
                  {roomName} ({devicesByRoom[roomName].length})
                </TabsTrigger>
              ))}
              <TabsTrigger value="all">
                <Grid className="w-4 h-4 mr-2" />
                All Devices ({devicesData?.devices?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Scenes tab */}
            <TabsContent value="scenes">
              <div className="mb-4">
                <h3 className="text-xl font-semibold">Scenes</h3>
                <p className="text-sm text-muted-foreground">
                  {scenesData?.scenes?.length || 0} {scenesData?.scenes?.length === 1 ? 'scene' : 'scenes'} available
                </p>
              </div>
              {scenesData?.scenes?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {scenesData.scenes.map((scene: any) => (
                    <SceneCard key={scene.sceneId} scene={scene} onExecute={handleSceneExecute} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No scenes found</h3>
                    <p className="text-sm text-muted-foreground">
                      Create scenes in the SmartThings app to control multiple devices at once.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Room tabs */}
            {roomNames.map((roomName) => (
              <TabsContent key={roomName} value={roomName}>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold">{roomName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {devicesByRoom[roomName].length} {devicesByRoom[roomName].length === 1 ? 'device' : 'devices'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {devicesByRoom[roomName].map((device: any) => (
                    <DeviceCard
                      key={device.deviceId}
                      device={device}
                      showRoomName={false}
                      onCommand={handleCommand}
                      executingCommands={executingCommands}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}

            {/* All devices tab */}
            <TabsContent value="all">
              <div className="mb-4">
                <h3 className="text-xl font-semibold">All Devices</h3>
                <p className="text-sm text-muted-foreground">
                  {devicesData?.devices?.length || 0} total {devicesData?.devices?.length === 1 ? 'device' : 'devices'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {devicesData?.devices?.map((device: any) => (
                  <DeviceCard
                    key={device.deviceId}
                    device={device}
                    showRoomName={true}
                    onCommand={handleCommand}
                    executingCommands={executingCommands}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
