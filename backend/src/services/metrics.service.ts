import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a custom registry
export const register = new Registry();

// Add default labels
register.setDefaultLabels({
  app: 'home-control',
});

// HTTP request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Authentication metrics
export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['success', 'mode'],
  registers: [register],
});

export const activeSessions = new Gauge({
  name: 'active_sessions',
  help: 'Number of active user sessions',
  labelNames: ['mode'],
  registers: [register],
});

// Device command metrics
export const deviceCommands = new Counter({
  name: 'device_commands_total',
  help: 'Total number of device commands executed',
  labelNames: ['device_id', 'capability', 'command', 'success', 'mode'],
  registers: [register],
});

export const deviceCommandDuration = new Histogram({
  name: 'device_command_duration_seconds',
  help: 'Duration of device command execution in seconds',
  labelNames: ['device_id', 'capability', 'mode'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// SmartThings API metrics
export const smartthingsApiCalls = new Counter({
  name: 'smartthings_api_calls_total',
  help: 'Total number of SmartThings API calls',
  labelNames: ['endpoint', 'success', 'mode'],
  registers: [register],
});

export const smartthingsApiDuration = new Histogram({
  name: 'smartthings_api_duration_seconds',
  help: 'Duration of SmartThings API calls in seconds',
  labelNames: ['endpoint', 'mode'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// User activity metrics
export const userActions = new Counter({
  name: 'user_actions_total',
  help: 'Total number of user actions',
  labelNames: ['user', 'action'],
  registers: [register],
});

// System metrics (updated periodically)
export const connectedDevices = new Gauge({
  name: 'connected_devices',
  help: 'Number of connected smart home devices',
  labelNames: ['mode'],
  registers: [register],
});

// Error metrics
export const errors = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type'],
  registers: [register],
});
