// Test setup file
import { db } from '../database/db';

// Clean up database before each test suite
beforeAll(() => {
  // Use in-memory database for tests
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Close database connection
  db.close();
});

// Mock environment variables
process.env.SMARTTHINGS_TOKEN = 'test-token-12345';
process.env.SESSION_SECRET = 'test-secret-key-for-testing';
process.env.HTTPS_ENABLED = 'false';
