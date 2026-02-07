#!/usr/bin/env node

/**
 * First-time Setup Script
 * Initializes the application with secure defaults
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_DIR = path.join(__dirname, '..', 'config');
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const INITIAL_PASSWORD_FILE = path.join(__dirname, '..', 'initial-password.txt');

function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const specialChars = '!@#$%^&*-_=+';
  let password = 'HomeCtrl-';
  
  for (let i = 0; i < length - 9; i++) {
    if (i > 0 && i % 4 === 0) {
      password += '-';
    } else {
        const useSpecial = crypto.randomInt(0, 10) > 7;
        const chars = useSpecial ? specialChars : charset;
        password += chars.charAt(crypto.randomInt(0, chars.length));
}

function generateSessionSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function main() {
  console.log('='.repeat(60));
  console.log('  Home Control - First-Time Setup');
  console.log('='.repeat(60));
  console.log();

  // Create necessary directories
  const directories = [DATA_DIR, CONFIG_DIR, LOGS_DIR];
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${path.basename(dir)}/`);
    }
  });

  console.log();

  // Generate initial admin password
  const initialPassword = generateSecurePassword();
  fs.writeFileSync(INITIAL_PASSWORD_FILE, initialPassword, { mode: 0o600 });
  
  console.log('='.repeat(60));
  console.log('  IMPORTANT: Initial Admin Password');
  console.log('='.repeat(60));
  console.log();
  console.log('  Your initial admin password is:');
  console.log();
  console.log(`    ${initialPassword}`);
  console.log();
  console.log('  This password has been saved to: initial-password.txt');
  console.log();
  console.log('  ⚠️  SECURITY NOTES:');
  console.log('  - You will be forced to change this password on first login');
  console.log('  - The file will be automatically deleted after first login');
  console.log('  - Copy this password now - you cannot retrieve it later');
  console.log();
  console.log('='.repeat(60));
  console.log();

  // Check for .env file
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      let envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Generate a random session secret
      const sessionSecret = generateSessionSecret();
      envContent = envContent.replace(
        'SESSION_SECRET=change_this_to_a_random_string_min_32_chars',
        `SESSION_SECRET=${sessionSecret}`
      );
      
      fs.writeFileSync(envPath, envContent);
      console.log('✓ Created .env file from template');
      console.log('  ⚠️  IMPORTANT: Edit .env and add your SmartThings token!');
      console.log();
    } else {
      console.log('⚠️  .env.example not found. Please create .env manually.');
      console.log();
    }
  } else {
    console.log('✓ .env file already exists');
    console.log();
  }

  // Check for certificates
  const certsDir = path.join(__dirname, '..', 'certs');
  const certExists = fs.existsSync(path.join(certsDir, 'server.crt'));
  const keyExists = fs.existsSync(path.join(certsDir, 'server.key'));

  if (!certExists || !keyExists) {
    console.log('⚠️  HTTPS certificates not found!');
    console.log('  Run: npm run generate-certs');
    console.log();
  } else {
    console.log('✓ HTTPS certificates found');
    console.log();
  }

  // Create placeholder database schema info
  const schemaInfo = {
    version: '1.0.0',
    created: new Date().toISOString(),
    tables: ['users', 'sessions', 'access_control', 'audit_logs', 'settings']
  };
  fs.writeFileSync(
    path.join(DATA_DIR, 'schema.json'),
    JSON.stringify(schemaInfo, null, 2)
  );

  console.log('='.repeat(60));
  console.log('  Setup Complete!');
  console.log('='.repeat(60));
  console.log();
  console.log('Next steps:');
  console.log();
  console.log('  1. Edit .env and add your SmartThings token');
  console.log('  2. Generate HTTPS certificates: npm run generate-certs');
  console.log('  3. Start the application: npm run dev');
  console.log('  4. Open https://localhost:5173 in your browser');
  console.log('  5. Login with the password shown above');
  console.log();
  console.log('For detailed instructions, see: README.md');
  console.log();
}

main();
