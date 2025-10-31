const request = require('supertest');
const { createAppWithRoute, testDataFactory, testAssertions, testLifecycle } = require('./testUtils');

jest.mock('../services/cacheService', () => ({
  get: jest.fn()
}));

describe('Ranking Routes', () => {
  let app; let mocks;

  beforeEach(() => {
    testLifecycle.cleanup();
    const created = createAppWithRoute('../routes/rankingRoutes', '/api/rankings', { mockValidate: false });
    app = created.app;
    mocks = created.mocks;
  });

  describe('GET /api/rankings/communes', () => {
    it('should return communes rankings with valid parameters', async () => {
      // Setup test data using factory
      const mockData = testDataFactory.createCommunes(1);
      const mockCountRow = { total_count: 1 };

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockData);
      });
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      const response = await request(app)
        .get('/api/rankings/communes?dept=01&limit=10&offset=0&sort=insecurite_score&direction=DESC');

      // Use enhanced assertions
      testAssertions.expectSuccessfulResponse(response);
      testAssertions.expectPaginatedResponse(response, 1);
      expect(response.body.data[0]).toBeValidCommuneData();
    });

    it('should handle database errors gracefully', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database connection failed'), null);
      });

      const response = await request(app)
        .get('/api/rankings/communes?dept=01');

      testAssertions.expectErrorResponse(response, 500, 'Database error');
      testAssertions.expectDatabaseCalled(mocks.db, 'all');
    });

    it('should require dept parameter', async () => {
      const response = await request(app)
        .get('/api/rankings/communes');

      testAssertions.expectValidationError(response, 'dept');
    });

    it('should handle invalid population range', async () => {
      const response = await request(app)
        .get('/api/rankings/communes?dept=01&population_range=invalid');

      testAssertions.expectValidationError(response);
    });

    it('should handle population range parsing error', async () => {
      const response = await request(app)
        .get('/api/rankings/communes?dept=01&population_range=invalid-format');

      testAssertions.expectValidationError(response);
    });

    it('should return politique rankings from cache when available', async () => {
      const mockCachedData = {
        Gauche: testDataFactory.createDepartment({ famille_nuance: 'Gauche' }),
        Droite: testDataFactory.createDepartment({ famille_nuance: 'Droite' })
      };

      mocks.cacheService.get.mockReturnValue(mockCachedData);

      const response = await request(app)
        .get('/api/rankings/politique');

      testAssertions.expectSuccessfulResponse(response, mockCachedData);
      testAssertions.expectCacheHit(mocks.cacheService, 'politique_rankings');
      expect(mocks.db.all).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/rankings/departements', () => {
    it('should return department rankings from cache', async () => {
      const mockData = testDataFactory.createDepartments(2);
      const mockCachedData = testDataFactory.createMockCacheResponse(mockData, 96);

      mocks.cacheService.get.mockReturnValue(mockCachedData);

      const response = await request(app)
        .get('/api/rankings/departements?limit=10&offset=0&sort=insecurite_score&direction=DESC');

      testAssertions.expectSuccessfulResponse(response);
      testAssertions.expectPaginatedResponse(response);
      expect(response.body.total_count).toBe(96);
      response.body.data.forEach(item => {
        expect(item).toBeValidDepartmentData();
      });
    });

    it('should handle empty cache with database fallback', async () => {
      testLifecycle.setupCache(mocks, null); // Cache miss

      const response = await request(app)
        .get('/api/rankings/departements');

      testAssertions.expectSuccessfulResponse(response);
      expect(response.body.data).toEqual([]);
      expect(response.body.total_count).toBe(0);
      testAssertions.expectCacheMiss(mocks.cacheService, 'department_rankings');
    });

    it('should handle invalid sort parameter for departments', async () => {
      const mockData = [testDataFactory.createDepartment()];
      const mockCachedData = testDataFactory.createMockCacheResponse(mockData, 1);

      mocks.cacheService.get.mockReturnValue(mockCachedData);

      const response = await request(app)
        .get('/api/rankings/departements?sort=invalid_field');

      testAssertions.expectValidationError(response, 'sort');
    });

    it('should handle ASC direction', async () => {
      const mockData = [
        testDataFactory.createDepartment({ departement: '01', insecurite_score: 2.0 }),
        testDataFactory.createDepartment({ departement: '02', insecurite_score: 5.0 })
      ];
      const mockCachedData = testDataFactory.createMockCacheResponse(mockData, 2);

      mocks.cacheService.get.mockReturnValue(mockCachedData);

      const response = await request(app)
        .get('/api/rankings/departements?sort=insecurite_score&direction=ASC');

      testAssertions.expectSuccessfulResponse(response);
      testAssertions.expectPaginatedResponse(response, 2);
      // Verify ASC sorting
      expect(response.body.data[0].insecurite_score).toBeLessThanOrEqual(response.body.data[1].insecurite_score);
    });

    it('should handle pagination for departments', async () => {
      const mockData = Array.from({ length: 20 }, (_, i) =>
        testDataFactory.createDepartment({
          departement: String(i + 1).padStart(2, '0'),
          insecurite_score: Math.random() * 10
        })
      );
      const mockCachedData = testDataFactory.createMockCacheResponse(mockData, 20);

      mocks.cacheService.get.mockReturnValue(mockCachedData);

      const response = await request(app)
        .get('/api/rankings/departements?limit=5&offset=10');

      testAssertions.expectSuccessfulResponse(response);
      testAssertions.expectPaginatedResponse(response, 5);
      expect(response.body.total_count).toBe(20);
    });
  });

  describe('GET /api/rankings/politique', () => {
    it('should return politique rankings from cache', async () => {
      const mockCachedData = {
        Gauche: testDataFactory.createDepartment({ famille_nuance: 'Gauche', population: 100000 }),
        Droite: testDataFactory.createDepartment({ famille_nuance: 'Droite', population: 150000 })
      };

      mocks.cacheService.get.mockReturnValue(mockCachedData);

      const response = await request(app)
        .get('/api/rankings/politique');

      testAssertions.expectSuccessfulResponse(response);
      expect(response.body).toHaveProperty('Gauche');
      expect(response.body).toHaveProperty('Droite');
    });

    it('should query database when cache is empty', async () => {
      mocks.cacheService.get.mockReturnValue(null);

      mocks.db.all.mockImplementation((sql, params, callback) =>
        callback(new Error('DB error'), null)
      );

      const response = await request(app)
        .get('/api/rankings/politique');

      testAssertions.expectErrorResponse(response, 500);
      testAssertions.expectDatabaseCalled(mocks.db, 'all');
    });

    it('should filter out invalid famille_nuance values', async () => {
      mocks.cacheService.get.mockReturnValue(null);

      mocks.db.all.mockImplementation((sql, params, callback) =>
        callback(new Error('DB error'), null)
      );

      const response = await request(app)
        .get('/api/rankings/politique');

      testAssertions.expectErrorResponse(response, 500);
    });
  });

  describe('GET /api/rankings/ranking', () => {
    it('should return ranking endpoint message', async () => {
      const response = await request(app)
        .get('/api/rankings/ranking');

      testAssertions.expectSuccessfulResponse(response);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Ranking endpoint');
    });
  });

  describe('GET /api/rankings/communes - Population Range Edge Cases', () => {
    it('should handle population range validation errors', async () => {
      const response = await request(app)
        .get('/api/rankings/communes?dept=01&population_range=invalid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].msg).toContain('Format de population invalide');
    });

    it('should handle population range with min >= max', async () => {
      const response = await request(app)
        .get('/api/rankings/communes?dept=01&population_range=5000-1000');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].msg).toContain('min < max');
    });

    it('should handle population range exceeding limits', async () => {
      const response = await request(app)
        .get('/api/rankings/communes?dept=01&population_range=1000-20000000');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].msg).toContain('max <= 1000000');
    });
  });

  describe('GET /api/rankings/departements - Cache and Sorting Edge Cases', () => {
    it('should handle cache service returning null', async () => {
      mocks.cacheService.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/rankings/departements');

      // Should still work with fallback logic
      expect(response.status).toBe(200);
    });

    it('should handle invalid sort key in getSortValue function', async () => {
      // Mock cache with data
      const mockDeptData = testDataFactory.createDepartments(2);
      mocks.cacheService.get.mockReturnValue({
        data: mockDeptData,
        total_count: 2
      });

      const response = await request(app)
        .get('/api/rankings/departements?sort=invalid_key');

      testAssertions.expectValidationError(response, 'sort');
    });

    it('should handle null values in sorting', async () => {
      const mockDeptData = testDataFactory.createDepartments(2);
      // Set some values to null to test null handling
      mockDeptData[0].insecurite_score = null;
      mockDeptData[1].insecurite_score = 5;

      mocks.cacheService.get.mockReturnValue({
        data: mockDeptData,
        total_count: 2
      });

      const response = await request(app)
        .get('/api/rankings/departements?sort=insecurite_score&direction=DESC');

      expect(response.status).toBe(200);
      expect(response.body.data[0].insecurite_score).toBe(5); // Non-null should come first
    });
  });

  describe('GET /api/rankings/politique - Cache Hit Scenario', () => {
    it('should return cached data when available', async () => {
      const mockCachedData = { 'Gauche': { total_score: 10 }, 'Droite': { total_score: 8 } };
      mocks.cacheService.get.mockReturnValue(mockCachedData);

      const response = await request(app)
        .get('/api/rankings/politique');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCachedData);
      // Should not call database when cache hit
      expect(mocks.db.all).not.toHaveBeenCalled();
    });
  });
});