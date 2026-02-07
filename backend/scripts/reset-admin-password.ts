#!/usr/bin/env tsx
/**
 * Reset Admin Password Script
 * 
 * This script deletes the admin user and their password file,
 * forcing the system to regenerate a new admin user with a new password
 * on the next server startup.
 * 
 * Usage:
 *   npm run reset-admin-password
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(__dirname, '../../data/app.sqlite');
const passwordFile = path.join(__dirname, '../../data/initial-password.txt');

console.log('\n' + '='.repeat(60));
console.log('  RESETTING ADMIN PASSWORD');
console.log('='.repeat(60) + '\n');

try {
  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database not found. Nothing to reset.');
    console.log(`   Expected location: ${dbPath}\n`);
    process.exit(1);
  }

  // Open database
  const db = new Database(dbPath);
  
  // Delete admin user
  const result = db.prepare("DELETE FROM users WHERE role = 'admin'").run();
  
  if (result.changes > 0) {
    console.log(`✅ Deleted ${result.changes} admin user(s) from database`);
  } else {
    console.log('⚠️  No admin user found in database');
  }
  
  // Close database
  db.close();
  
  // Delete password file if it exists
  if (fs.existsSync(passwordFile)) {
    fs.unlinkSync(passwordFile);
    console.log('✅ Deleted initial-password.txt file');
  } else {
    console.log('⚠️  Password file not found (already deleted or never created)');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('  RESET COMPLETE');
  console.log('='.repeat(60));
  console.log('\n  Next steps:');
  console.log('  1. Restart the backend server');
  console.log('  2. Check data/initial-password.txt for new password');
  console.log('  3. Login with username: admin');
  console.log('  4. Change password on first login\n');
  console.log('='.repeat(60) + '\n');
  
} catch (error) {
  console.error('\n❌ Error resetting admin password:', error);
  process.exit(1);
}
