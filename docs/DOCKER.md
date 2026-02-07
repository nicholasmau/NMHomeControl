# Docker Deployment Guide

This guide covers running the Home Control application using Docker.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Development Mode](#development-mode)
4. [Production Mode](#production-mode)
5. [Docker Commands](#docker-commands)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Install Docker Desktop

**Windows**:
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Install and restart your computer
3. Start Docker Desktop
4. Verify installation:
   ```powershell
   docker --version
   docker-compose --version
   ```

**Alternative - WSL2 Backend**:
Docker Desktop uses WSL2 on Windows for better performance.

---

## Quick Start

### Demo Mode (No Configuration Needed!)

Try the application instantly:

```powershell
# Start services
docker-compose up -d --build

# Access at http://localhost:5173
# Login: demo / demo1234
```

Demo mode provides simulated devices for testing without SmartThings setup.

### Full Setup with SmartThings

### 1. Generate Certificates

First time only:
```powershell
npm run generate-certs
```

### 2. Configure Environment

```powershell
# Copy environment template
Copy-Item .env.example .env

# Edit .env and add your SmartThings token
notepad .env
```

### 3. Start Services

```powershell
# Build and start all services
docker-compose up --build

# Or run in background (detached mode)
docker-compose up -d --build
```

### 4. Access Application

- **Frontend**: https://localhost:5173
- **Backend API**: https://localhost:3001
- **Health Check**: https://localhost:3001/api/health

---

## Development Mode

Development mode uses hot-reload for both frontend and backend.

### Start Development Environment

```powershell
# Start all services with logs
docker-compose up

# Or in background
docker-compose up -d

# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View frontend logs only
docker-compose logs -f frontend
```

### Code Changes

- **Backend**: Changes to `backend/src/**` auto-reload
- **Frontend**: Changes to `frontend/src/**` auto-reload via Vite HMR
- **No rebuild needed** - volumes are mounted for live updates

### Stop Development Environment

```powershell
# Stop services (preserves containers)
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove volumes (deletes node_modules)
docker-compose down -v
```

---

## Production Mode

Production mode builds optimized images and serves the frontend from the backend.

### Build Production Image

```powershell
# Build production image
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

### Access Production App

- **Application**: https://localhost:3001
- **API**: https://localhost:3001/api
- **Metrics**: https://localhost:3001/metrics

---

## Docker Commands

### Service Management

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Restart services
docker-compose restart

# Restart single service
docker-compose restart backend

# View service status
docker-compose ps

# Remove stopped containers
docker-compose down
```

### Logs

```powershell
# View all logs
docker-compose logs

# Follow logs (live)
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs backend
docker-compose logs frontend
```

### Rebuild

```powershell
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend

# Force rebuild (no cache)
docker-compose build --no-cache

# Rebuild and restart
docker-compose up -d --build
```

### Shell Access

```powershell
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# Run command in backend
docker-compose exec backend npm run type-check

# Run command in frontend
docker-compose exec frontend npm run build
```

### Database Access

```powershell
# Access SQLite database
docker-compose exec backend sh
cd /app/data
sqlite3 app.sqlite
```

---

## Architecture

### Network Configuration

Services communicate via `home-control-network` bridge network:

```
┌─────────────────────────────────────┐
│  Docker Network: home-control       │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   Frontend   │  │   Backend   │ │
│  │   :5173      │→→│   :3001     │ │
│  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
         ↓                  ↓
    Host: 5173         Host: 3001
```

### Volume Mounts

**Development**:
- Source code mounted for hot-reload
- `node_modules` in named volumes (faster, isolated)
- Certs, data, logs shared with host

**Production**:
- Only runtime files included
- Data and logs persisted to host
- No source code mounted

---

## Environment Variables

Docker Compose reads from `.env` file automatically.

### Required Variables

```env
SMARTTHINGS_TOKEN=your_token_here
SESSION_SECRET=random_32_char_string
```

### Docker-Specific Variables

```env
# Override defaults if needed
BACKEND_PORT=3001
FRONTEND_PORT=5173
```

---

## Troubleshooting

### Port Already in Use

```powershell
# Check what's using the port
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# Change port in docker-compose.yml
ports:
  - "3002:3001"  # Use 3002 on host instead
```

### Certificate Issues

```powershell
# Regenerate certificates
npm run generate-certs

# Restart services
docker-compose restart
```

### Database Issues

```powershell
# Reset database
docker-compose down
Remove-Item -Recurse -Force data
docker-compose up -d
npm run setup
```

### Volume Issues

```powershell
# Remove all volumes and rebuild
docker-compose down -v
docker-compose up --build
```

### Container Won't Start

```powershell
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check container status
docker-compose ps

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Out of Disk Space

```powershell
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune

# Remove all stopped containers
docker container prune
```

### Hot Reload Not Working

**Backend**:
- Check volume mounts in docker-compose.yml
- Ensure `tsx watch` is running (check logs)

**Frontend**:
- Check Vite config has correct settings
- Verify volume mounts are correct

### Can't Access from Other Devices

```powershell
# Use host IP instead of localhost
# Find your IP:
ipconfig

# Access from other device:
https://192.168.1.100:5173
```

Trust certificate on the other device (see main README).

---

## Benefits of Docker

✅ **Consistent Environment**: Same Node.js version everywhere  
✅ **No Build Tools**: Alpine image includes Python/Make/G++  
✅ **Isolated Dependencies**: Each service has its own node_modules  
✅ **Easy Cleanup**: `docker-compose down -v` removes everything  
✅ **Portable**: Works on Windows, Mac, Linux  
✅ **Production-Ready**: Same setup for dev and production  

---

## Next Steps

- **Kubernetes**: For multi-node deployments (overkill for home use)
- **Docker Swarm**: For simple orchestration
- **Watchtower**: Auto-update containers
- **Traefik**: Reverse proxy with auto-SSL

For most home automation needs, Docker Compose is perfect!
