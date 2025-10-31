const testDataFactory = require('../testDataFactory');

/**
 * Test lifecycle helpers for setup, teardown, and common test patterns
 */
const testLifecycle = {
  /**
   * Setup common test data using the factory
   * @param {object} mocks - Mock objects from createAppWithRoute
   * @param {string} dataType - Type of data to create ('communes', 'departments', etc.)
   * @param {number} count - Number of items to create (default: 1)
   * @returns {object|array} Created test data
   */
  setupTestData: (mocks, dataType = 'communes', count = 1) => {
    const factoryMethod = `create${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`;
    const data = count === 1
      ? testDataFactory[factoryMethod]()
      : testDataFactory[factoryMethod](count);

    // Setup database mocks
    if (Array.isArray(data)) {
      mocks.db.all.mockImplementation((sql, params, callback) => callback(null, data));
      mocks.db.get.mockImplementation((sql, params, callback) => callback(null, { total_count: data.length }));
    } else {
      mocks.db.get.mockImplementation((sql, params, callback) => callback(null, data));
    }

    return data;
  },

  /**
   * Setup cache mocks
   * @param {object} mocks - Mock objects from createAppWithRoute
   * @param {any} data - Data to return from cache
   * @param {string} key - Cache key (optional)
   */
  setupCache: (mocks, data, key = null) => {
    if (key) {
      mocks.cacheService.get.mockReturnValue(data);
    } else {
      // Default cache setup (cache miss)
      mocks.cacheService.get.mockReturnValue(null);
    }
  },

  /**
   * Setup cache hit scenario
   * @param {object} mocks - Mock objects from createAppWithRoute
   * @param {any} data - Data to return from cache
   * @param {string} key - Cache key
   */
  setupCacheHit: (mocks, data, key) => {
    mocks.cacheService.get.mockReturnValue(data);
  },

  /**
   * Setup cache miss scenario
   * @param {object} mocks - Mock objects from createAppWithRoute
   * @param {string} key - Cache key
   */
  setupCacheMiss: (mocks, key) => {
    mocks.cacheService.get.mockReturnValue(null);
  },

  /**
   * Setup database error scenario
   * @param {object} mocks - Mock objects from createAppWithRoute
   * @param {string} method - Database method ('all', 'get', etc.)
   * @param {Error} error - Error to throw
   */
  setupDatabaseError: (mocks, method = 'all', error = new Error('Database error')) => {
    mocks.db[method].mockImplementation((sql, params, callback) => {
      callback(error, null);
    });
  },

  /**
   * Setup successful database response
   * @param {object} mocks - Mock objects from createAppWithRoute
   * @param {string} method - Database method ('all', 'get', etc.)
   * @param {any} data - Data to return
   */
  setupDatabaseSuccess: (mocks, method = 'all', data = []) => {
    mocks.db[method].mockImplementation((sql, params, callback) => {
      callback(null, data);
    });
  },

  /**
   * Clean up after tests
   */
  cleanup: () => {
    jest.clearAllMocks();
    jest.resetModules();
  },

  /**
   * Reset all module mocks (useful for isolated tests)
   */
  resetModules: () => {
    jest.resetModules();
  }
};

module.exports = {
  testLifecycle
};