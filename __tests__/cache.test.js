const { cacheMiddleware } = require('../middleware/cache');

// Mock the cache service
jest.mock('../services/cacheService', () => ({
  get: jest.fn(),
  set: jest.fn()
}));

const cacheService = require('../services/cacheService');

describe('Cache Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock request
    req = {
      query: { dept: '75' }
    };

    // Create mock response
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('cacheMiddleware function', () => {
    it('should return a function', () => {
      const middleware = cacheMiddleware(() => 'test-key');
      expect(typeof middleware).toBe('function');
    });

    it('should be a middleware that accepts req, res, next', () => {
      const middleware = cacheMiddleware(() => 'test-key');
      expect(middleware.length).toBe(3);
    });
  });

  describe('Cache middleware behavior', () => {
    it('should call getCacheKey function with request object', () => {
      const getCacheKeyFn = jest.fn(() => 'test-key');
      const middleware = cacheMiddleware(getCacheKeyFn);

      middleware(req, res, next);

      expect(getCacheKeyFn).toHaveBeenCalledWith(req);
    });

    it('should try to get cached data from cache service', () => {
      const getCacheKeyFn = jest.fn(() => 'dept:75');
      const middleware = cacheMiddleware(getCacheKeyFn);

      middleware(req, res, next);

      expect(cacheService.get).toHaveBeenCalledWith('dept:75');
    });

    it('should call next() to continue to next middleware', () => {
      const middleware = cacheMiddleware(() => 'test-key');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should not return cached data even if it exists (caching disabled)', () => {
      const cachedData = { data: 'cached' };
      cacheService.get.mockReturnValue(cachedData);

      const originalJson = jest.fn().mockReturnThis();
      res.json = originalJson;

      const middleware = cacheMiddleware(() => 'test-key');
      middleware(req, res, next);

      // With caching disabled (if (false) block), it should always call next()
      expect(next).toHaveBeenCalled();
      // Original json should not have been called immediately with cached data
      expect(originalJson).not.toHaveBeenCalledWith(cachedData);
    });

    it('should override res.json to cache results', () => {
      const middleware = cacheMiddleware(() => 'test-key');
      const originalJson = res.json;

      middleware(req, res, next);

      // res.json should have been replaced with a new function
      expect(res.json).not.toBe(originalJson);
    });

    it('should cache data when res.json is called', () => {
      const testData = { result: 'success', data: [1, 2, 3] };
      const middleware = cacheMiddleware(() => 'test-key');

      middleware(req, res, next);

      // Call the new res.json function
      res.json(testData);

      // Cache service should have been called with the data
      expect(cacheService.set).toHaveBeenCalledWith('test-key', testData);
    });

    it('should call original res.json after caching', () => {
      const testData = { result: 'success' };
      const originalJsonMock = jest.fn().mockReturnThis();
      res.json = originalJsonMock;

      const middleware = cacheMiddleware(() => 'test-key');
      middleware(req, res, next);

      // Get the overridden json function
      const overriddenJson = res.json;

      // Reset the mock to get the original
      res.json = originalJsonMock;

      // Call the overridden json
      overriddenJson.call(res, testData);

      // Original json should have been called
      expect(originalJsonMock).toHaveBeenCalledWith(testData);
    });

    it('should generate cache key based on different request parameters', () => {
      const getCacheKeyFn = jest.fn((req) => `dept:${req.query.dept}:limit:${req.query.limit || 20}`);
      const middleware = cacheMiddleware(getCacheKeyFn);

      req.query.limit = 50;
      middleware(req, res, next);

      expect(getCacheKeyFn).toHaveBeenCalledWith(req);
      expect(cacheService.get).toHaveBeenCalledWith('dept:75:limit:50');
    });

    it('should handle cache key function that returns empty string', () => {
      const getCacheKeyFn = jest.fn(() => '');
      const middleware = cacheMiddleware(getCacheKeyFn);

      middleware(req, res, next);

      expect(cacheService.get).toHaveBeenCalledWith('');
    });

    it('should handle multiple calls to res.json independently', () => {
      const middleware = cacheMiddleware(() => 'test-key');

      middleware(req, res, next);
      const overriddenJson = res.json;

      // First call
      overriddenJson.call(res, { data: 'first' });
      expect(cacheService.set).toHaveBeenLastCalledWith('test-key', { data: 'first' });

      jest.clearAllMocks();

      // Second call
      overriddenJson.call(res, { data: 'second' });
      expect(cacheService.set).toHaveBeenCalledWith('test-key', { data: 'second' });
    });

    it('should work with complex cache key functions', () => {
      const getCacheKeyFn = jest.fn((req) => {
        const parts = ['cache'];
        if (req.query.dept) parts.push(`dept:${req.query.dept}`);
        if (req.query.limit) parts.push(`limit:${req.query.limit}`);
        return parts.join(':');
      });

      const middleware = cacheMiddleware(getCacheKeyFn);

      req.query = { dept: '75', limit: 100 };
      middleware(req, res, next);

      expect(cacheService.get).toHaveBeenCalledWith('cache:dept:75:limit:100');
    });

    it('should preserve the response chain when calling overridden json', () => {
      const middleware = cacheMiddleware(() => 'test-key');

      middleware(req, res, next);
      const overriddenJson = res.json;

      // The overridden json should return this (the response object)
      const result = overriddenJson.call(res, { data: 'test' });
      expect(result).toBe(res);
    });
  });
});
