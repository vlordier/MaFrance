module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['<rootDir>/client/'],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!client/**',
    '!config/**',
    '!setup/**',
    '!public/**',
    '!routes/**',
    '!services/**',
    '!middleware/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};