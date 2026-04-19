// Mock DB layer so the route/controller can be tested without MongoDB.
jest.mock('../src/models/product.model', () => ({
  findById: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');

const productModel = require('../src/models/product.model');

describe('GET /api/products/:id', () => {
  beforeEach(() => {
    // Reset mock call history + stubs between test cases.
    jest.clearAllMocks();
  });

  test('returns 400 when id is invalid', async () => {
    // Act: call with a non-ObjectId id.
    const res = await request(app).get('/api/products/not-a-valid-id');

    // Assert: validation error, and DB should not be queried.
    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.any(String),
      })
    );
    expect(productModel.findById).not.toHaveBeenCalled();
  });

  test('returns 404 when product is not found', async () => {
    // Arrange: DB returns no document for the id.
    productModel.findById.mockResolvedValue(null);

    // Act: call with a valid ObjectId.
    const res = await request(app).get('/api/products/507f191e810c19729de860ea');

    // Assert: not found + correct DB lookup.
    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.any(String),
      })
    );
    expect(productModel.findById).toHaveBeenCalledWith('507f191e810c19729de860ea');
  });

  test('returns product when found', async () => {
    // Arrange: DB returns a product document.
    const mockProduct = {
      _id: '507f191e810c19729de860ea',
      title: 'Product 1',
      price: { amount: 10, currency: 'INR' },
    };

    productModel.findById.mockResolvedValue(mockProduct);

    // Act: call the endpoint.
    const res = await request(app).get('/api/products/507f191e810c19729de860ea');

    // Assert: success response shape + DB lookup.
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      product: mockProduct,
    });

    expect(productModel.findById).toHaveBeenCalledWith('507f191e810c19729de860ea');
  });
});
