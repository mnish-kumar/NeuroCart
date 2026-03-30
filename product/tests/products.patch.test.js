const request = require('supertest');

function buildAppWithUser(user) {
	jest.resetModules();

	// Fully mock the product model to avoid Mongoose buffering/hanging tests.
	jest.doMock('../src/models/product.model', () => ({
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn(),
	}));

	// Prevent ImageKit env errors when loading the controller.
	jest.doMock('../src/services/imagekit.service', () => ({
		uploadImageBuffer: jest.fn(),
	}));

	// Mock cache service so we can assert invalidation happens.
	jest.doMock('../src/services/cache.service', () => ({
		invalidateProductsListCache: jest.fn(),
		invalidateProductCache: jest.fn(),
	}));

	// Mock auth middleware to simulate role-based access.
	jest.doMock('../src/middlewares/auth.middleware', () => ({
		createAuthMiddleware: (roles = []) => (req, res, next) => {
			if (!user) {
				return res.status(401).json({
					success: false,
					message: 'Unauthorized: No token provided',
				});
			}

			if (roles.length > 0 && !roles.includes(user.role)) {
				return res.status(403).json({
					success: false,
					message: 'Forbidden: Insufficient permissions',
				});
			}

			req.user = user;
			next();
		},
	}));

	// NOTE: Avoid jest.isolateModules here. It creates a separate module registry,
	// which would give the controller a different mocked model instance than the
	// one we configure in the test.
	const app = require('../src/app');
	const productModel = require('../src/models/product.model');
	const cache = require('../src/services/cache.service');

	// Supertest can create an underlying TCP server; explicitly manage
	// server lifecycle to avoid Jest open-handle warnings.
	const server = app.listen(0);
	const sockets = new Set();
	server.on('connection', (socket) => {
		sockets.add(socket);
		socket.on('close', () => sockets.delete(socket));
	});

	return {
		server,
		close: () =>
			new Promise((resolve, reject) => {
				for (const socket of sockets) {
					socket.destroy();
				}
				server.close((err) => (err ? reject(err) : resolve()));
			}),
		cache,
		productModel,
	};
}

describe('PATCH /api/products/:id', () => {
	let closeServer;

	beforeEach(() => {
		jest.clearAllMocks();
		closeServer = undefined;
	});

	afterEach(async () => {
		if (closeServer) {
			await closeServer();
			closeServer = undefined;
		}
	});

	test('401 when unauthenticated', async () => {
		const { server, close } = buildAppWithUser(null);
		closeServer = close;

		const res = await request(server)
			.patch('/api/products/507f191e810c19729de860ea')
			.send({ title: 'New Title' });

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: false,
			})
		);
	});

	test('403 when authenticated but not seller/admin', async () => {
		const { server, close } = buildAppWithUser({
			id: '507f1f77bcf86cd799439011',
			role: 'buyer',
		});
		closeServer = close;

		const res = await request(server)
			.patch('/api/products/507f191e810c19729de860ea')
			.send({ title: 'New Title' });

		expect(res.status).toBe(403);
	});

	test('403 for invalid product id', async () => {
		const { server, close } = buildAppWithUser({
			id: '507f1f77bcf86cd799439011',
			role: 'seller',
		});
		closeServer = close;

		const res = await request(server)
			.patch('/api/products/not-a-valid-objectid')
			.send({ title: 'New Title' });

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: false,
				message: 'Invalid product ID',
			})
		);
	});

	test('400 when no valid fields are provided', async () => {
		const { server, close, productModel } = buildAppWithUser({
			id: '507f1f77bcf86cd799439011',
			role: 'seller',
		});
		closeServer = close;

		productModel.findOne.mockResolvedValue({
			_id: '507f191e810c19729de860ea',
			seller: '507f1f77bcf86cd799439011',
		});

		const res = await request(server)
			.patch('/api/products/507f191e810c19729de860ea')
			.send({ unknownField: 'x' });

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: false,
				message: 'No valid fields to update',
			})
		);
	});

	test('404 when product is not found', async () => {
		const { server, close, productModel } = buildAppWithUser({
			id: '507f1f77bcf86cd799439011',
			role: 'seller',
		});
		closeServer = close;

		productModel.findOne.mockResolvedValue(null);

		const res = await request(server)
			.patch('/api/products/507f191e810c19729de860ea')
			.send({ title: 'New Title' });

		expect(res.status).toBe(404);
	});

	test('404 when seller updates a product they do not own', async () => {
		const { server, close, productModel } = buildAppWithUser({
			id: '507f1f77bcf86cd799439011',
			role: 'seller',
		});
		closeServer = close;

		productModel.findOne.mockResolvedValue(null);

		const res = await request(server)
			.patch('/api/products/507f191e810c19729de860ea')
			.send({ title: 'New Title' });

		expect(res.status).toBe(404);
	});

	test('200 updates allowed fields and invalidates caches (seller owner)', async () => {
		const sellerId = '507f1f77bcf86cd799439011';
		const productId = '507f191e810c19729de860ea';

		const { server, close, productModel, cache } = buildAppWithUser({
			id: sellerId,
			role: 'seller',
		});
		closeServer = close;

		productModel.findOne.mockResolvedValue({
			_id: productId,
			seller: sellerId,
		});

		productModel.findOneAndUpdate.mockResolvedValue({
			_id: productId,
			title: 'Updated Title',
			description: 'Updated description',
			price: { amount: 123, currency: 'USD' },
		});

		const res = await request(server)
			.patch(`/api/products/${productId}`)
			.send({
				title: 'Updated Title',
				description: 'Updated description',
				price: { amount: 123 },
				seller: 'should-not-change',
			});

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: true,
				product: expect.any(Object),
			})
		);

		expect(productModel.findOneAndUpdate).toHaveBeenCalledWith(
			{ _id: productId, seller: sellerId },
			{
				$set: {
					title: 'Updated Title',
					description: 'Updated description',
					price: { amount: 123 },
				},
			},
			{ new: true }
		);

		expect(cache.invalidateProductCache).toHaveBeenCalledWith(productId);
		expect(cache.invalidateProductsListCache).toHaveBeenCalled();
	});

	
});
