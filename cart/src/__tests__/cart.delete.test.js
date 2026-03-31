const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../models/cart.model', () => {
  const cartModel = jest.fn().mockImplementation((data) => ({
    ...data,
    items: Array.isArray(data?.items) ? [...data.items] : [],
    save: jest.fn().mockResolvedValue(undefined),
  }));

  cartModel.findOneAndDelete = jest.fn();

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

describe('DELETE /api/cart', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'jest-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when no token provided', async () => {
    const res = await request(app).delete('/api/cart');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Unauthorized: No token provided',
    });
  });

  test('returns 403 when role is not allowed', async () => {
    const token = makeToken({ role: 'admin' });

    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Forbidden: Insufficient permissions',
    });
  });

  test('returns 404 when cart does not exist', async () => {
    const userId = '507f1f77bcf86cd7994390a1';
    const token = makeToken({ _id: userId });

    cartModel.findOneAndDelete.mockResolvedValueOnce(null);

    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Cart not found' });
    expect(cartModel.findOneAndDelete).toHaveBeenCalledWith({ user: userId });
  });

  test('deletes cart when it exists', async () => {
    const userId = '507f1f77bcf86cd7994390a2';
    const token = makeToken({ _id: userId });

    const deletedCart = {
      _id: '507f1f77bcf86cd7994390ff',
      user: userId,
      items: [],
    };

    cartModel.findOneAndDelete.mockResolvedValueOnce(deletedCart);

    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Cart deleted successfully',
      cartID: deletedCart._id,
    });

    expect(cartModel.findOneAndDelete).toHaveBeenCalledWith({ user: userId });
  });

  test('returns 500 when model throws', async () => {
    const token = makeToken();

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    cartModel.findOneAndDelete.mockRejectedValueOnce(new Error('db down'));

    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'Internal server error' });

    errorSpy.mockRestore();
  });
});
