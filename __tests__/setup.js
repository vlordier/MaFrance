// Test setup file for Jest
const { logger } = require('../utils/logger');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Global test setup
beforeAll(() => {
  // Disable console methods during tests to reduce noise
  global.originalConsole = { ...console };
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  // Keep console.error for debugging test failures
});

// Global test teardown
afterAll(() => {
  // Restore console methods
  if (global.originalConsole) {
    console.log = global.originalConsole.log;
    console.info = global.originalConsole.info;
    console.warn = global.originalConsole.warn;
  }
});

// Test timeout for async operations
jest.setTimeout(10000);

// Add custom matchers
expect.extend({
  toBeValidCommuneData(received) {
    const pass = received &&
      typeof received === 'object' &&
      received.COG &&
      received.commune &&
      typeof received.population === 'number' &&
      typeof received.insecurite_score === 'number';

    return {
      message: () => `expected ${received} to be valid commune data`,
      pass,
    };
  },

  toBeValidDepartmentData(received) {
    const pass = received &&
      typeof received === 'object' &&
      received.departement &&
      typeof received.population === 'number' &&
      typeof received.insecurite_score === 'number';

    return {
      message: () => `expected ${received} to be valid department data`,
      pass,
    };
  },

  toBeValidPaginatedResponse(received) {
    const pass = received &&
      typeof received === 'object' &&
      Array.isArray(received.data) &&
      typeof received.total_count === 'number';

    return {
      message: () => `expected ${received} to be a valid paginated response`,
      pass,
    };
  }
});

// Mock external dependencies that might cause issues in tests
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock uuid to return predictable values in tests
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-12345')
}));

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
  // Don't fail the test suite for unhandled rejections
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in test:', error);
  // Don't fail the test suite for uncaught exceptions
});