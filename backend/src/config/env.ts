import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file from root directory
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️  .env file not found. Please run: npm run setup');
}

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  HOST: z.string().default('0.0.0.0'),
  
  // HTTPS
  HTTPS_ENABLED: z.string().transform(val => val === 'true').default('false'),
  CERT_PATH: z.string().default('./certs/server.crt'),
  KEY_PATH: z.string().default('./certs/server.key'),
  
  // SmartThings
  SMARTTHINGS_TOKEN: z.string().min(1, 'SmartThings token is required'),
  SMARTTHINGS_API_URL: z.string().url().default('https://api.smartthings.com/v1'),
  
  // Google Home (placeholder)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Session
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  SESSION_TIMEOUT_MINUTES: z.string().transform(Number).default('30'),
  
  // Security
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  AUDIT_LOG_RETENTION_DAYS: z.string().transform(Number).default('90'),
  
  // CORS
  ALLOWED_ORIGINS: z.string().default('https://localhost:5173'),
});

// Parse and validate environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  throw error;
}

// Export typed configuration
export const config = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  
  server: {
    port: env.PORT,
    host: env.HOST,
  },
  
  https: {
    enabled: env.HTTPS_ENABLED,
    certPath: path.resolve(env.CERT_PATH),
    keyPath: path.resolve(env.KEY_PATH),
  },
  
  smartthings: {
    token: env.SMARTTHINGS_TOKEN,
    apiUrl: env.SMARTTHINGS_API_URL,
  },
  
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },
  
  session: {
    secret: env.SESSION_SECRET,
    timeoutMinutes: env.SESSION_TIMEOUT_MINUTES,
  },
  
  security: {
    rateLimitMax: env.RATE_LIMIT_MAX,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    bcryptRounds: env.BCRYPT_ROUNDS,
  },
  
  logging: {
    level: env.LOG_LEVEL,
    auditRetentionDays: env.AUDIT_LOG_RETENTION_DAYS,
  },
  
  cors: {
    origins: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  },
};

// Log loaded configuration (without secrets)
if (config.isDevelopment) {
  console.log('✓ Configuration loaded:');
  console.log(`  Environment: ${config.env}`);
  console.log(`  Server: ${config.https.enabled ? 'https' : 'http'}://${config.server.host}:${config.server.port}`);
  console.log(`  SmartThings API: ${config.smartthings.apiUrl}`);
  console.log(`  SmartThings Token: ${config.smartthings.token ? '***SET***' : '***NOT SET***'}`);
  console.log(`  Session Timeout: ${config.session.timeoutMinutes} minutes`);
}
