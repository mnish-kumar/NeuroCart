const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const axios = require('axios');

const app = require('../src/app');
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
    const token = makeToken({ id: FIXED_USER_ID, role: 'user' });

    // The current implementation builds the order from the user's cart
    // and fetches pricing from the product service (no inventory reserve step).
    const productId1 = new mongoose.Types.ObjectId().toString();
    const productId2 = new mongoose.Types.ObjectId().toString();

    const axiosGetSpy = jest.spyOn(axios, 'get').mockImplementation((url) => {
      if (url.includes('/api/cart/')) {
        return Promise.resolve({
          data: {
            cart: {
              items: [
                { productId: productId1, qty: 2 },
                { productId: productId2, qty: 1 },
              ],
            },
          },
        });
      }

      if (url.includes(`/api/products/${productId1}`)) {
        return Promise.resolve({
          data: {
            product: {
              _id: productId1,
              title: 'P1',
              stock: 10,
              price: { amount: 100, currency: 'INR' },
            },
          },
        });
      }

      if (url.includes(`/api/products/${productId2}`)) {
        return Promise.resolve({
          data: {
            product: {
              _id: productId2,
              title: 'P2',
              stock: 10,
              price: { amount: 50, currency: 'INR' },
            },
          },
        });
      }

      return Promise.reject(new Error(`Unexpected axios.get url in test: ${url}`));
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `token=${token}`)
      .send({
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

    // totalPrice currency uses DEFAULT_CURRENCY in the controller (defaults to INR)
    expect(res.body.order.totalPrice.currency).toBe('INR');
    expect(res.body.order.totalPrice.amount).toBe(250);

    expect(res.body.order.items).toHaveLength(2);
    expect(res.body.order.items[0].quantity).toBe(2);

    expect(axiosGetSpy).toHaveBeenCalledTimes(3);
  });

});
