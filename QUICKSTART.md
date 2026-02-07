# Quick Start Guide

Get Home Control up and running in 5 minutes!
This project was created with Claude Sonnet 4.5.  Please see the docs folder for details on specific areas of interest.

## Prerequisites Check

Before starting, ensure you have:

- ✅ Node.js 18 or higher installed
- ✅ npm (comes with Node.js)
- ✅ SmartThings account with at least one device
- ✅ SmartThings Personal Access Token ([Get one here](https://account.smartthings.com/tokens))

Check your Node.js version:
```bash
node --version  # Should be v18.0.0 or higher
```

## Step 1: Install Dependencies

```bash
cd NMHomeControl
npm run install:all
```

This installs dependencies for both frontend and backend.

**Expected output:**
```
added XXX packages...
✓ All dependencies installed
```

## Step 2: Generate HTTPS Certificates

```bash
npm run generate-certs
```

Follow the prompts. Use defaults or customize:
- Hostname: `localhost` (default)
- IP: `127.0.0.1` (default)
- Validity: `365` days (default)

**Expected output:**
```
✓ Generated private key
✓ Generated certificate
✅ Certificates generated successfully!
```

**Important:** Trust the certificate on your system (instructions will be displayed).

## Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file
notepad .env  # Windows
# or
nano .env     # Mac/Linux
```

**Required change:**
Find this line:
```env
SMARTTHINGS_TOKEN=your_personal_access_token_here
```

Replace with your actual token:
```env
SMARTTHINGS_TOKEN=12345678-1234-1234-1234-123456789abc
```

Save and close the file.

Don't have a token yet? See [SmartThings Setup Guide](docs/SMARTTHINGS_SETUP.md).

## Step 4: First-Time Setup

```bash
npm run setup
```

This will:
- Create necessary directories
- Generate a secure admin password
- Initialize the database
- Validate configuration

**Expected output:**
```
==========================================================
  IMPORTANT: Initial Admin Password
==========================================================

  Your initial admin password is:

    HomeCtrl-X7k9-P2mQ-v8Bn

  This password has been saved to: initial-password.txt
  You will be required to change this on first login.
==========================================================

✓ Created directory: data/
✓ Created directory: logs/
✓ Created .env file from template
✓ HTTPS certificates found
✓ Setup Complete!
```

**⚠️ SAVE THIS PASSWORD!** You'll need it to login.

## Step 5: Start the Application

```bash
npm run dev
```

This starts both the backend server and frontend development server.

**Expected output:**
```
[backend] ✓ Configuration loaded
[backend] ✓ SmartThings API connection successful
[backend] ✓ Initial admin user created
[backend] 
[backend] ==========================================================
[backend]   Home Control Server Started
[backend] ==========================================================
[backend]   Server: https://localhost:3001
[backend]   Environment: development
[backend] ==========================================================

[frontend] VITE v5.0.12  ready in 1234 ms
[frontend] ➜  Local:   https://localhost:5173/
[frontend] ➜  Network: https://192.168.1.100:5173/
```

## Step 6: Access the Application

Open your browser and go to:

```
https://localhost:5173
```

**Certificate Warning**: You'll see a security warning because of the self-signed certificate. This is normal for local development.

- **Chrome**: Click "Advanced" → "Proceed to localhost (unsafe)"
- **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
- **Edge**: Click "Advanced" → "Continue to localhost (unsafe)"

## Step 7: First Login

1. **Username**: `admin`
2. **Password**: Use the password from Step 4 (check `initial-password.txt` if needed)
3. Click "Sign In"

You'll be immediately prompted to change your password.

4. **New Password**: Choose a secure password (min 8 characters)
5. **Confirm Password**: Re-enter your new password
6. Click "Change Password"

The `initial-password.txt` file will be automatically deleted.

## Step 8: Explore!

You're now on the dashboard! You should see:

- ✅ Your SmartThings devices
- ✅ Control buttons (On/Off for switches/lights)
- ✅ Device status

Try turning a device on or off!

---

## Troubleshooting

### "SmartThings connection test failed"

**Solution**: Check your `.env` file:
- Ensure `SMARTTHINGS_TOKEN` is set correctly
- No extra spaces or quotes around the token
- Token must have device read/execute permissions

### "No devices found"

**Causes**:
- No devices in your SmartThings account
- Token doesn't have proper permissions
- Devices are offline

**Solution**:
- Check SmartThings mobile app to verify devices are online
- Regenerate token with all required scopes
- See [SmartThings Setup](docs/SMARTTHINGS_SETUP.md)

### Certificate Warning Won't Go Away

**Solution**: Trust the certificate on your system:

**Windows**:
```bash
# Double-click certs/server.crt
# Click "Install Certificate"
# Choose "Local Machine"
# Select "Trusted Root Certification Authorities"
```

**Mac**:
```bash
# Double-click certs/server.crt
# Add to "System" keychain
# Open Keychain Access, find certificate
# Double-click → Trust → Always Trust
```

**Linux**:
```bash
sudo cp certs/server.crt /usr/local/share/ca-certificates/home-control.crt
sudo update-ca-certificates
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Check what's using the port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                  # Mac/Linux

# Kill the process or change port in .env:
PORT=3002
```

### Can't Access from Other Devices

**Problem**: Works on PC but not on phone/tablet

**Solution**:
1. Find your PC's local IP address:
   ```bash
   ipconfig              # Windows
   ifconfig              # Mac/Linux
   ```

2. Use that IP on other devices:
   ```
   https://192.168.1.100:5173
   ```

3. Install certificate on mobile device:
   - Transfer `certs/server.crt` to device
   - Install via Settings → Security → Install Certificate

### "Failed to fetch" errors

**Cause**: Backend not running or wrong URL

**Solution**:
- Ensure backend is running (`npm run dev:backend`)
- Check console for errors
- Verify `https://localhost:3001/api/health` works

---

## Next Steps

Now that you're up and running:

1. **Explore Devices**: Try controlling different device types
2. **Check Admin Panel**: Click "Admin" if you're logged in as admin
3. **Create Users** (Phase 2): Add family members with limited access
4. **Read Documentation**:
   - [Architecture](docs/ARCHITECTURE.md) - Understand the system
   - [Security](docs/SECURITY.md) - Security features and best practices
   - [SmartThings Setup](docs/SMARTTHINGS_SETUP.md) - Advanced device setup

5. **Set Up Telemetry** (Optional):
   - [Prometheus Setup](docs/PROMETHEUS_SETUP.md) - Metrics and monitoring

---

## Stopping the Application

Press `Ctrl+C` in the terminal where `npm run dev` is running.

The application will shut down gracefully.

---

## Production Deployment

For always-on deployment (Raspberry Pi, home server), see:
- [Deployment Guide](docs/DEPLOYMENT.md)

---

## Getting Help

- **Documentation**: Check the `docs/` folder
- **Logs**: Check `logs/` directory for error details
- **Health Check**: Visit `https://localhost:3001/api/health`

Happy Home Automating! 🏠✨
