const { createAppWithRoute } = require('./appFactory');
const { testAssertions } = require('./assertions');
const { testLifecycle } = require('./lifecycle');
const testDataFactory = require('../testDataFactory');

/**
 * Reset module mocks (legacy function for backward compatibility)
 */
function resetModuleMocks() {
  jest.resetModules();
}

module.exports = {
  // Main functions
  createAppWithRoute,
  resetModuleMocks,

  // Test utilities
  testAssertions,
  testLifecycle,
  testDataFactory
};