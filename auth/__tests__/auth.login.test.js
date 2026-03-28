const request = require('supertest');
const bcrypt = require('bcryptjs');

const app = require('../src/app');
const userModel = require('../src/models/user.model');

describe('Auth Routes - api/auth/login', () => {
  it('should login successfully with valid credentials', async () => {
    const hashPassword = await bcrypt.hash('password123', 10);

    await userModel.create({
      username: 'loginuser',
      email: 'login@example.com',
      password: hashPassword,
      fullName: {
        firstName: 'Login',
        lastName: 'User',
      },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'password123',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Login successful');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email', 'login@example.com');
    expect(res.body.user).not.toHaveProperty('password');

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeTruthy();
    expect(setCookie.join(';')).toContain('token=');
  });

  it('should login successfully with username only (email omitted)', async () => {
    const hashPassword = await bcrypt.hash('password123', 10);

    await userModel.create({
      username: 'usernameonly',
      email: 'usernameonly@example.com',
      password: hashPassword,
      fullName: {
        firstName: 'Username',
        lastName: 'Only',
      },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'usernameonly',
        password: 'password123',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Login successful');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('username', 'usernameonly');
  });

  it('should return 401 for wrong password', async () => {
    const hashPassword = await bcrypt.hash('password123', 10);

    await userModel.create({
      username: 'wrongpass',
      email: 'wrongpass@example.com',
      password: hashPassword,
      fullName: {
        firstName: 'Wrong',
        lastName: 'Pass',
      },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrongpass@example.com',
        password: 'password124',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });

  it('should return 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nouser@example.com',
        password: 'password123',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });

  it('should return 400 for invalid payload (validator)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'not-an-email',
        password: '123',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('should return 400 when both email and username are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'password123',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
