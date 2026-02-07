import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
function initSchema(): void {
  logger.info('Initializing database schema...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      first_login INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Access control list
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_control (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resource_type TEXT NOT NULL CHECK(resource_type IN ('device', 'room')),
      resource_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, resource_type, resource_id)
    )
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `);

  // Audit logs table (for queryable audit data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      device_id TEXT,
      device_name TEXT,
      command TEXT,
      success INTEGER NOT NULL,
      ip TEXT,
      details TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Device history table (for analytics)
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_history (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      device_id TEXT NOT NULL,
      device_label TEXT NOT NULL,
      room TEXT,
      capability TEXT NOT NULL,
      attribute TEXT NOT NULL,
      value TEXT NOT NULL,
      previous_value TEXT,
      triggered_by TEXT
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_acl_user_id ON access_control(user_id);
    CREATE INDEX IF NOT EXISTS idx_acl_resource ON access_control(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_device_id ON audit_logs(device_id);
    CREATE INDEX IF NOT EXISTS idx_device_history_timestamp ON device_history(timestamp);
    CREATE INDEX IF NOT EXISTS idx_device_history_device_id ON device_history(device_id);
    CREATE INDEX IF NOT EXISTS idx_device_history_capability ON device_history(capability);
  `);

  // Insert default settings
  const settingsStmt = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `);

  settingsStmt.run('session_timeout_minutes', '30');
  settingsStmt.run('audit_log_retention_days', '90');

  logger.info('✓ Database schema initialized');
}

// Initialize on import
initSchema();

export { db };
