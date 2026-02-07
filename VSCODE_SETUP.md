# Local Development Setup (VS Code)

If you're seeing red marks in VS Code about missing modules, it's because the node_modules are inside Docker containers. To get proper TypeScript/IntelliSense support in VS Code, install dependencies locally:

## Option 1: Install Dependencies Locally (Recommended for VS Code)

```powershell
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

After running these commands, VS Code will have access to type definitions and IntelliSense will work properly.

**Note:** You don't need to run the app locally - Docker handles that. This is only for IDE support.

## Option 2: Use VS Code Remote - Containers Extension

Alternatively, you can use the "Remote - Containers" extension to develop inside the Docker container:

1. Install the extension: https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers
2. Open the project in a container
3. VS Code will have access to all dependencies inside the container

## Why are there errors?

The project is designed to run in Docker, where dependencies are installed in containers. VS Code on your host machine doesn't have access to these dependencies, causing "Cannot find module" errors. These are **IDE warnings only** - the code runs perfectly in Docker.

## Verifying Everything Works

To confirm the application is working correctly despite IDE warnings:

```powershell
# Start the application
docker-compose up -d

# Check logs
docker logs home-control-backend --tail 50
docker logs home-control-frontend --tail 50

# Access the app
# Frontend: http://localhost:5173
# Backend: https://localhost:3001
```

If the containers start successfully and the app is accessible, everything is working correctly!
