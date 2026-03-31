const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../models/cart.model', () => {
  const cartModel = jest.fn().mockImplementation((data) => ({
    ...data,
    items: Array.isArray(data?.items) ? [...data.items] : [],
    save: jest.fn().mockResolvedValue(undefined),
  }));

  cartModel.findOne = jest.fn();
  cartModel.findOneAndUpdate = jest.fn();

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

describe('DELETE /api/cart/items/:productId', () => {
  const validProductId = '507f1f77bcf86cd799439011';

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'jest-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when no token provided', async () => {
    const res = await request(app).delete(`/api/cart/items/${validProductId}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Unauthorized: No token provided',
    });
  });

  test('returns 403 when role is not allowed', async () => {
    const token = makeToken({ role: 'admin' });

    const res = await request(app)
      .delete(`/api/cart/items/${validProductId}`)
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

    cartModel.findOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .delete(`/api/cart/items/${validProductId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Cart not found' });
    expect(cartModel.findOne).toHaveBeenCalledWith({ user: userId });
  });

  test('returns 404 when item is not in cart', async () => {
    const userId = '507f1f77bcf86cd7994390a2';
    const token = makeToken({ _id: userId });

    const existingCart = {
      user: userId,
      items: [
        {
          productId: '507f1f77bcf86cd799439012',
          qty: 1,
        },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    };

    cartModel.findOne.mockResolvedValueOnce(existingCart);

    const res = await request(app)
      .delete(`/api/cart/items/${validProductId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Item not found in cart' });
    expect(existingCart.save).not.toHaveBeenCalled();
  });

  test('removes item when it exists in cart', async () => {
    const userId = '507f1f77bcf86cd7994390a3';
    const token = makeToken({ _id: userId });

    const existingCart = {
      user: userId,
      items: [
        { productId: validProductId, qty: 2 },
        { productId: '507f1f77bcf86cd799439013', qty: 1 },
      ],
    };

    const updatedCart = {
      user: userId,
      items: [{ productId: '507f1f77bcf86cd799439013', qty: 1 }],
    };

    cartModel.findOne.mockResolvedValueOnce(existingCart);
    cartModel.findOneAndUpdate.mockResolvedValueOnce(updatedCart);

    const res = await request(app)
      .delete(`/api/cart/items/${validProductId}`)
      .set('Authorization', `Bearer ${token}`);

    
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Item removed from cart successfully' });

    expect(cartModel.findOneAndUpdate).toHaveBeenCalledWith(
      { user: userId },
      { $pull: { items: { productId: validProductId } } },
      { new: true },
    );

    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].qty).toBe(1);
    expect(res.body.cart.items[0].productId).toBe('507f1f77bcf86cd799439013');
  });

  test('returns 500 when model throws', async () => {
    const token = makeToken();

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    cartModel.findOne.mockRejectedValueOnce(new Error('db down'));

    const res = await request(app)
      .delete(`/api/cart/items/${validProductId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'Internal server error' });

    errorSpy.mockRestore();
  });
});
