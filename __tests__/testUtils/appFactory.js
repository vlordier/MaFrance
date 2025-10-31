const express = require('express');

/**
 * Creates an Express app with a route module mounted, including common mocks.
 * @param {string} routeModulePath - Path to the route module to mount
 * @param {string} mountPath - Path to mount the route at (default: '/')
 * @param {object} options - Configuration options
 * @param {boolean} options.mockValidate - Whether to mock validation middleware (default: true)
 * @returns {object} Object containing the app and mocks
 */
function createAppWithRoute(routeModulePath, mountPath = '/', options = {}) {
  // Reset module registry so our doMock calls apply reliably.
  jest.resetModules();

  // Setup middleware mocks
  setupMiddlewareMocks(options);

  // Setup database mock
  setupDatabaseMock();

  // Create and configure the Express app
  const app = createExpressApp(routeModulePath, mountPath);

  return {
    app,
    mocks: getMocks()
  };
}

/**
 * Setup common middleware mocks
 * @param {object} options - Configuration options
 */
function setupMiddlewareMocks(options) {
  // Cache middleware mock
  jest.doMock('../../middleware/cache', () => ({
    cacheMiddleware: jest.fn(() => (req, res, next) => next())
  }));

  // Validation middleware mocks (unless disabled)
  const shouldMockValidate = options.mockValidate !== false;
  if (shouldMockValidate) {
    jest.doMock('../../middleware/validate', () => ({
      validateDepartement: jest.fn((req, res, next) => next()),
      validateDepartementParam: jest.fn((req, res, next) => next()),
      validateCOG: jest.fn((req, res, next) => next()),
      validateCOGParam: jest.fn((req, res, next) => next()),
      validateOptionalCOG: jest.fn((req, res, next) => next()),
      validateOptionalDepartement: jest.fn((req, res, next) => next()),
      validateSearchQuery: jest.fn((req, res, next) => next()),
      validateSort: jest.fn((req, res, next) => next()),
      validateDirection: jest.fn((req, res, next) => next()),
      validatePagination: jest.fn((req, res, next) => next()),
      validatePopulationRange: jest.fn((req, res, next) => next()),
      validateCountry: jest.fn((req, res, next) => next()),
      validateLieu: jest.fn((req, res, next) => next())
    }));
  }
}

/**
 * Setup database mock with safe defaults
 */
function setupDatabaseMock() {
  jest.doMock('../../config/db', () => ({
    all: jest.fn((sql, params, callback) => callback(null, [])),
    get: jest.fn((sql, params, callback) => callback(null, null))
  }));
}

/**
 * Create and configure Express app
 * @param {string} routeModulePath - Path to route module
 * @param {string} mountPath - Mount path
 * @returns {object} Configured Express app
 */
function createExpressApp(routeModulePath, mountPath) {
  const app = express();
  app.use(express.json());

  // Require the route after mocks are in place
  const route = require(routeModulePath);
  app.use(mountPath, route);
  // Ensure app.locals.db points to the mocked db
  app.locals.db = require('../../config/db');

  // Mount error handler middleware
  const { errorHandler } = require('../../middleware/errorHandler');
  app.use(errorHandler);

  return app;
}

/**
 * Get all available mocks
 * @returns {object} Object containing all mocks
 */
function getMocks() {
  return {
    db: (() => {
      try { return jest.requireMock('../../config/db'); }
      catch { return require('../../config/db'); }
    })(),
    validate: (() => {
      try { return require('../../middleware/validate'); }
      catch { return null; }
    })(),
    cache: (() => {
      try { return jest.requireMock('../../middleware/cache'); }
      catch { return require('../../middleware/cache'); }
    })(),
    cacheService: (() => {
      try { return jest.requireMock('../../services/cacheService'); }
      catch { try { return require('../../services/cacheService'); } catch { return null; } }
    })()
  };
}

module.exports = {
  createAppWithRoute
};