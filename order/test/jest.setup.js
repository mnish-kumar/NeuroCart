const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function ensureMongoStarted() {
  if (!global.__MONGO_SERVER__) {
    global.__MONGO_SERVER__ = await MongoMemoryServer.create();
    process.env.MONGODB_URI = global.__MONGO_SERVER__.getUri();
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

beforeAll(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

  await ensureMongoStarted();
});

afterEach(async () => {
  if (!mongoose.connection?.db) return;

  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  if (global.__MONGO_SERVER__) {
    await global.__MONGO_SERVER__.stop();
    global.__MONGO_SERVER__ = undefined;
  }
});
