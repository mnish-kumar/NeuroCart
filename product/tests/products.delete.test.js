const request = require('supertest');

function buildAppWithUser(user) {
	jest.resetModules();

	// Fully mock the product model to avoid Mongoose buffering/hanging tests.
	jest.doMock('../src/models/product.model', () => ({
		findOneAndDelete: jest.fn(),
        findOne: jest.fn(),
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

describe('DELETE /api/products/:id', () => {
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

		const res = await request(server).delete('/api/products/507f191e810c19729de860ea');

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: false,
			})
		);
	});

	test('403 when authenticated but not seller', async () => {
		const { server, close } = buildAppWithUser({
			id: '507f1f77bcf86cd799439011',
			role: 'buyer',
		});
		closeServer = close;

		const res = await request(server).delete('/api/products/507f191e810c19729de860ea');

		expect(res.status).toBe(403);
	});

	test('400 when product id is invalid', async () => {
		const { server, close, productModel } = buildAppWithUser({
			id: '507f1f77bcf86cd799439011',
			role: 'seller',
		});
		closeServer = close;

		const res = await request(server).delete('/api/products/not-a-valid-objectid');

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: false,
				message: 'Invalid product ID',
			})
		);
		expect(productModel.findOneAndDelete).not.toHaveBeenCalled();
	});

	test('404 when product is not found (or not owned)', async () => {
		const sellerId = '507f1f77bcf86cd799439011';
		const productId = '507f191e810c19729de860ea';

		const { server, close, productModel } = buildAppWithUser({
			id: sellerId,
			role: 'seller',
		});
		closeServer = close;

		productModel.findOneAndDelete.mockResolvedValue(null);

		const res = await request(server).delete(`/api/products/${productId}`);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: false,
				message: 'Product not found',
			})
		);
		expect(productModel.findOneAndDelete).toHaveBeenCalledWith({
			_id: productId,
			seller: sellerId,
		});
	});

	test('200 deletes product and invalidates caches (seller owner)', async () => {
		const sellerId = '507f1f77bcf86cd799439011';
		const productId = '507f191e810c19729de860ea';

		const { server, close, productModel, cache } = buildAppWithUser({
			id: sellerId,
			role: 'seller',
		});
		closeServer = close;

		productModel.findOneAndDelete.mockResolvedValue({
			_id: productId,
			seller: sellerId,
		});

		const res = await request(server).delete(`/api/products/${productId}`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: true,
				message: 'Product deleted successfully',
			})
		);

		expect(productModel.findOneAndDelete).toHaveBeenCalledWith({
			_id: productId,
			seller: sellerId,
		});

		expect(cache.invalidateProductCache).toHaveBeenCalledWith(productId);
		expect(cache.invalidateProductsListCache).toHaveBeenCalled();
	});

	test('500 when delete operation throws', async () => {
		const sellerId = '507f1f77bcf86cd799439011';
		const productId = '507f191e810c19729de860ea';

		const { server, close, productModel } = buildAppWithUser({
			id: sellerId,
			role: 'seller',
		});
		closeServer = close;

		productModel.findOneAndDelete.mockRejectedValue(new Error('DB error'));

		const res = await request(server).delete(`/api/products/${productId}`);

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: false,
				message: 'DB error',
			})
		);
	});
});
