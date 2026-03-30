const request = require('supertest');

function buildAppWithUser(user) {
	jest.resetModules();

	// Fully mock the product model to avoid Mongoose buffering/hanging tests.
	jest.doMock('../src/models/product.model', () => ({
		find: jest.fn(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn(),
	}));

	// Prevent ImageKit env errors when loading the controller.
	jest.doMock('../src/services/imagekit.service', () => ({
		uploadImageBuffer: jest.fn(),
	}));

	// Mock cache service (loaded by controller).
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
		productModel,
	};
}

describe('GET /api/products/seller', () => {
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

		const res = await request(server).get('/api/products/seller');

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

		const res = await request(server).get('/api/products/seller');
		expect(res.status).toBe(403);
	});

	test("200 returns the seller's product list", async () => {
		const sellerId = '507f1f77bcf86cd799439011';

		const { server, close, productModel } = buildAppWithUser({
			id: sellerId,
			role: 'seller',
		});
		closeServer = close;

		const mockProducts = [
			{ _id: '507f191e810c19729de860ea', title: 'P1', seller: sellerId },
			{ _id: '507f191e810c19729de860eb', title: 'P2', seller: sellerId },
		];

		productModel.find.mockReturnValue({
			exec: jest.fn().mockResolvedValue(mockProducts),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
		});

		const res = await request(server).get('/api/products/seller');

		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			success: true,
			data: mockProducts,
		});

		expect(productModel.find).toHaveBeenCalledWith({ seller: sellerId });
	});

	test('500 when query execution fails', async () => {
		const sellerId = '507f1f77bcf86cd799439011';

		const { server, close, productModel } = buildAppWithUser({
			id: sellerId,
			role: 'seller',
		});
		closeServer = close;

		productModel.find.mockReturnValue({
			exec: jest.fn().mockRejectedValue(new Error('DB error')),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
		});

		const res = await request(server).get('/api/products/seller');

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				success: false,
				message: 'DB error',
			})
		);
	});
});
