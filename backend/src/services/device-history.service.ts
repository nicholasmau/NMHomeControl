import { db } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface DeviceHistoryEntry {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceLabel: string;
  room?: string;
  capability: string;
  attribute: string;
  value: string;
  previousValue?: string;
  triggeredBy?: string;
}

export interface DeviceUsageStats {
  deviceId: string;
  deviceLabel: string;
  room?: string;
  totalChanges: number;
  lastChanged?: string;
  mostCommonValue?: string;
  averageChangesPerDay: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: string;
  deviceId: string;
  deviceLabel: string;
}

export class DeviceHistoryService {
  /**
   * Record a device state change
   */
  recordStateChange(params: {
    deviceId: string;
    deviceLabel: string;
    room?: string;
    capability: string;
    attribute: string;
    value: string;
    previousValue?: string;
    triggeredBy?: string;
  }): void {
    try {
      const stmt = db.prepare(`
        INSERT INTO device_history (
          id, timestamp, device_id, device_label, room,
          capability, attribute, value, previous_value, triggered_by
        )
        VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        uuidv4(),
        params.deviceId,
        params.deviceLabel,
        params.room || null,
        params.capability,
        params.attribute,
        params.value,
        params.previousValue || null,
        params.triggeredBy || null
      );
    } catch (error) {
      logger.error('Failed to record device state change:', error);
    }
  }

  /**
   * Get device history for a specific device
   */
  getDeviceHistory(params: {
    deviceId: string;
    startDate?: string;
    endDate?: string;
    capability?: string;
    limit?: number;
  }): DeviceHistoryEntry[] {
    let query = `
      SELECT * FROM device_history
      WHERE device_id = ?
    `;
    const queryParams: any[] = [params.deviceId];

    if (params.startDate) {
      query += ` AND timestamp >= ?`;
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      query += ` AND timestamp <= ?`;
      queryParams.push(params.endDate);
    }

    if (params.capability) {
      query += ` AND capability = ?`;
      queryParams.push(params.capability);
    }

    query += ` ORDER BY timestamp DESC`;

    if (params.limit) {
      query += ` LIMIT ?`;
      queryParams.push(params.limit);
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams) as any[];

    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      deviceId: row.device_id,
      deviceLabel: row.device_label,
      room: row.room,
      capability: row.capability,
      attribute: row.attribute,
      value: row.value,
      previousValue: row.previous_value,
      triggeredBy: row.triggered_by,
    }));
  }

  /**
   * Get time series data for charts
   */
  getTimeSeriesData(params: {
    deviceIds?: string[];
    startDate?: string;
    endDate?: string;
    capability?: string;
    attribute?: string;
  }): TimeSeriesDataPoint[] {
    let query = `
      SELECT timestamp, value, device_id, device_label
      FROM device_history
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    if (params.deviceIds && params.deviceIds.length > 0) {
      const placeholders = params.deviceIds.map(() => '?').join(',');
      query += ` AND device_id IN (${placeholders})`;
      queryParams.push(...params.deviceIds);
    }

    if (params.startDate) {
      query += ` AND timestamp >= ?`;
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      query += ` AND timestamp <= ?`;
      queryParams.push(params.endDate);
    }

    if (params.capability) {
      query += ` AND capability = ?`;
      queryParams.push(params.capability);
    }

    if (params.attribute) {
      query += ` AND attribute = ?`;
      queryParams.push(params.attribute);
    }

    query += ` ORDER BY timestamp ASC`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams) as any[];

    return rows.map(row => ({
      timestamp: row.timestamp,
      value: row.value,
      deviceId: row.device_id,
      deviceLabel: row.device_label,
    }));
  }

  /**
   * Get usage statistics for devices
   */
  getDeviceUsageStats(params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): DeviceUsageStats[] {
    let query = `
      SELECT 
        device_id,
        device_label,
        room,
        COUNT(*) as total_changes,
        MAX(timestamp) as last_changed,
        (
          SELECT value 
          FROM device_history dh2 
          WHERE dh2.device_id = dh1.device_id 
          GROUP BY value 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) as most_common_value
      FROM device_history dh1
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    if (params.startDate) {
      query += ` AND timestamp >= ?`;
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      query += ` AND timestamp <= ?`;
      queryParams.push(params.endDate);
    }

    query += ` GROUP BY device_id, device_label, room`;
    query += ` ORDER BY total_changes DESC`;

    if (params.limit) {
      query += ` LIMIT ?`;
      queryParams.push(params.limit);
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams) as any[];

    // Calculate date range for average
    const dateRangeQuery = db.prepare(`
      SELECT 
        julianday(MAX(timestamp)) - julianday(MIN(timestamp)) as days
      FROM device_history
      WHERE device_id = ?
      ${params.startDate ? 'AND timestamp >= ?' : ''}
      ${params.endDate ? 'AND timestamp <= ?' : ''}
    `);

    return rows.map(row => {
      const dateParams = [row.device_id];
      if (params.startDate) dateParams.push(params.startDate);
      if (params.endDate) dateParams.push(params.endDate);
      
      const dateRange = dateRangeQuery.get(...dateParams) as any;
      const days = Math.max(dateRange?.days || 1, 1);
      
      return {
        deviceId: row.device_id,
        deviceLabel: row.device_label,
        room: row.room,
        totalChanges: row.total_changes,
        lastChanged: row.last_changed,
        mostCommonValue: row.most_common_value,
        averageChangesPerDay: parseFloat((row.total_changes / days).toFixed(2)),
      };
    });
  }

  /**
   * Get aggregated data by hour for charts
   */
  getHourlyAggregation(params: {
    deviceId: string;
    startDate?: string;
    endDate?: string;
  }): { hour: string; count: number }[] {
    let query = `
      SELECT 
        strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
        COUNT(*) as count
      FROM device_history
      WHERE device_id = ?
    `;
    const queryParams: any[] = [params.deviceId];

    if (params.startDate) {
      query += ` AND timestamp >= ?`;
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      query += ` AND timestamp <= ?`;
      queryParams.push(params.endDate);
    }

    query += ` GROUP BY hour ORDER BY hour ASC`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams) as any[];

    return rows.map(row => ({
      hour: row.hour,
      count: row.count,
    }));
  }

  /**
   * Clean up old history records
   */
  cleanupOldRecords(daysToKeep: number = 90): number {
    const stmt = db.prepare(`
      DELETE FROM device_history
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(daysToKeep);
    logger.info(`Cleaned up ${result.changes} old device history records`);
    return result.changes;
  }
}

export const deviceHistoryService = new DeviceHistoryService();
