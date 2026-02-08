# Home Control - Local Smart Home Web Interface

A secure, local-first web application for controlling SmartThings, Google Home, and other connected devices from your home network.

## Screenshots

### Login & Demo Mode
![Login Page](docs/screenshots/HomeControl%20login.png)
*Secure login with optional demo mode for testing without real devices*

### Dashboard & Scenes
![Dashboard](docs/screenshots/HomeControl%20Scenes.png)
*Control devices, execute scenes, and monitor your smart home in real-time*

### Admin Panel & Audit Logs
![Admin Panel](docs/screenshots/HomeControl%20admin%20panel.png)
*Comprehensive audit logging and user management for administrators*

## Features

- 🔒 **HTTPS Support** with optional self-signed certificates
- 👥 **Multi-user support** with role-based access control (Admin & User roles)
- 🏠 **Device Control** for SmartThings devices (lights, switches, thermostats, sensors, cameras)
- 🎯 **Access Control Lists** - Admins can control which devices users can access
- 📊 **Telemetry & Metrics** with Prometheus integration
- � **Alerting** - 14 alert rules monitoring performance and errors
- 📈 **Performance Dashboards** - Real-time latency and error tracking
- �📝 **Audit Logging** - Track all user actions and device controls
- ⚡ **Real-time Updates** - WebSocket-based live device status updates
- 🧪 **Demo Mode** - Try the app instantly without SmartThings setup
- 🌓 **Dark Mode** support
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Quick Start

### Demo Mode (No Setup Required!)

Try the application instantly without SmartThings setup:

1. **Start with Docker:**
   ```bash
   docker-compose up -d --build
   ```

2. **Access the app**: http://localhost:5173
   - Login with username: `demo` and password: `demo1234`
   - Explore with simulated devices (no real SmartThings connection needed)
   - Perfect for testing or development!

### Prerequisites

- **Docker Desktop** (recommended) OR Node.js 20 LTS
- Windows/Mac/Linux or Raspberry Pi
- SmartThings Personal Access Token ([Get one here](https://account.smartthings.com/tokens)) - Optional for demo mode

### Installation

#### Option A: Docker (Recommended - No Node.js Issues!)

1. **Install Docker Desktop**: https://www.docker.com/products/docker-desktop

2. **Configure environment:**
   ```bash
   Copy-Item .env.example .env
   # Edit .env and add your SmartThings token
   ```

3. **Start with Docker:**
   ```bash
   docker-compose up -d --build
   ```

4. **Get your admin password:**
   ```bash
   docker-compose logs backend | Select-String "INITIAL ADMIN PASSWORD" -Context 5
   ```
   The password is also saved in the backend container at `/app/initial-password.txt`

5. **Access the app**: http://localhost:5173
   - Login with username: `admin` and the password from step 4
   - You'll be prompted to change your password on first login

6. **(Optional) Enable HTTPS:**
   ```bash
   # Generate self-signed certificates (requires OpenSSL/Git for Windows)
   powershell -ExecutionPolicy Bypass -File scripts/generate-certs-openssl.ps1
   
   # Edit .env and set: HTTPS_ENABLED=true
   
   # Restart backend
   docker-compose restart backend
   ```
   Then access at https://localhost:3001 (accept the browser security warning for self-signed cert)

See [Docker Guide](docs/DOCKER.md) for detailed instructions.

#### Option B: Local Node.js Installation

1. **Install Node.js 20 LTS**: https://nodejs.org/

2. **Clone and install dependencies:**
   ```bash
   cd NMHomeControl
   npm run install:all
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your SmartThings token and other configuration.

4. **First-time setup:**
   ```bash
   npm run setup
   ```
   This will:
   - Generate a random admin password
   - Display it in the console
   - Save it to `initial-password.txt`
   - Create necessary directories and databases

5. **Start the application:**
   ```bash
   npm run dev
   ```
   This starts both frontend (port 5173) and backend (port 3001).

6. **Access the application:**
   - Open `http://localhost:5173` in your browser
   - Login with username: `admin` and the generated password
   - You'll be prompted to change your password on first login

7. **(Optional) Enable HTTPS:**
   ```bash
   # Generate self-signed certificates (requires OpenSSL/Git for Windows)
   powershell -ExecutionPolicy Bypass -File scripts/generate-certs-openssl.ps1
   
   # Edit .env and set: HTTPS_ENABLED=true
   
   # Restart backend
   npm run dev
   ```
   Then access at https://localhost:5173 (accept the browser security warning)

### Production Deployment

For Raspberry Pi or always-on deployment:

```bash
# Build for production
npm run build

# Start production server
npm run start
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed production setup instructions.

## Project Structure

```
home-control/
├── frontend/          # React + Vite frontend
├── backend/           # Fastify backend
├── scripts/           # Setup and utility scripts
├── certs/            # HTTPS certificates (git-ignored)
├── data/             # SQLite databases (git-ignored)
├── logs/             # Audit and application logs (git-ignored)
└── docs/             # Detailed documentation
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and data flow
- [Frontend Guide](docs/FRONTEND.md) - React components and UI structure
- [Backend Guide](docs/BACKEND.md) - API endpoints and services
- [Security Features](docs/SECURITY.md) - Authentication, authorization, and best practices
- [SmartThings Setup](docs/SMARTTHINGS_SETUP.md) - Getting your API token and connecting devices
- [Grafana & Prometheus Setup](docs/GRAFANA_SETUP.md) - Monitoring dashboards and metrics
- [Deployment Guide](docs/DEPLOYMENT.md) - Raspberry Pi and production deployment
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Configuration

### Admin Settings

Once logged in as admin, you can configure:

- **Session Timeout:** 15/30/60/120 minutes
- **Log Retention:** 30/60/90 days or forever
- **User Management:** Create users, assign roles
- **Access Control:** Assign devices and rooms to users
- **Token Management:** Update SmartThings API token

### Multi-User Support

- **Admin Role:** Full access to all devices and admin functions
- **User Role:** Limited access based on ACL configured by admins
- Users only see devices they have permission to control

## Telemetry & Monitoring

The application exposes Prometheus metrics at `https://localhost:3001/metrics`:

- Device state changes
- Command success/failure rates
- API response times
- Authentication attempts
- User activity

Optional: Set up Grafana for beautiful dashboards (see [docs/PROMETHEUS_SETUP.md](docs/PROMETHEUS_SETUP.md))

## Security Features

- ✅ Optional HTTPS with self-signed certificates (HTTP mode available for local dev)
- ✅ Session-based authentication with HTTP-only cookies
- ✅ Password/PIN support with bcrypt hashing
- ✅ Rate limiting to prevent brute force
- ✅ Audit logging of all actions
- ✅ API tokens never exposed to frontend
- ✅ Role-based access control (RBAC)
- ✅ Device-level access control lists (ACL)

## Monitoring & Alerting

The application includes comprehensive monitoring with Prometheus and Grafana.

### Quick Access

| Service | URL | Purpose |
|---------|-----|---------|
| **Grafana Dashboards** | http://localhost:3000 | System health & performance visualization |
| **Prometheus Metrics** | http://localhost:9090 | Raw metrics and query interface |
| **Alert Rules** | http://localhost:9090/alerts | Active alerts and status |

**Default Credentials**: admin / admin (change on first login)

### Available Dashboards

1. **Home Control - System Overview**
   - Active sessions, connected devices, command success rates
   - HTTP request rates and latency
   - Authentication attempts and error rates

2. **Home Control - Performance Metrics**
   - Detailed latency percentiles (p50, p95, p99)
   - Error rate analysis
   - API performance tracking

### Alert Monitoring

The system monitors 14 different alert conditions:

- 🔴 **Critical**: Service down (requires immediate action)
- 🟡 **Warning**: High latency, error rates, or unusual traffic patterns
- 🔵 **Info**: Session monitoring and traffic anomalies

**View Alerts**: http://localhost:9090/alerts

For complete documentation, see:
- [Grafana Quick Start](docs/GRAFANA_QUICKSTART.md)
- [Alerting & Performance Guide](docs/ALERTING_PERFORMANCE.md)

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

## Supported Devices

### SmartThings
- Lights (on/off, dimming, color)
- Switches
- Thermostats
- Locks
- Sensors (motion, contact, temperature)
- Cameras
- Custom capabilities

### Google Home (Planned)
- Coming in Phase 2

## License

MIT

## Support

For issues, questions, or feature requests, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) or create an issue in the repository.
