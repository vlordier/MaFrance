const request = require('supertest');
const express = require('express');
const cacheRoutes = require('../routes/cacheRoutes');

// Mock cache service
jest.mock('../services/cacheService', () => ({
  getStats: jest.fn(),
  clear: jest.fn(),
  initializeCache: jest.fn()
}));

// Mock cache middleware
jest.mock('../middleware/cache', () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next())
}));

const cacheService = require('../services/cacheService');
const { cacheMiddleware } = require('../middleware/cache');

let app;

const createApp = () => {
  const newApp = express();
  newApp.use(express.json());
  newApp.use('/api/cache', cacheRoutes);
  return newApp;
};

describe('Cache Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/cache/stats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        hits: 100,
        misses: 50,
        size: 10
      };

      cacheService.getStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/cache/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
      expect(cacheService.getStats).toHaveBeenCalled();
    });

    it('should handle when cache service returns empty stats', async () => {
      cacheService.getStats.mockReturnValue({});

      const response = await request(app)
        .get('/api/cache/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
      expect(cacheService.getStats).toHaveBeenCalled();
    });

    it('should return cache statistics with detailed info', async () => {
      const mockStats = {
        hits: 500,
        misses: 100,
        size: 2048,
        evictions: 10,
        hitRate: 0.833
      };

      cacheService.getStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/cache/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
      expect(response.body.hits).toBe(500);
      expect(response.body.hitRate).toBe(0.833);
    });
  });

  describe('POST /api/cache/clear', () => {
    it('should clear cache successfully', async () => {
      const response = await request(app)
        .post('/api/cache/clear');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Cache cleared successfully' });
      expect(cacheService.clear).toHaveBeenCalled();
    });
  });

  describe('POST /api/cache/refresh', () => {
    it('should refresh cache successfully', async () => {
      cacheService.initializeCache.mockResolvedValue();

      const response = await request(app)
        .post('/api/cache/refresh');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Cache refreshed successfully' });
      expect(cacheService.initializeCache).toHaveBeenCalled();
    });

    it('should handle refresh errors', async () => {
      const errorMessage = 'Database error';
      cacheService.initializeCache.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post('/api/cache/refresh');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to refresh cache',
        details: errorMessage
      });
      expect(cacheService.initializeCache).toHaveBeenCalled();
    });
  });
});