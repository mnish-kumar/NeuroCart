const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const inventoryService = require('../src/services/inventory.service');

const FIXED_USER_ID = '69cbea18fd49baa5f2bc72df';

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('POST /api/orders', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/api/orders').send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when role is not allowed', async () => {
    const token = makeToken({ id: FIXED_USER_ID, role: 'admin' });

    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `token=${token}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid payload (validator)', async () => {
    const token = makeToken({ id: FIXED_USER_ID, role: 'user' });

    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `token=${token}`)
      .send({
        items: [
          {
            product: new mongoose.Types.ObjectId().toString(),
            quantity: 1,
            price: { amount: 10, currency: 'USD' },
          },
        ],
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

  it('creates an order with status=PENDING, computes totalPrice, and reserves inventory', async () => {
    const reserveSpy = jest
      .spyOn(inventoryService, 'reserveInventory')
      .mockResolvedValue(true);

    const token = makeToken({ id: FIXED_USER_ID, role: 'user' });

    const items = [
      {
        product: new mongoose.Types.ObjectId().toString(),
        quantity: 2,
        price: { amount: 100, currency: 'USD' },
      },
      {
        product: new mongoose.Types.ObjectId().toString(),
        quantity: 1,
        price: { amount: 50, currency: 'USD' },
      },
    ];

    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `token=${token}`)
      .send({
        items,
        shippingAddress: {
          street: '1 Test St',
          city: 'Testville',
          state: 'TS',
          country: 'IN',
          pincode: '560001',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expect(res.body.order).toBeTruthy();
    expect(res.body.order.status).toBe('PENDING');
    expect(res.body.order.user).toBe(FIXED_USER_ID);

    expect(res.body.order.totalPrice.currency).toBe('USD');
    expect(res.body.order.totalPrice.amount).toBe(250);

    expect(res.body.order.items).toHaveLength(2);
    expect(res.body.order.items[0].quantity).toBe(2);

    expect(reserveSpy).toHaveBeenCalledTimes(1);
    expect(reserveSpy).toHaveBeenCalledWith(items);
  });

  it('returns 409 when inventory cannot be reserved', async () => {
    jest.spyOn(inventoryService, 'reserveInventory').mockResolvedValue(false);

    const token = makeToken({ id: FIXED_USER_ID, role: 'user' });

    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `token=${token}`)
      .send({
        items: [
          {
            product: new mongoose.Types.ObjectId().toString(),
            quantity: 1,
            price: { amount: 10, currency: 'USD' },
          },
        ],
        shippingAddress: {
          street: '1 Test St',
          city: 'Testville',
          state: 'TS',
          country: 'IN',
          pincode: '560001',
        },
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
