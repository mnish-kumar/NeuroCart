jest.mock('../src/models/product.model', () => ({
  find: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');

const productModel = require('../src/models/product.model');

describe('GET /api/products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 500 when product query execution fails', async () => {
    const queryChain = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('DB error')),
    };

    productModel.find.mockReturnValue(queryChain);

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.any(String),
      })
    );
  });

  test('returns products with default pagination', async () => {
    const mockProducts = [
      {
        _id: '507f191e810c19729de860ea',
        title: 'Product 1',
        price: { amount: 10, currency: 'INR' },
      },
    ];

    const queryChain = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockProducts),
    };

    productModel.find.mockReturnValue(queryChain);

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: mockProducts,
    });

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(queryChain.skip).toHaveBeenCalledWith(0);
    expect(queryChain.limit).toHaveBeenCalledWith(20);
  });

  test('applies text search when q is provided', async () => {
    const queryChain = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    productModel.find.mockReturnValue(queryChain);

    const res = await request(app).get('/api/products').query({ q: 'iphone' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: [],
    });

    expect(productModel.find).toHaveBeenCalledWith({
      $text: { $search: 'iphone' },
    });
  });

  test('applies minprice/maxprice and pagination params', async () => {
    const mockProducts = [{ _id: '1', title: 'Filtered Product' }];

    const queryChain = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockProducts),
    };

    productModel.find.mockReturnValue(queryChain);

    const res = await request(app).get('/api/products').query({
      minprice: '10.5',
      maxprice: '99',
      skip: '5',
      limit: '2',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: mockProducts,
    });

    expect(productModel.find).toHaveBeenCalledWith({
      'price.amount': { $gte: 10.5, $lte: 99 },
    });
    expect(queryChain.skip).toHaveBeenCalledWith(5);
    expect(queryChain.limit).toHaveBeenCalledWith(2);
  });
});
