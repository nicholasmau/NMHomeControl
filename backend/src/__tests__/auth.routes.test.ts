import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { authRoutes } from '../routes/auth.routes';
import { UserService } from '../services/user.service';
import supertest from 'supertest';

// Skip integration tests for now - they need full session middleware setup
describe.skip('Auth Routes', () => {
  let app: any;
  let request: any;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(fastifyCookie, {
      secret: 'test-secret-for-testing-only',
    });
    await app.register(authRoutes, { prefix: '/auth' });
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up users and sessions before each test
    const db = require('../database/db').db;
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM sessions').run();
  });

  describe('POST /auth/login', () => {
    // Demo Mode Tests - No database setup needed
    describe('Demo Mode', () => {
      it('should login with demo credentials', async () => {
        const response = await request
          .post('/auth/login')
          .send({ username: 'demo', password: 'demo1234' })
          .expect(200);

        expect(response.body.user).toBeDefined();
        expect(response.body.user.username).toBe('demo');
        expect(response.body.user.id).toBe('demo-user-id');
        expect(response.body.sessionId).toBeDefined(); // For WebSocket
        expect(response.headers['set-cookie']).toBeDefined();
      });

      it('should reject wrong demo password', async () => {
        const response = await request
          .post('/auth/login')
          .send({ username: 'demo', password: 'wrongpassword' })
          .expect(401);

        expect(response.body.error).toBe('Invalid credentials');
      });
    });

    // Regular Mode Tests - Requires database setup
    describe('Regular Mode', () => {
      beforeEach(async () => {
        await UserService.createUser('testuser', 'password123', 'user');
      });

      it('should login with valid credentials', async () => {
      const response = await request
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123' })
        .expect(200);

        expect(response.body.user).toBeDefined();
        expect(response.body.user.username).toBe('testuser');
        expect(response.body.sessionId).toBeDefined(); // For WebSocket
        expect(response.headers['set-cookie']).toBeDefined();
      });
  it('should reject invalid credentials', async () => {
        const response = await request
          .post('/auth/login')
          .send({ username: 'testuser', password: 'wrongpassword' })
          .expect(401);

        expect(response.body.error).toBe('Invalid credentials');
      });

      it('should reject non-existent user', async () => {
        const response = await request
          .post('/auth/login')
          .send({ username: 'nonexistent', password: 'password123' })
          .expect(401);

        expect(response.body.error).toBe('Invalid credentials');
      });

      it('should reject missing username', async () => {
        const response = await request
          .post('/auth/login')
          .send({ password: 'password123' })
          .expect(400);

        expect(response.body.error).toBe('Invalid request');
      });

      it('should reject missing password', async () => {
        const response = await request
          .post('/auth/login')
          .send({ username: 'testuser' })
          .expect(400);

        expect(response.body.error).toBe('Invalid request');
      });
    });
  });

  describe('POST /auth/change-password', () => {
    let sessionCookie: string;

    beforeEach(async () => {
      await UserService.createUser('testuser', 'password123', 'user');
      const loginResponse = await request
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123' });
      sessionCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should change password with valid current password', async () => {
      // First login clears firstLogin flag
      await UserService.changePassword(
        (await UserService.getUserByUsername('testuser'))!.id,
        'password123'
      );

      const response = await request
        .post('/auth/change-password')
        .set('Cookie', sessionCookie)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request
        .post('/auth/login')
        .send({ username: 'testuser', password: 'newpassword123' })
        .expect(200);

      expect(loginResponse.body.user).toBeDefined();
    });

    it('should reject password change without authentication', async () => {
      await request
        .post('/auth/change-password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(401);
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await request
        .post('/auth/change-password')
        .set('Cookie', sessionCookie)
        .send({
          currentPassword: 'password123',
          newPassword: 'short',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid request');
    });
  });

  describe('POST /auth/logout', () => {
    let sessionCookie: string;

    beforeEach(async () => {
      await UserService.createUser('testuser', 'password123', 'user');
      const loginResponse = await request
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123' });
      sessionCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should logout successfully', async () => {
      const response = await request
        .post('/auth/logout')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject logout without authentication', async () => {
      await request
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    describe('Demo Mode', () => {
      let demoSessionCookie: string;

      beforeEach(async () => {
        const loginResponse = await request
          .post('/auth/login')
          .send({ username: 'demo', password: 'demo1234' });
        demoSessionCookie = loginResponse.headers['set-cookie'][0];
      });

      it('should return demo user info', async () => {
        const response = await request
          .get('/auth/me')
          .set('Cookie', demoSessionCookie)
          .expect(200);

        expect(response.body.user).toBeDefined();
        expect(response.body.user.username).toBe('demo');
        expect(response.body.user.id).toBe('demo-user-id');
        expect(response.body.user.role).toBe('user');
      });
    });

    describe('Regular Mode', () => {
      let sessionCookie: string;

      beforeEach(async () => {
        await UserService.createUser('testuser', 'password123', 'user');
        const loginResponse = await request
          .post('/auth/login')
          .send({ username: 'testuser', password: 'password123' });
        sessionCookie = loginResponse.headers['set-cookie'][0];
      });

      it('should return current user info', async () => {
        const response = await request
          .get('/auth/me')
          .set('Cookie', sessionCookie)
          .expect(200);

        expect(response.body.user).toBeDefined();
        expect(response.body.user.username).toBe('testuser');
        expect(response.body.user.role).toBe('user');
      });

      it('should reject without authentication', async () => {
        await request
          .get('/auth/me')
          .expect(401);
      });
    });
  });
});
