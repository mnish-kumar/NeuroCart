// Must run before requiring app modules so test-only stubs (e.g. Redis) activate.
process.env.NODE_ENV = 'test';

const { connectDB, closeDB, clearDB } = require('./db.setup');

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

  // Guard: never run tests against a real DB by mistake.
  if (process.env.MONGODB_URI) {
    // If you want to allow this in the future, gate it behind an explicit flag.
    delete process.env.MONGODB_URI;
  }

  // Guard: tests must never be configured to talk to a real Redis instance.
  // `src/db/redis.js` stubs Redis in NODE_ENV=test, but we also forbid prod-like vars.
  for (const key of ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'REDIS_URL']) {
    if (process.env[key]) delete process.env[key];
  }

  await connectDB();
});

afterEach(async () => {
  await clearDB();
});

afterAll(async () => {
  await closeDB();
});
