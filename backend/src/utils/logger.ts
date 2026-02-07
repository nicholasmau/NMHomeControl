import pino from 'pino';
import { config } from '../config/env';
import * as fs from 'fs';
import * as path from 'path';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Application logger
export const logger = pino({
  level: config.logging.level,
  transport: config.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Audit logger - logs user actions
export const auditLogger = pino({
  level: 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}, pino.destination({
  dest: path.join(logsDir, 'audit.log'),
  sync: false,
}));

// Telemetry logger - logs device metrics
export const telemetryLogger = pino({
  level: 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}, pino.destination({
  dest: path.join(logsDir, 'telemetry.log'),
  sync: false,
}));

// Audit log helper
export interface AuditLogEntry {
  action: string;
  user: string;
  deviceId?: string;
  deviceName?: string;
  command?: string;
  success: boolean;
  ip?: string;
  details?: Record<string, unknown>;
}

export function logAudit(entry: AuditLogEntry): void {
  auditLogger.info(entry);
}

// Telemetry helper
export interface TelemetryEntry {
  metric: string;
  deviceId?: string;
  capability?: string;
  oldValue?: unknown;
  newValue?: unknown;
  responseTime?: number;
  success?: boolean;
}

export function logTelemetry(entry: TelemetryEntry): void {
  telemetryLogger.info(entry);
}
