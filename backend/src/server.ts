import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config/env';
import { logger } from './utils/logger';
import { db } from './database/db';
import { UserService } from './services/user.service';
import { smartThingsService } from './services/smartthings.service';
import { websocketService } from './services/websocket.service';
import { register } from './services/metrics.service';
import { authRoutes } from './routes/auth.routes';
import { deviceRoutes } from './routes/device.routes';
import { sceneRoutes } from './routes/scene.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { adminRoutes } from './routes/admin.routes';
import { auditMiddleware } from './middleware/audit.middleware';

// Create Fastify instance
const httpsEnabled = config.https.enabled && 
  fs.existsSync(config.https.keyPath) && 
  fs.existsSync(config.https.certPath);

if (config.https.enabled && !httpsEnabled) {
  logger.warn('⚠️  HTTPS certificates not found. Starting in HTTP mode...');
  logger.warn('⚠️  Generate certificates: npm run generate-certs');
}

const fastify = Fastify({
  logger: logger as any,
  https: httpsEnabled ? {
    key: fs.readFileSync(config.https.keyPath),
    cert: fs.readFileSync(config.https.certPath),
  } : undefined,
  trustProxy: true,
});

// Attach database to fastify instance for use in routes
declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db;
  }
}
fastify.decorate('db', db);

// Register plugins
fastify.register(fastifyCookie);

fastify.register(fastifyCors, {
  origin: config.cors.origins,
  credentials: true,
});

fastify.register(fastifyRateLimit, {
  max: config.security.rateLimitMax,
  timeWindow: config.security.rateLimitWindowMs,
});

// Serve static frontend files in production
if (config.isProduction) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    fastify.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
    });
  }
}

// Global audit middleware
fastify.addHook('onRequest', auditMiddleware);

// Health check endpoint
fastify.get('/api/health', async () => {
  const stConnection = await smartThingsService.testConnection();
  
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      smartthings: stConnection ? 'connected' : 'disconnected',
    },
  };
});

// Prometheus metrics endpoint
fastify.get('/metrics', async (request, reply) => {
  reply.header('Content-Type', register.contentType);
  return register.metrics();
});

// Register route modules
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(deviceRoutes, { prefix: '/api/devices' });
fastify.register(sceneRoutes, { prefix: '/api/scenes' });
fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
fastify.register(adminRoutes, { prefix: '/api/admin' });

// Catch-all for SPA routing in production
if (config.isProduction) {
  fastify.setNotFoundHandler((request, reply) => {
    const frontendIndex = path.join(__dirname, '../../frontend/dist/index.html');
    if (fs.existsSync(frontendIndex)) {
      reply.sendFile('index.html');
    } else {
      reply.code(404).send({ error: 'Not found' });
    }
  });
}

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  // Don't expose internal errors in production
  const message = config.isDevelopment ? error.message : 'Internal server error';
  
  reply.code(error.statusCode || 500).send({
    error: message,
  });
});

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach(signal => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, closing server gracefully...`);
    
    try {
      await fastify.close();
      db.close();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
});

// Start server
async function start() {
  try {
    // Initialize admin user if none exists
    await UserService.initializeAdminUser();
    
    // Test SmartThings connection
    const stConnected = await smartThingsService.testConnection();
    if (!stConnected) {
      logger.warn('⚠️  Could not connect to SmartThings API. Please check your token.');
    } else {
      logger.info('✓ SmartThings API connection successful');
    }
    
    // Start server
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });
    
    // Initialize WebSocket server
    websocketService.initialize(fastify.server);
    
    const protocol = config.https.enabled ? 'https' : 'http';
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`  Home Control Server Started`);
    logger.info(`${'='.repeat(60)}`);
    logger.info(`  Server: ${protocol}://${config.server.host}:${config.server.port}`);
    logger.info(`  WebSocket: ws${config.https.enabled ? 's' : ''}://localhost:${config.server.port}/ws`);
    logger.info(`  Environment: ${config.env}`);
    logger.info(`  API: ${protocol}://localhost:${config.server.port}/api`);
    logger.info(`  Health: ${protocol}://localhost:${config.server.port}/api/health`);
    logger.info(`  Metrics: ${protocol}://localhost:${config.server.port}/metrics`);
    logger.info(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
