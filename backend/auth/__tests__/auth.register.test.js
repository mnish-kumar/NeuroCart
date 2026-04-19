const request = require('supertest');
const app = require('../src/app');
const userModel = require('../src/models/user.model');

describe('Auth Routes - api/auth/register', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'password123',
        fullName: {
          firstName: 'Test',
          lastName: 'User'
        }
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
    expect(res.body).toHaveProperty('user');

    // Verify it was actually saved in DB
    const user = await userModel.findOne({ email: 'test1@example.com' });
    expect(user).toBeTruthy();
    expect(user.username).toBe('testuser1');
  });

  it('should return error if username or email already exists', async () => {
    // Insert a known user
    await userModel.create({
      username: 'existinguser',
      email: 'exist@example.com',
      password: 'password123',
      fullName: {
        firstName: 'Existing',
        lastName: 'User'
      }
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'existinguser',
        email: 'exist@example.com',
        password: 'password123',
        fullName: {
          firstName: 'Another',
          lastName: 'User'
        }
      });
    
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('message');
  });
});
