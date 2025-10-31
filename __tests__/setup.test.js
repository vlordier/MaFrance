// Mock dependencies
const mockDatabase = jest.fn();
const mockSqlite3 = {
  verbose: jest.fn(() => ({
    Database: mockDatabase
  })),
  Database: mockDatabase
};

jest.mock('sqlite3', () => mockSqlite3);

const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn()
};

jest.mock('fs', () => mockFs);

const mockPath = {
  dirname: jest.fn()
};

jest.mock('path', () => mockPath);

jest.mock('../config', () => ({
  database: {
    path: '/test/path/database.db'
  }
}));

const { initializeDatabase, createSearchIndexes } = require('../setup');

describe('setup.js', () => {
  const mockConfig = require('../config');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initializeDatabase', () => {
    it('should create database directory if it does not exist', () => {
      const mockDb = { test: 'db' };
      mockDatabase.mockReturnValue(mockDb);

      mockPath.dirname.mockReturnValue('/test/path');
      mockFs.existsSync.mockReturnValue(false);

      const result = initializeDatabase();

      expect(mockFs.existsSync).toHaveBeenCalledWith('/test/path');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/path', { recursive: true });
      expect(mockDatabase).toHaveBeenCalledWith(mockConfig.database.path);
      expect(result).toBe(mockDb);
    });

    it('should remove existing database file', () => {
      const mockDb = { test: 'db' };
      mockDatabase.mockReturnValue(mockDb);

      mockPath.dirname.mockReturnValue('/test/path');
      mockFs.existsSync.mockReturnValueOnce(true); // Directory exists
      mockFs.existsSync.mockReturnValueOnce(true); // File exists

      const result = initializeDatabase();

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(mockConfig.database.path);
      expect(mockDatabase).toHaveBeenCalledWith(mockConfig.database.path);
      expect(result).toBe(mockDb);
    });

    it('should exit process if database file cannot be removed', () => {
      const mockDb = { test: 'db' };
      mockSqlite3.Database.mockReturnValue(mockDb);

      mockPath.dirname.mockReturnValue('/test/path');
      mockFs.existsSync.mockReturnValueOnce(true); // Directory exists
      mockFs.existsSync.mockReturnValueOnce(true); // File exists
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Cannot remove file');
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      initializeDatabase();
      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it('should not create directory if it already exists', () => {
      const mockDb = { test: 'db' };
      mockDatabase.mockReturnValue(mockDb);

      mockPath.dirname.mockReturnValue('/test/path');
      mockFs.existsSync.mockReturnValueOnce(true); // Directory exists
      mockFs.existsSync.mockReturnValueOnce(false); // File doesn't exist

      const result = initializeDatabase();

      expect(mockFs.existsSync).toHaveBeenCalledWith('/test/path');
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      expect(mockDatabase).toHaveBeenCalledWith(mockConfig.database.path);
      expect(result).toBe(mockDb);
    });

    it('should not remove database file if it does not exist', () => {
      const mockDb = { test: 'db' };
      mockDatabase.mockReturnValue(mockDb);

      mockPath.dirname.mockReturnValue('/test/path');
      mockFs.existsSync.mockReturnValueOnce(true); // Directory exists
      mockFs.existsSync.mockReturnValueOnce(false); // File doesn't exist

      const result = initializeDatabase();

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(mockDatabase).toHaveBeenCalledWith(mockConfig.database.path);
      expect(result).toBe(mockDb);
    });
  });

  describe('createSearchIndexes', () => {
    it('should create all search indexes successfully', async () => {
      const mockDb = {
        run: jest.fn((query, callback) => {
          callback(null); // Success
        }),
        close: jest.fn()
      };
      const MockDatabase = jest.fn(() => mockDb);
      mockSqlite3.verbose.mockReturnValue({ Database: MockDatabase });

      await createSearchIndexes();

      expect(MockDatabase).toHaveBeenCalledWith(mockConfig.database.path);
      expect(mockDb.run).toHaveBeenCalledTimes(3);
      expect(mockDb.run).toHaveBeenCalledWith('CREATE INDEX IF NOT EXISTS idx_locations_commune ON locations(commune)', expect.any(Function));
      expect(mockDb.run).toHaveBeenCalledWith('CREATE INDEX IF NOT EXISTS idx_locations_dept_commune ON locations(departement, commune)', expect.any(Function));
      expect(mockDb.run).toHaveBeenCalledWith('CREATE INDEX IF NOT EXISTS idx_locations_search ON locations(commune COLLATE NOCASE)', expect.any(Function));
      expect(mockDb.close).toHaveBeenCalledTimes(1);
    });

    it('should reject if any index creation fails', async () => {
      const mockDb = {
        run: jest.fn((query, callback) => {
          if (query.includes('commune')) {
            callback(new Error('Index creation failed'));
          } else {
            callback(null);
          }
        }),
        close: jest.fn()
      };
      const MockDatabase = jest.fn(() => mockDb);
      mockSqlite3.verbose.mockReturnValue({ Database: MockDatabase });

      await expect(createSearchIndexes()).rejects.toThrow('Index creation failed');

      expect(mockDb.close).not.toHaveBeenCalled();
    });

    it('should handle mixed success and failure', async () => {
      let callCount = 0;
      const mockDb = {
        run: jest.fn((query, callback) => {
          callCount++;
          if (callCount === 2) {
            callback(new Error('Second index failed'));
          } else {
            callback(null);
          }
        }),
        close: jest.fn()
      };
      const MockDatabase = jest.fn(() => mockDb);
      mockSqlite3.verbose.mockReturnValue({ Database: MockDatabase });

      await expect(createSearchIndexes()).rejects.toThrow('Second index failed');

      expect(mockDb.run).toHaveBeenCalledTimes(3); // All three are called asynchronously
      expect(mockDb.close).not.toHaveBeenCalled();
    });
  });
});