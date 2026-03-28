module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/src/test/jest.setup.js'],
};
