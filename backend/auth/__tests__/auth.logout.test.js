const request = require('supertest');

const app = require('../src/app');

describe('Auth Routes - api/auth/logout', () => {
  it('should clear token cookie and return success message', async () => {
    const res = await request(app)
      .get('/api/auth/logout')
      .set('Cookie', ['token=some.jwt.token']);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Logout successful');

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeTruthy();

    // Express adds a Set-Cookie header that expires the cookie.
    const cookieHeader = setCookie.join(';');
    expect(cookieHeader).toContain('token=');
    expect(cookieHeader).toMatch(/Expires=/i);
  });

  it('should still succeed even if token cookie is missing', async () => {
    const res = await request(app).get('/api/auth/logout');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Logout successful');
  });
});
