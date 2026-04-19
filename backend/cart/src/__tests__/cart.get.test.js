const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

jest.mock('../models/cart.model', () => {
  const cartModel = jest.fn().mockImplementation((data) => ({
    ...data,
    items: Array.isArray(data?.items) ? [...data.items] : [],
    save: jest.fn().mockResolvedValue(undefined),
  }));

  cartModel.findOne = jest.fn();

  return cartModel;
});

const cartModel = require('../models/cart.model');
const app = require('../app');

function makeToken(payloadOverrides = {}) {
  const payload = {
    _id: '507f1f77bcf86cd799439099',
    role: 'user',
    ...payloadOverrides,
  };
  return jwt.sign(payload, process.env.JWT_SECRET);
}

describe('GET /api/cart', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'jest-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Unauthorized: No token provided',
    });
  });

  test('returns 403 when role is not allowed', async () => {
    const token = makeToken({ role: 'admin' });

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Forbidden: Insufficient permissions',
    });
  });

  test('creates cart and returns 200 when cart does not exist', async () => {
    const userId = '507f1f77bcf86cd7994390a1';
    const token = makeToken({ _id: userId });
    cartModel.findOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Cart retrieved successfully',
      cart: { user: userId, items: [] },
      totals: { totalItems: 0, totalQty: 0 },
    });
    expect(cartModel.findOne).toHaveBeenCalledWith({ user: userId });
    expect(cartModel).toHaveBeenCalledWith({ user: userId, items: [] });

    const createdCart = cartModel.mock.results[0]?.value;
    expect(createdCart?.save).toHaveBeenCalled();
  });

  test('returns 200 with cart and totals', async () => {
    const userId = '507f1f77bcf86cd7994390a2';
    const token = makeToken({ _id: userId });

    const existingCart = {
      user: userId,
      items: [
        { productId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), qty: 2 },
        { productId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'), qty: 5 },
      ],
    };

    cartModel.findOne.mockResolvedValueOnce(existingCart);

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Cart retrieved successfully',
      totals: { totalItems: 2, totalQty: 7 },
    });
  });

  test('returns 500 when user id is not a valid ObjectId (cast error)', async () => {
    const token = makeToken({ _id: 'not-an-objectid' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    cartModel.findOne.mockRejectedValueOnce(new Error('CastError'));

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'Internal server error' });

    errorSpy.mockRestore();
  });

  test('returns 500 when model throws', async () => {
    const token = makeToken();

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    cartModel.findOne.mockRejectedValueOnce(new Error('db down'));

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'Internal server error' });

    errorSpy.mockRestore();
  });
});
