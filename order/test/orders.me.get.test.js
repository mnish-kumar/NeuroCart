const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const orderModel = require('../src/models/order.model');

const FIXED_USER_ID = '69cbea18fd49baa5f2bc72df';

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function makeShippingAddress(overrides = {}) {
  return {
    street: '1 Test St',
    city: 'Testville',
    state: 'TS',
    country: 'IN',
    pincode: '560001',
    ...overrides,
  };
}

function makeOrderDoc({ userId, total = 100, currency = 'INR' } = {}) {
  return {
    user: userId,
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        price: { amount: total, currency },
      },
    ],
    totalPrice: { amount: total, currency },
    shippingAddress: makeShippingAddress(),
    status: 'PENDING',
  };
}

describe('GET /api/orders/me', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/orders/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when role is not allowed', async () => {
    const token = makeToken({ id: FIXED_USER_ID, role: 'admin' });

    const res = await request(app)
      .get('/api/orders/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns a paginated list of only the authenticated user orders (default pagination)', async () => {
    const token = makeToken({ id: FIXED_USER_ID, role: 'user' });

    const otherUserId = new mongoose.Types.ObjectId().toString();

    // 15 for current user, 3 for someone else
    await orderModel.insertMany(
      Array.from({ length: 15 }, () => makeOrderDoc({ userId: FIXED_USER_ID })),
    );
    await orderModel.insertMany(
      Array.from({ length: 3 }, () => makeOrderDoc({ userId: otherUserId })),
    );

    const res = await request(app)
      .get('/api/orders/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders).toHaveLength(10); // default limit

    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      totalOrders: 15,
      totalPages: 2,
    });

    for (const order of res.body.orders) {
      expect(order.user).toBe(FIXED_USER_ID);
    }
  });

  it('supports custom pagination via page and limit', async () => {
    const token = makeToken({ id: FIXED_USER_ID, role: 'user' });

    await orderModel.insertMany(
      Array.from({ length: 12 }, (_, idx) => makeOrderDoc({ userId: FIXED_USER_ID, total: 100 + idx })),
    );

    const res = await request(app)
      .get('/api/orders/me?page=2&limit=5')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orders).toHaveLength(5);

    expect(res.body.pagination).toEqual({
      page: 2,
      limit: 5,
      totalOrders: 12,
      totalPages: 3,
    });

    for (const order of res.body.orders) {
      expect(order.user).toBe(FIXED_USER_ID);
    }
  });

  it('returns 400 for invalid page/limit', async () => {
    const token = makeToken({ id: FIXED_USER_ID, role: 'user' });

    const res1 = await request(app)
      .get('/api/orders/me?page=0')
      .set('Cookie', `token=${token}`);

    expect(res1.status).toBe(400);
    expect(res1.body.success).toBe(false);

    const res2 = await request(app)
      .get('/api/orders/me?limit=0')
      .set('Cookie', `token=${token}`);

    expect(res2.status).toBe(400);
    expect(res2.body.success).toBe(false);

    const res3 = await request(app)
      .get('/api/orders/me?limit=101')
      .set('Cookie', `token=${token}`);

    expect(res3.status).toBe(400);
    expect(res3.body.success).toBe(false);

    const res4 = await request(app)
      .get('/api/orders/me?page=abc')
      .set('Cookie', `token=${token}`);

    expect(res4.status).toBe(400);
    expect(res4.body.success).toBe(false);
  });
});
