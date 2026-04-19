/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
  testTimeout: 30000,
};
