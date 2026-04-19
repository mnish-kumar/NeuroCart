const express = require('express');
const request = require('supertest');

// NOTE: Per request, we do NOT create the actual /api/auth/me API in src.
// This test defines a minimal route locally to demonstrate expected behavior.

describe('Auth Routes - api/auth/me', () => {
  it('should return current user when authenticated', async () => {
    const app = express();

    // Minimal route stub for test only
    app.get('/api/auth/me', (req, res) => {
      // In a real implementation, this would come from auth middleware (e.g., req.user)
      return res.status(200).json({
        user: {
          id: 'user_123',
          email: 'me@example.com',
          username: 'me',
        },
      });
    });

    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toMatchObject({
      id: 'user_123',
      email: 'me@example.com',
      username: 'me',
    });
  });

  it('should return 401 when not authenticated', async () => {
    const app = express();

    // Minimal route stub for test only
    app.get('/api/auth/me', (req, res) => {
      return res.status(401).json({ message: 'Unauthorized' });
    });

    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });
});
