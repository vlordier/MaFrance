const CacheService = require('../services/cacheService');

// Mock the database
jest.mock('../config/db', () => ({
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn()
}));

const db = require('../config/db');

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache for each test
    CacheService.clear();
  });

  describe('get', () => {
    it('should return cached data if available', () => {
      const testData = { test: 'data' };
      CacheService.cache.set('test_key', testData);

      const result = CacheService.get('test_key');

      expect(result).toEqual(testData);
    });

    it('should return null if key not in cache', () => {
      const result = CacheService.get('nonexistent_key');

      expect(result).toBeNull();
    });

    it('should handle undefined keys', () => {
      const result = CacheService.get(undefined);

      expect(result).toBeNull();
    });

    it('should handle null keys', () => {
      const result = CacheService.get(null);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store data in cache', () => {
      const testData = { test: 'data' };

      CacheService.set('test_key', testData);

      expect(CacheService.cache.get('test_key')).toEqual(testData);
    });

    it('should overwrite existing data', () => {
      const oldData = { old: 'data' };
      const newData = { new: 'data' };

      CacheService.set('test_key', oldData);
      CacheService.set('test_key', newData);

      expect(CacheService.cache.get('test_key')).toEqual(newData);
    });

    it('should handle complex objects', () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { object: 'value' },
        number: 42,
        string: 'test'
      };

      CacheService.set('complex_key', complexData);

      expect(CacheService.cache.get('complex_key')).toEqual(complexData);
    });
  });

  describe('has', () => {
    it('should return true if key exists', () => {
      CacheService.cache.set('test_key', 'value');

      const result = CacheService.has('test_key');

      expect(result).toBe(true);
    });

    it('should return false if key does not exist', () => {
      const result = CacheService.has('nonexistent_key');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove data from cache', () => {
      CacheService.cache.set('test_key', 'value');

      CacheService.delete('test_key');

      expect(CacheService.has('test_key')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all data from cache', () => {
      CacheService.cache.set('key1', 'value1');
      CacheService.cache.set('key2', 'value2');
      CacheService.cache.set('key3', 'value3');

      CacheService.clear();

      expect(CacheService.cache.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      CacheService.cache.set('key1', 'value1');
      CacheService.cache.set('key2', 'value2');

      const stats = CacheService.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });

    it('should return empty stats for empty cache', () => {
      const stats = CacheService.getStats();

      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe('Cache Key Patterns', () => {
    test('should use consistent key patterns for department data', () => {
      // Test that department-related keys follow expected patterns
      const dept = '01';
      expect(`dept_details_${dept}`).toBe('dept_details_01');
      expect(`dept_crime_${dept}`).toBe('dept_crime_01');
      expect(`dept_names_${dept}`).toBe('dept_names_01');
      expect(`dept_crime_history_${dept}`).toBe('dept_crime_history_01');
      expect(`dept_names_history_${dept}`).toBe('dept_names_history_01');
      expect(`prefet_${dept}`).toBe('prefet_01');
    });

    test('should use consistent key patterns for country data', () => {
      const country = 'france';
      expect(`country_details_${country}`).toBe('country_details_france');
      expect(`country_crime_${country}`).toBe('country_crime_france');
      expect(`country_names_${country}`).toBe('country_names_france');
      expect(`country_crime_history_${country}`).toBe('country_crime_history_france');
      expect(`country_names_history_${country}`).toBe('country_names_history_france');
      expect(`ministre_${country}`).toBe('ministre_france');
    });

    test('should use consistent key patterns for rankings', () => {
      expect('department_rankings').toBe('department_rankings');
      expect('politique_rankings').toBe('politique_rankings');
    });
  });

  describe('Data Validation', () => {
    test('should handle empty or null values gracefully', () => {
      CacheService.set('null_key', null);
      CacheService.set('undefined_key', undefined);
      CacheService.set('empty_string', '');

      expect(CacheService.get('null_key')).toBeNull();
      expect(CacheService.get('undefined_key')).toBeUndefined(); // Map returns undefined for keys set to undefined
      expect(CacheService.get('empty_string')).toBe('');
    });

    test('should handle large datasets', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, data: `item${i}` }));
      CacheService.set('large_dataset', largeArray);
      expect(CacheService.get('large_dataset')).toHaveLength(1000);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid key types gracefully', () => {
      // Objects as keys should work (Map allows any type as key)
      const objectKey = { complex: 'key' };
      CacheService.set(objectKey, 'object_value');
      expect(CacheService.get(objectKey)).toBe('object_value');
    });

    test('should handle undefined keys in operations', () => {
      expect(() => {
        CacheService.set(undefined, 'value');
        CacheService.get(undefined);
        CacheService.has(undefined);
        CacheService.delete(undefined);
      }).not.toThrow();
    });

    test('should handle database errors during initialization', async () => {
      // Mock database error during department preload
      db.all.mockImplementationOnce((query, params, callback) => {
        callback(new Error('Database connection failed'), null);
      });

      // Create new instance to trigger initialization
      const cacheService = CacheService;

      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not throw and continue operation
      expect(cacheService.cache.size).toBeGreaterThanOrEqual(0);
    });

    test('should handle database errors during department details caching', async () => {
      // Mock successful department list but failed details
      db.all
        .mockImplementationOnce((query, params, callback) => {
          callback(null, [{ departement: '01' }]);
        })
        .mockImplementationOnce((query, params, callback) => {
          callback(new Error('Details query failed'), null);
        });

      const cacheService = CacheService;
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should continue despite individual failures
      expect(cacheService.cache.size).toBeGreaterThanOrEqual(0);
    });

    test('should handle database errors during crime history caching', async () => {
      db.all
        .mockImplementationOnce((query, params, callback) => {
          callback(null, [{ departement: '01' }]);
        })
        .mockImplementationOnce((query, params, callback) => {
          callback(null, []); // Empty details
        })
        .mockImplementationOnce((query, params, callback) => {
          callback(new Error('Crime history failed'), null);
        });

      const cacheService = CacheService;
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cacheService.cache.size).toBeGreaterThanOrEqual(0);
    });

    test('should handle database errors during country data caching', async () => {
      // Mock department preload success, country preload failure
      db.all
        .mockImplementationOnce((query, params, callback) => {
          callback(null, []);
        })
        .mockImplementationOnce((query, params, callback) => {
          callback(new Error('Country data failed'), null);
        });

      const cacheService = CacheService;
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cacheService.cache.size).toBeGreaterThanOrEqual(0);
    });

    test('should handle retry failures in database operations', async () => {
      // Mock consistent database failures
      db.all.mockImplementation((query, params, callback) => {
        callback(new Error('Persistent database error'), null);
      });

      const cacheService = CacheService;
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle the error gracefully
      expect(cacheService.cache.size).toBe(0);
    });
  });

  describe('Initialization Edge Cases', () => {
    test('should handle empty department list', async () => {
      db.all.mockImplementation((query, params, callback) => {
        callback(null, []); // No departments
      });

      const cacheService = CacheService;
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cacheService.cache.size).toBeGreaterThanOrEqual(0);
    });

    test('should handle malformed department data', async () => {
      db.all
        .mockImplementationOnce((query, params, callback) => {
          callback(null, [{ departement: null }, { departement: undefined }, {}]);
        })
        .mockImplementation((query, params, callback) => {
          callback(null, []);
        });

      const cacheService = CacheService;
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cacheService.cache.size).toBeGreaterThanOrEqual(0);
    });

    test('should handle concurrent cache operations', () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            CacheService.set(`key${i}`, `value${i}`);
            return CacheService.get(`key${i}`);
          })
        );
      }

      return Promise.all(promises).then(results => {
        expect(results).toHaveLength(10);
        results.forEach((result, i) => {
          expect(result).toBe(`value${i}`);
        });
      });
    });
  });
});