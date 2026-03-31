const request = require('supertest');
const jwt = require('jsonwebtoken');

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

describe('POST /api/cart/items', () => {
  const validProductId = '507f1f77bcf86cd799439011';

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'jest-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 404 when no token provided', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .send({ productId: validProductId, qty: 1 });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Unauthorized: No token provided',
    });
  });

  test('returns 403 when role is not allowed', async () => {
    const token = makeToken({ role: 'admin' });

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: validProductId, qty: 1 });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Forbidden: Insufficient permissions',
    });
  });

  test('returns 400 when productId is invalid', async () => {
    const token = makeToken();

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'not-an-objectid', qty: 1 });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('returns 400 when qty is not a positive integer', async () => {
    const token = makeToken();

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: validProductId, qty: 0 });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('adds a new item when cart does not exist', async () => {
    const userId = '507f1f77bcf86cd7994390a1';
    const token = makeToken({ _id: userId });

    cartModel.findOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: validProductId, qty: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Item added to cart successfully',
    });

    expect(cartModel.findOne).toHaveBeenCalledWith({ user: userId });
    expect(cartModel).toHaveBeenCalledWith({ user: userId, items: [] });

    expect(res.body.cart.items).toEqual([{ productId: validProductId, qty: 2 }]);
  });

  test('increments qty when item already exists in cart', async () => {
    const userId = '507f1f77bcf86cd7994390a2';
    const token = makeToken({ _id: userId });

    const existingCart = {
      user: userId,
      items: [
        {
          productId: { toString: () => validProductId },
          qty: 2,
        },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValueOnce(existingCart);

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: validProductId, qty: 3 });

    expect(res.status).toBe(200);
    expect(existingCart.save).toHaveBeenCalled();
    expect(res.body.cart.items[0].qty).toBe(5);
  });

  test('returns 500 when model throws', async () => {
    const token = makeToken();

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    cartModel.findOne.mockRejectedValueOnce(new Error('db down'));

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: validProductId, qty: 1 });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'Internal server error' });

    errorSpy.mockRestore();
  });
});
