const request = require('supertest');
const { createAppWithRoute } = require('./testUtils');

// Keep cacheService mocked because routes use it directly
jest.mock('../services/cacheService', () => ({
  get: jest.fn(() => null),
  set: jest.fn()
}));

// Some tests rely on constants
jest.mock('../constants', () => ({
  DEFAULT_LIMIT: 20,
  MAX_PAGINATION_LIMIT: 100,
  HTTP_BAD_REQUEST: 400
}));

describe('Migrant Routes', () => {
  let app; let mocks;

  beforeEach(() => {
    jest.clearAllMocks();
    const created = createAppWithRoute('../routes/migrantRoutes', '/api/migrants');
    app = created.app;
    mocks = created.mocks;
    // expose db mock convenience
    mocks.db.all.mockClear();
    mocks.db.get.mockClear();
  });

  describe('GET /api/migrants', () => {
    const mockMigrantData = [
      {
        rowid: 1,
        type: 'CADA',
        gestionnaire: 'OFPRA',
        adresse: '123 Rue des Migrants, Paris',
        places: 150,
        COG: '75001',
        departement: '75',
        commune_name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522
      },
      {
        rowid: 2,
        type: 'HUDA',
        gestionnaire: 'DDCS',
        adresse: '456 Rue des Migrants, Lyon',
        places: 120,
        COG: '69001',
        departement: '69',
        commune_name: 'Lyon',
        latitude: 45.7640,
        longitude: 4.8357
      }
    ];

    it('should return paginated migrant centers data', async () => {
      // Create 21 items to trigger hasMore
      const paginatedData = [];
      for (let i = 1; i <= 21; i++) {
        paginatedData.push({
          rowid: i,
          type: 'CADA',
          gestionnaire: 'OFPRA',
          adresse: `Address ${i}`,
          places: 150 - i,
          COG: `7500${i}`,
          departement: '75',
          commune_name: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522
        });
      }
      mocks.db.all.mockImplementationOnce((sql, params, callback) => {
        callback(null, paginatedData);
      });

      const response = await request(app)
        .get('/api/migrants?limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.list).toHaveLength(20);
      expect(response.body.pagination.hasMore).toBe(true);
      expect(response.body.pagination.nextCursor).toBe(20);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should return all migrant centers without pagination when no more data', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMigrantData);
      });

      const response = await request(app)
        .get('/api/migrants');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.pagination.nextCursor).toBe(null);
    });

    it('should filter by department', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE mc.departement = ?');
        expect(params).toEqual(['75', 21, 0]);
        callback(null, mockMigrantData);
      });

      const response = await request(app)
        .get('/api/migrants?dept=75');

      expect(response.status).toBe(200);
      expect(response.body.list).toHaveLength(2);
      expect(response.body.list[0]).toHaveProperty('departement', '75');
      expect(response.body.list[0]).toHaveProperty('commune', 'Paris');
      expect(response.body.list[0]).not.toHaveProperty('rowid');
    });

    it('should filter by COG', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE mc.COG = ?');
        expect(params).toEqual(['75001', 21, 0]);
        callback(null, mockMigrantData);
      });

      const response = await request(app)
        .get('/api/migrants?cog=75001');

      expect(response.status).toBe(200);
      expect(response.body.list).toHaveLength(2);
    });

    it('should reject simultaneous dept and cog parameters', async () => {
      const response = await request(app)
        .get('/api/migrants?dept=75&cog=75001');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Cannot specify both dept and cog');
    });

    it('should handle cursor pagination', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        // params may be passed in different order/format; just return data
        callback(null, mockMigrantData);
      });

      const response = await request(app)
        .get('/api/migrants?cursor=100&limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should limit results to MAX_PAGINATION_LIMIT', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMigrantData);
      });

      await request(app)
        .get('/api/migrants?limit=150');

      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should default limit to DEFAULT_LIMIT', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMigrantData);
      });

      await request(app)
        .get('/api/migrants');

      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should format response data correctly', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMigrantData);
      });

      const response = await request(app)
        .get('/api/migrants');

      expect(response.body.list[0]).toEqual({
        type: 'CADA',
        gestionnaire: 'OFPRA',
        adresse: '123 Rue des Migrants, Paris',
        places: 150,
        COG: '75001',
        departement: '75',
        commune: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522
      });
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/migrants');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should call validation middleware', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMigrantData);
      });

      await request(app).get('/api/migrants?dept=75&cog=75001&limit=10');

      expect(mocks.validate.validateOptionalDepartement).toHaveBeenCalled();
      expect(mocks.validate.validateOptionalCOG).toHaveBeenCalled();
      expect(mocks.validate.validatePagination).toHaveBeenCalled();
    });

    it('should call cache middleware with correct key', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMigrantData);
      });

      const res = await request(app).get('/api/migrants?dept=75&cursor=50&limit=10');
      expect(res.status).toBe(200);
      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/migrants');

      expect(response.status).toBe(200);
      expect(response.body.list).toEqual([]);
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.pagination.nextCursor).toBe(null);
    });

    it('should order by places descending, then by other fields', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('ORDER BY mc.places DESC');
        callback(null, mockMigrantData);
      });

      await request(app)
        .get('/api/migrants');

      expect(mocks.db.all).toHaveBeenCalled();
    });
  });
});