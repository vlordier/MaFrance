module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['<rootDir>/client/'],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!client/**',
    '!dist/**',
    '!public/**',
    '!setup/**',
    '!coverage/**',
    '!jest.config.js',
    '!eslint.config.js',
    '!utils/logger.js' // Exclude logger from coverage as it's tested indirectly
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 75,
      lines: 80
    }
  },
  // Performance optimizations
  maxWorkers: 2, // Optimal for this test suite based on benchmarking
  cache: true,
  // Better test output
  verbose: false, // Reduce output noise, show only failures
  silent: true, // Suppress console output from tests
  testTimeout: 5000, // Reduce timeout for faster failure detection
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  // Mock setup
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Error handling
  bail: false, // Don't stop on first failure
  detectOpenHandles: true,
  forceExit: true,
  // Reporters
  reporters: [
    'default'
  ],
  // Additional performance settings
  maxConcurrency: 5, // Limit concurrent tests per worker
  workerIdleMemoryLimit: '512MB' // Memory limit per worker
};