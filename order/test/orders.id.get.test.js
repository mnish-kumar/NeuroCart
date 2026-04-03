const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const orderModel = require('../src/models/order.model');

const orderId = '69cd67493805039195c1f46a';

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

function makeOrderDoc({ userId, total = 100, currency = 'INR', status = 'PENDING' } = {}) {
  return {
    user: userId,
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        quantity: 2,
        price: { amount: total, currency },
      },
    ],
    totalPrice: { amount: total, currency },
    shippingAddress: makeShippingAddress(),
    status,
  };
}

describe('GET /api/orders/:id', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get(`/api/orders/${new mongoose.Types.ObjectId()}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });


  it('returns 400 for invalid order id', async () => {
    const token = makeToken({ id: orderId, role: 'user' });

    const res = await request(app)
      .get('/api/orders/not-an-object-id')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when order is not found', async () => {
    const token = makeToken({ id: orderId, role: 'user' });

    const res = await request(app)
      .get(`/api/orders/${new mongoose.Types.ObjectId()}`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 when trying to access someone else's order", async () => {
    const token = makeToken({ id: orderId, role: 'user' });

    const otherUserId = new mongoose.Types.ObjectId().toString();
    const otherOrder = await orderModel.create(makeOrderDoc({ userId: otherUserId, total: 250 }));

    const res = await request(app)
      .get(`/api/orders/${otherOrder._id}`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  
});
