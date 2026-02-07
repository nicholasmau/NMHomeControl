#!/usr/bin/env node

/**
 * Certificate Generation Utility
 * Generates self-signed SSL certificates for local HTTPS development
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const CERTS_DIR = path.join(__dirname, '..', 'certs');

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Home Control - HTTPS Certificate Generator');
  console.log('='.repeat(60));
  console.log();

  // Create certs directory if it doesn't exist
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
    console.log('✓ Created certs directory');
  }

  // Check if certificates already exist
  const keyPath = path.join(CERTS_DIR, 'server.key');
  const certPath = path.join(CERTS_DIR, 'server.crt');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('⚠️  Certificates already exist!');
    const overwrite = await question('Do you want to regenerate them? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Keeping existing certificates.');
      rl.close();
      return;
    }
  }

  console.log();
  console.log('This will generate a self-signed certificate for local development.');
  console.log('You will need to trust this certificate on your devices.');
  console.log();

  const hostname = await question('Enter hostname (default: localhost): ') || 'localhost';
  const ip = await question('Enter IP address (default: 127.0.0.1): ') || '127.0.0.1';
  const days = await question('Certificate validity in days (default: 365): ') || '365';

  console.log();
  console.log('Generating certificate...');

  try {
    // Check if OpenSSL is available
    try {
      execSync('openssl version', { stdio: 'ignore' });
    } catch (error) {
      console.error('❌ OpenSSL is not installed or not in PATH.');
      console.log();
      console.log('Please install OpenSSL:');
      console.log('  Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
      console.log('  Mac: brew install openssl');
      console.log('  Linux: sudo apt-get install openssl');
      rl.close();
      process.exit(1);
    }

    // Create OpenSSL config file
    const configPath = path.join(CERTS_DIR, 'openssl.cnf');
    const configContent = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = US
ST = State
L = City
O = Home Control
OU = Local Development
CN = ${hostname}

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${hostname}
DNS.2 = *.${hostname}
IP.1 = ${ip}
IP.2 = 127.0.0.1
    `.trim();

    fs.writeFileSync(configPath, configContent);

    // Generate private key
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });
    console.log('✓ Generated private key');

    // Generate certificate
    const opensslCmd = `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days ${days} -config "${configPath}" -extensions v3_req`;
    execSync(opensslCmd, { stdio: 'inherit' });
    console.log('✓ Generated certificate');

    // Clean up config file
    fs.unlinkSync(configPath);

    console.log();
    console.log('='.repeat(60));
    console.log('✅ Certificates generated successfully!');
    console.log('='.repeat(60));
    console.log();
    console.log('Certificate files created:');
    console.log(`  Private Key: ${keyPath}`);
    console.log(`  Certificate: ${certPath}`);
    console.log();
    console.log('⚠️  IMPORTANT: Trust the certificate on your devices');
    console.log();
    console.log('To trust the certificate:');
    console.log();
    console.log('Windows:');
    console.log('  1. Double-click server.crt');
    console.log('  2. Click "Install Certificate"');
    console.log('  3. Select "Local Machine"');
    console.log('  4. Place in "Trusted Root Certification Authorities"');
    console.log();
    console.log('Mac:');
    console.log('  1. Double-click server.crt');
    console.log('  2. Add to "System" keychain');
    console.log('  3. Double-click the certificate in Keychain Access');
    console.log('  4. Expand "Trust" and select "Always Trust"');
    console.log();
    console.log('Linux:');
    console.log('  sudo cp certs/server.crt /usr/local/share/ca-certificates/');
    console.log('  sudo update-ca-certificates');
    console.log();
    console.log('Mobile devices:');
    console.log('  Transfer server.crt to device and install via Settings');
    console.log();

  } catch (error) {
    console.error('❌ Error generating certificates:', error.message);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main();
