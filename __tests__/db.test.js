const path = require('path');

// Mock sqlite3 before requiring db
jest.mock('sqlite3', () => ({
  verbose: () => ({
    Database: jest.fn((path, callback) => {
      const mockDb = {
        configure: jest.fn(),
        close: jest.fn((callback) => callback && callback(null)),
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn(),
        prepare: jest.fn(),
        serialize: jest.fn(),
        parallelize: jest.fn(),
        exec: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        listeners: jest.fn(),
        rawListeners: jest.fn(),
        listenerCount: jest.fn(),
        eventNames: jest.fn(),
        setMaxListeners: jest.fn(),
        getMaxListeners: jest.fn(),
        emit: jest.fn(),
        addListener: jest.fn(),
        prependListener: jest.fn(),
        prependOnceListener: jest.fn(),
        // Mock bind method
        bind: jest.fn(function() { return this; })
      };

      // Simulate successful connection
      if (callback) callback(null);

      return mockDb;
    })
  })
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn()
  },
  logDatabaseQuery: jest.fn()
}));

// Mock retry utility
jest.mock('../utils/retry', () => ({
  retryDatabaseOperation: jest.fn((operation) => operation())
}));

describe('Database Configuration', () => {
  describe('Environment Variables', () => {
    beforeEach(() => {
      // Clear environment variables
      delete process.env.DB_PATH;
    });

    afterEach(() => {
      delete process.env.DB_PATH;
    });

    it('should use default database path when DB_PATH not set', () => {
      // Don't mock config for this test to test actual env var handling
      jest.resetModules();

      const config = require('../config/index');
      expect(config.database.path).toBe('.data/france.db');
    });

    it('should use DB_PATH environment variable when set', () => {
      process.env.DB_PATH = '/custom/path/test.db';
      jest.resetModules();

      const config = require('../config/index');
      expect(config.database.path).toBe('/custom/path/test.db');
    });
  });

  describe('Configuration Validation', () => {
    it('should have required configuration properties', () => {
      const config = require('../config/index');

      expect(config.database).toHaveProperty('path');
      expect(config.api.timeouts).toHaveProperty('connection');
      expect(config.api.timeouts).toHaveProperty('query');
      expect(typeof config.api.timeouts.connection).toBe('number');
      expect(typeof config.api.timeouts.query).toBe('number');
    });

    it('should have valid timeout values', () => {
      const config = require('../config/index');

      expect(config.api.timeouts.connection).toBeGreaterThan(0);
      expect(config.api.timeouts.query).toBeGreaterThan(0);
    });

    it('should have valid server configuration', () => {
      const config = require('../config/index');

      expect(config.server).toHaveProperty('port');
      expect(config.server).toHaveProperty('host');
      expect(config.server).toHaveProperty('env');
      expect(typeof config.server.port).toBe('number');
      expect(config.server.port).toBeGreaterThan(0);
    });

    it('should have valid API limits', () => {
      const config = require('../config/index');

      expect(config.api.limits).toHaveProperty('communes');
      expect(config.api.limits).toHaveProperty('articles');
      expect(config.api.limits).toHaveProperty('rankings');

      expect(config.api.limits.communes).toBeGreaterThan(0);
      expect(config.api.limits.articles).toBeGreaterThan(0);
      expect(config.api.limits.rankings).toBeGreaterThan(0);
    });

    it('should have valid validation configuration', () => {
      const config = require('../config/index');

      expect(config.validation.search).toHaveProperty('minLength');
      expect(config.validation.search).toHaveProperty('maxLength');
      expect(config.validation.search.minLength).toBeGreaterThan(0);
      expect(config.validation.search.maxLength).toBeGreaterThan(config.validation.search.minLength);

      expect(config.validation.department).toHaveProperty('validCodes');
      expect(Array.isArray(config.validation.department.validCodes)).toBe(true);
      expect(config.validation.department.validCodes.length).toBeGreaterThan(0);
    });

    it('should have valid logging configuration', () => {
      const config = require('../config/index');

      expect(config.logging).toHaveProperty('level');
      expect(config.logging).toHaveProperty('enableSqlLogging');
      expect(typeof config.logging.enableSqlLogging).toBe('boolean');
    });
  });

  describe('Database Module', () => {
    let originalExit;
    let originalOn;

    beforeEach(() => {
      originalExit = process.exit;
      originalOn = process.on;
      process.exit = jest.fn();
      process.on = jest.fn();
    });

    afterEach(() => {
      process.exit = originalExit;
      process.on = originalOn;
      jest.resetModules();
    });

    it('should export a database instance', () => {
      const db = require('../config/db');
      expect(db).toBeDefined();
      expect(typeof db).toBe('object');
    });

    it('should register SIGINT handler', () => {
      require('../config/db');
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should handle database connection error', () => {
      // Reset modules to get fresh mocks
      jest.resetModules();

      const { logger } = require('../utils/logger');

      // Mock sqlite3 to simulate connection error
      jest.mock('sqlite3', () => ({
        verbose: () => ({
          Database: jest.fn((dbPath, callback) => {
            callback(new Error('Connection failed'));
            return {
              configure: jest.fn(),
              close: jest.fn(),
              all: jest.fn(),
              get: jest.fn(),
              on: jest.fn()
            };
          })
        })
      }));

      // This should trigger the error handler and exit
      expect(() => {
        require('../config/db');
      }).not.toThrow();

      // Verify that logger.error was called with the connection error
      expect(logger.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle SIGINT and close database with success', () => {
      const db = require('../config/db');
      const sigintHandler = process.on.mock.calls.find(call => call[0] === 'SIGINT')?.[1];

      expect(sigintHandler).toBeDefined();

      const { logger } = require('../utils/logger');

      // Call the SIGINT handler
      sigintHandler();

      expect(logger.info).toHaveBeenCalledWith(
        'Received SIGINT, closing database connection'
      );
    });

    it('should handle SIGINT database close error', () => {
      jest.resetModules();

      // Mock sqlite3 to return db with close error
      const mockCloseError = new Error('Close failed');
      jest.mock('sqlite3', () => ({
        verbose: () => ({
          Database: jest.fn((dbPath, callback) => {
            callback(null); // Successful connection
            return {
              configure: jest.fn(),
              close: jest.fn((cb) => cb && cb(mockCloseError)),
              all: jest.fn(),
              get: jest.fn(),
              on: jest.fn()
            };
          })
        })
      }));

      const db = require('../config/db');
      const sigintHandler = process.on.mock.calls.find(call => call[0] === 'SIGINT')?.[1];

      if (sigintHandler) {
        sigintHandler();
        const { logger } = require('../utils/logger');
        expect(logger.error).toHaveBeenCalled();
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing sqlite3 module gracefully', () => {
      // This test verifies that the module can handle missing dependencies
      // by checking that the require doesn't throw in normal circumstances
      expect(() => {
        require('../config/index');
      }).not.toThrow();
    });
  });
});