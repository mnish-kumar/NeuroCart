jest.mock('../src/models/product.model', () => ({
  create: jest.fn(),
}));

jest.mock('../src/services/imagekit.service', () => ({
  uploadImageBuffer: jest.fn(),
}));

jest.mock('../src/middlewares/auth.middleware', () => ({
  createAuthMiddleware: () => (req, res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011', role: 'seller' };
    next();
  },
}));

const request = require('supertest');
const app = require('../src/app');

const productModel = require('../src/models/product.model');
const { uploadImageBuffer } = require('../src/services/imagekit.service');

describe('POST /api/products/', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a product with images (multipart/form-data)', async () => {
    uploadImageBuffer
      .mockResolvedValueOnce({ url: 'https://img/1', thumbnail: 'https://thumb/1', id: 'file_1' })
      .mockResolvedValueOnce({ url: 'https://img/2', thumbnail: 'https://thumb/2', id: 'file_2' });

    productModel.create.mockResolvedValue({
      _id: '507f191e810c19729de860ea',
      title: 'Test Product',
    });

    const res = await request(app)
      .post('/api/products/')
      .field('title', 'Test Product')
      .field('description', 'A product')
      .field('priceAmount', '99.5')
      .field('priceCurrency', 'INR')
      .attach('images', Buffer.from('fake-image-1'), 'one.png')
      .attach('images', Buffer.from('fake-image-2'), 'two.png');

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        product: expect.any(Object),
      })
    );

    expect(uploadImageBuffer).toHaveBeenCalledTimes(2);
    expect(productModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Product',
        seller: '507f1f77bcf86cd799439011',
        price: { amount: 99.5, currency: 'INR' },
        imageUrl: [
          { url: 'https://img/1', thumbnail: 'https://thumb/1', id: 'file_1' },
          { url: 'https://img/2', thumbnail: 'https://thumb/2', id: 'file_2' },
        ],
      })
    );
  });

  test('creates a product with no images', async () => {
    productModel.create.mockResolvedValue({
      _id: '507f191e810c19729de860ea',
      title: 'No Image Product',
    });

    const res = await request(app)
      .post('/api/products/')
      .field('title', 'No Image Product')
      .field('priceAmount', '10');

    expect(res.status).toBe(201);
    expect(uploadImageBuffer).not.toHaveBeenCalled();

    expect(productModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'No Image Product',
        imageUrl: [],
        price: { amount: 10, currency: 'INR' },
      })
    );
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/products/')
      .field('priceAmount', '10');

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
      })
    );

    expect(productModel.create).not.toHaveBeenCalled();
  });
});
