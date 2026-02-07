// Demo data for testing without SmartThings API
export const DEMO_ROOMS = [
  { roomId: 'living-room', name: 'Living Room' },
  { roomId: 'kitchen', name: 'Kitchen' },
  { roomId: 'master-bedroom', name: 'Master Bedroom' },
  { roomId: 'front-porch', name: 'Front Porch' },
];

export const DEMO_SCENES = [
  {
    sceneId: 'good-morning',
    sceneName: 'Good Morning',
    sceneIcon: 'sunrise',
    sceneColor: 'amber',
    locationId: 'demo-location',
    createdBy: 'demo-user',
    createdDate: '2024-01-01T00:00:00.000Z',
    lastUpdatedDate: '2024-01-01T00:00:00.000Z',
    actions: [
      { deviceId: 'living-room-lights', deviceLabel: 'Living room lights switch', capability: 'switch', command: 'on' },
      { deviceId: 'kitchen-lights', deviceLabel: 'Kitchen light switch', capability: 'switch', command: 'on' },
      { deviceId: 'master-bedroom-lights', deviceLabel: 'Master bedroom lights switch', capability: 'switch', command: 'on' },
    ],
  },
  {
    sceneId: 'good-night',
    sceneName: 'Good Night',
    sceneIcon: 'moon',
    sceneColor: 'indigo',
    locationId: 'demo-location',
    createdBy: 'demo-user',
    createdDate: '2024-01-01T00:00:00.000Z',
    lastUpdatedDate: '2024-01-01T00:00:00.000Z',
    actions: [
      { deviceId: 'living-room-lights', deviceLabel: 'Living room lights switch', capability: 'switch', command: 'off' },
      { deviceId: 'kitchen-lights', deviceLabel: 'Kitchen light switch', capability: 'switch', command: 'off' },
      { deviceId: 'front-porch-lights', deviceLabel: 'Front porch lights switch', capability: 'switch', command: 'off' },
      { deviceId: 'master-bedroom-lights', deviceLabel: 'Master bedroom lights switch', capability: 'switch', command: 'off' },
    ],
  },
  {
    sceneId: 'movie-time',
    sceneName: 'Movie Time',
    sceneIcon: 'tv',
    sceneColor: 'purple',
    locationId: 'demo-location',
    createdBy: 'demo-user',
    createdDate: '2024-01-01T00:00:00.000Z',
    lastUpdatedDate: '2024-01-01T00:00:00.000Z',
    actions: [
      { deviceId: 'living-room-lights', deviceLabel: 'Living room lights switch', capability: 'switch', command: 'off' },
      { deviceId: 'kitchen-lights', deviceLabel: 'Kitchen light switch', capability: 'switch', command: 'off' },
    ],
  },
  {
    sceneId: 'away-mode',
    sceneName: 'Away Mode',
    sceneIcon: 'lock',
    sceneColor: 'red',
    locationId: 'demo-location',
    createdBy: 'demo-user',
    createdDate: '2024-01-01T00:00:00.000Z',
    lastUpdatedDate: '2024-01-01T00:00:00.000Z',
    actions: [
      { deviceId: 'living-room-lights', deviceLabel: 'Living room lights switch', capability: 'switch', command: 'off' },
      { deviceId: 'kitchen-lights', deviceLabel: 'Kitchen light switch', capability: 'switch', command: 'off' },
      { deviceId: 'front-porch-lights', deviceLabel: 'Front porch lights switch', capability: 'switch', command: 'on' },
      { deviceId: 'master-bedroom-lights', deviceLabel: 'Master bedroom lights switch', capability: 'switch', command: 'off' },
    ],
  },
  {
    sceneId: 'welcome-home',
    sceneName: 'Welcome Home',
    sceneIcon: 'home',
    sceneColor: 'green',
    locationId: 'demo-location',
    createdBy: 'demo-user',
    createdDate: '2024-01-01T00:00:00.000Z',
    lastUpdatedDate: '2024-01-01T00:00:00.000Z',
    actions: [
      { deviceId: 'living-room-lights', deviceLabel: 'Living room lights switch', capability: 'switch', command: 'on' },
      { deviceId: 'kitchen-lights', deviceLabel: 'Kitchen light switch', capability: 'switch', command: 'on' },
      { deviceId: 'front-porch-lights', deviceLabel: 'Front porch lights switch', capability: 'switch', command: 'on' },
    ],
  },
];


export const DEMO_DEVICES = [
  // Living Room
  {
    deviceId: 'living-room-lights',
    label: 'Living room lights switch',
    name: 'Living room lights switch',
    type: 'switch',
    room: 'Living Room',
    roomId: 'living-room',
    capabilities: ['switch'],
    status: {
      switch: { value: 'off' },
    },
  },
  {
    deviceId: 'living-room-thermometer',
    label: 'Thermometer',
    name: 'Thermometer',
    type: 'temperatureMeasurement',
    room: 'Living Room',
    roomId: 'living-room',
    capabilities: ['temperatureMeasurement'],
    status: {
      temperature: { value: 72, unit: 'F' },
    },
  },
  // Kitchen
  {
    deviceId: 'kitchen-lights',
    label: 'Kitchen light switch',
    name: 'Kitchen light switch',
    type: 'switch',
    room: 'Kitchen',
    roomId: 'kitchen',
    capabilities: ['switch'],
    status: {
      switch: { value: 'off' },
    },
  },
  {
    deviceId: 'kitchen-refrigerator',
    label: 'Refrigerator',
    name: 'Refrigerator',
    type: 'powerMeter',
    room: 'Kitchen',
    roomId: 'kitchen',
    capabilities: ['powerMeter', 'switch'],
    status: {
      switch: { value: 'on' },
      power: { value: 120, unit: 'W' },
    },
  },
  // Master Bedroom
  {
    deviceId: 'master-bedroom-lights',
    label: 'Light switch',
    name: 'Light switch',
    type: 'switch',
    room: 'Master Bedroom',
    roomId: 'master-bedroom',
    capabilities: ['switch'],
    status: {
      switch: { value: 'off' },
    },
  },
  // Front Porch
  {
    deviceId: 'front-porch-lights',
    label: 'Front door light switch',
    name: 'Front door light switch',
    type: 'switch',
    room: 'Front Porch',
    roomId: 'front-porch',
    capabilities: ['switch'],
    status: {
      switch: { value: 'off' },
    },
  },
  {
    deviceId: 'front-porch-doorbell',
    label: 'Doorbell',
    name: 'Doorbell',
    type: 'button',
    room: 'Front Porch',
    roomId: 'front-porch',
    capabilities: ['button', 'battery'],
    status: {
      button: { value: 'pushed' },
      battery: { value: 85, unit: '%' },
    },
  },
];

// In-memory state for demo devices (persists during session)
let demoDeviceStates: { [key: string]: any } = {};

// Initialize demo device states
DEMO_DEVICES.forEach((device) => {
  demoDeviceStates[device.deviceId] = { ...device.status };
});

export const getDemoDevices = () => {
  return DEMO_DEVICES.map((device) => ({
    ...device,
    status: demoDeviceStates[device.deviceId] || device.status,
  }));
};

export const getDemoDevice = (deviceId: string) => {
  const device = DEMO_DEVICES.find((d) => d.deviceId === deviceId);
  if (!device) return null;
  return {
    ...device,
    status: demoDeviceStates[deviceId] || device.status,
  };
};

export const getDemoDeviceStatus = (deviceId: string) => {
  return demoDeviceStates[deviceId] || DEMO_DEVICES.find((d) => d.deviceId === deviceId)?.status;
};

export const executeDemoCommand = (
  deviceId: string,
  capability: string,
  command: string,
  args: any[] = []
) => {
  const device = DEMO_DEVICES.find((d) => d.deviceId === deviceId);
  if (!device) {
    throw new Error('Device not found');
  }

  if (!device.capabilities.includes(capability)) {
    throw new Error(`Device does not support capability: ${capability}`);
  }

  // Initialize device state if not exists
  if (!demoDeviceStates[deviceId]) {
    demoDeviceStates[deviceId] = { ...device.status };
  }

  // Handle switch commands
  if (capability === 'switch') {
    if (command === 'on') {
      demoDeviceStates[deviceId].switch = { value: 'on' };
    } else if (command === 'off') {
      demoDeviceStates[deviceId].switch = { value: 'off' };
    }
  }

  // Handle thermostat commands (if we add thermostats later)
  if (capability === 'thermostatMode' && command === 'setThermostatMode') {
    demoDeviceStates[deviceId].thermostatMode = { value: args[0] };
  }

  if (capability === 'thermostatCoolingSetpoint' && command === 'setCoolingSetpoint') {
    demoDeviceStates[deviceId].thermostatCoolingSetpoint = { value: args[0], unit: 'F' };
  }

  if (capability === 'thermostatHeatingSetpoint' && command === 'setHeatingSetpoint') {
    demoDeviceStates[deviceId].thermostatHeatingSetpoint = { value: args[0], unit: 'F' };
  }

  return {
    success: true,
    message: `Command executed: ${command}`,
    status: demoDeviceStates[deviceId],
  };
};

export const getDemoRooms = () => {
  return DEMO_ROOMS;
};

export const getDemoScenes = () => {
  return DEMO_SCENES;
};

export const executeDemoScene = (sceneId: string) => {
  // In demo mode, we just simulate successful execution
  console.log(`[Demo Mode] Executing scene: ${sceneId}`);
  return Promise.resolve();
};

export const resetDemoDeviceStates = () => {
  DEMO_DEVICES.forEach((device) => {
    demoDeviceStates[device.deviceId] = { ...device.status };
  });
};
