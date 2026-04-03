const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const orderModel = require('../src/models/order.model');

const orderID = '69cd67493805039195c1f46a';

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
        quantity: 1,
        price: { amount: total, currency },
      },
    ],
    totalPrice: { amount: total, currency },
    shippingAddress: makeShippingAddress(),
    status,
  };
}

describe('POST /api/orders/:id/cancel', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post(`/api/orders/${new mongoose.Types.ObjectId()}/cancel`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when role is not allowed', async () => {
    const token = makeToken({ id: orderID, role: 'admin' });

    const res = await request(app)
      .post(`/api/orders/${new mongoose.Types.ObjectId()}/cancel`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid order id', async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const res = await request(app)
      .post('/api/orders/not-an-object-id/cancel')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when order is not found', async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const res = await request(app)
      .post(`/api/orders/${new mongoose.Types.ObjectId()}/cancel`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 when trying to cancel someone else's order", async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const otherUserId = new mongoose.Types.ObjectId().toString();
    const otherOrder = await orderModel.create(makeOrderDoc({ userId: otherUserId, status: 'PENDING' }));

    const res = await request(app)
      .post(`/api/orders/${otherOrder._id}/cancel`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('cancels an order when status is PENDING', async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const created = await orderModel.create(makeOrderDoc({ userId: orderID, status: 'PENDING' }));

    const res = await request(app)
      .post(`/api/orders/${created._id}/cancel`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.status).toBe('CANCELLED');

    const updated = await orderModel.findById(created._id);
    expect(updated.status).toBe('CANCELLED');
  });

  it('cancels an order when status is CONFIRMED (paid)', async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const created = await orderModel.create(makeOrderDoc({ userId: orderID, status: 'CONFIRMED' }));

    const res = await request(app)
      .post(`/api/orders/${created._id}/cancel`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.status).toBe('CANCELLED');
  });

  it('returns 400 when cancelling is not allowed for SHIPPED', async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const created = await orderModel.create(makeOrderDoc({ userId: orderID, status: 'SHIPPED' }));

    const res = await request(app)
      .post(`/api/orders/${created._id}/cancel`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('PATCH /api/orders/:id/address', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/orders/${new mongoose.Types.ObjectId()}/address`)
      .send({ shippingAddress: makeShippingAddress() });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });


  it('returns 400 for invalid order id', async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const res = await request(app)
      .patch('/api/orders/not-an-object-id/address')
      .set('Cookie', `token=${token}`)
      .send({ shippingAddress: makeShippingAddress() });

    // id parsing happens in controller
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid payload (validator)', async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const created = await orderModel.create(makeOrderDoc({ userId: orderID, status: 'PENDING' }));

    const res = await request(app)
      .patch(`/api/orders/${created._id}/address`)
      .set('Cookie', `token=${token}`)
      .send({
        shippingAddress: {
          street: 'A',
          city: 'B',
          state: 'C',
          country: 'D',
          pincode: '123',
        },
      });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('updates address when order is PENDING', async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const created = await orderModel.create(makeOrderDoc({ userId: orderID, status: 'PENDING' }));

    const newAddr = makeShippingAddress({ street: '99 New Street', pincode: '560002' });

    const res = await request(app)
      .patch(`/api/orders/${created._id}/address`)
      .set('Cookie', `token=${token}`)
      .send({ shippingAddress: newAddr });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.shippingAddress.street).toBe('99 New Street');
    expect(res.body.order.shippingAddress.pincode).toBe('560002');

    const updated = await orderModel.findById(created._id);
    expect(updated.shippingAddress.street).toBe('99 New Street');
  });

  it('returns 400 when trying to update address after payment capture (CONFIRMED)', async () => {
    const token = makeToken({ id: orderID, role: 'user' });

    const created = await orderModel.create(makeOrderDoc({ userId: orderID, status: 'CONFIRMED' }));

    const res = await request(app)
      .patch(`/api/orders/${created._id}/address`)
      .set('Cookie', `token=${token}`)
      .send({ shippingAddress: makeShippingAddress({ street: '99 New Street' }) });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
