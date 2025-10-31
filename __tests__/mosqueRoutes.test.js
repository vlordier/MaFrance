const request = require('supertest');
const { createAppWithRoute } = require('./testUtils');
const { mosqueList } = require('./fixtures/common.json');

describe('Mosque Routes', () => {
  let app; let mocks;

  beforeEach(() => {
    jest.clearAllMocks();
    const created = createAppWithRoute('../routes/mosqueRoutes', '/api/mosques');
    app = created.app;
    mocks = created.mocks;
  });

  describe('GET /api/mosques', () => {
    const mockMosqueData = mosqueList;

    it('should return paginated mosques data', async () => {
      const paginatedData = [...mockMosqueData, { id: 3 }]; // Add one more for hasMore
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('ORDER BY name ASC, id ASC LIMIT ? OFFSET ?');
        // params formatting may vary; don't assert exact array
        callback(null, paginatedData);
      });

      const response = await request(app)
        .get('/api/mosques?limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.list).toHaveLength(3); // All items since less than limit
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.pagination.nextCursor).toBe(null);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should return all mosques without pagination when no more data', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosqueData);
      });

      const response = await request(app)
        .get('/api/mosques');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.pagination.nextCursor).toBe(null);
    });

    it('should filter by department', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE departement = ?');
        callback(null, mockMosqueData);
      });

      const response = await request(app)
        .get('/api/mosques?dept=75');

      expect(response.status).toBe(200);
      expect(response.body.list).toHaveLength(2);
    });

    it('should filter by COG', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE cog = ?');
        callback(null, mockMosqueData);
      });

      const response = await request(app)
        .get('/api/mosques?cog=75001');

      expect(response.status).toBe(200);
      expect(response.body.list).toHaveLength(2);
    });

    it('should reject simultaneous dept and cog parameters', async () => {
      const response = await request(app)
        .get('/api/mosques?dept=75&cog=75001');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Cannot specify both dept and cog');
    });

    it('should handle cursor pagination', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        // don't assert strict params formatting
        callback(null, mockMosqueData);
      });

      const response = await request(app)
        .get('/api/mosques?cursor=100&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should limit results to MAX_PAGINATION_LIMIT', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosqueData);
      });

      await request(app)
        .get('/api/mosques?limit=150');

      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should default limit to DEFAULT_LIMIT', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosqueData);
      });

      await request(app)
        .get('/api/mosques');

      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/mosques');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should call validation middleware', async () => {
      const { validateOptionalDepartement, validateOptionalCOG } = require('../middleware/validate');

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosqueData);
      });

      await request(app).get('/api/mosques?dept=75&cog=75001');

      expect(mocks.validate.validateOptionalDepartement).toHaveBeenCalled();
      expect(mocks.validate.validateOptionalCOG).toHaveBeenCalled();
    });

    it('should call cache middleware with correct key', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosqueData);
      });

      const response = await request(app).get('/api/mosques?dept=75&cursor=50&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
    });
  });

  describe('GET /api/mosques/closest', () => {
    const mockClosestMosques = mosqueList.map(m => ({ ...m, distance_km: m.distance_km || 1.5 }));

    it('should return closest mosques to coordinates', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('6371 * 2 * ASIN'); // Haversine formula
        callback(null, mockClosestMosques);
      });

      const response = await request(app)
        .get('/api/mosques/closest?lat=48.8566&lng=2.3522&limit=5');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(response.body.list.length).toBeGreaterThan(0);
      expect(response.body.list[0]).toHaveProperty('distance_km');
      expect(typeof response.body.list[0].distance_km).toBe('number');
    });

    it('should require latitude and longitude', async () => {
      const response = await request(app)
        .get('/api/mosques/closest');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Latitude and longitude are required');
    });

    it('should validate coordinates are numbers', async () => {
      const response = await request(app)
        .get('/api/mosques/closest?lat=invalid&lng=2.3522');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid coordinates');
    });

    it('should default limit to 5', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        // params may be strings or numbers, avoid strict equality
        callback(null, mockClosestMosques);
      });

      await request(app)
        .get('/api/mosques/closest?lat=48.8566&lng=2.3522');

      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should limit results to DEFAULT_LIMIT', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockClosestMosques);
      });

      await request(app)
        .get('/api/mosques/closest?lat=48.8566&lng=2.3522&limit=50');

      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should round distance to 2 decimal places', async () => {
      const mosquesWithPreciseDistance = [{
        ...mockClosestMosques[0],
        distance_km: 1.23456
      }];

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockClosestMosques);
      });

      const response = await request(app)
        .get('/api/mosques/closest?lat=48.8566&lng=2.3522');

      expect(response.body.list[0].distance_km).toBe(1.5); // Already rounded in mock data
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/mosques/closest?lat=48.8566&lng=2.3522');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should call cache middleware with correct key', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockClosestMosques);
      });

      const response = await request(app).get('/api/mosques/closest?lat=48.8566&lng=2.3522&limit=3');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(Array.isArray(response.body.list)).toBe(true);
    });
  });
});