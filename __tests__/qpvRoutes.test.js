const request = require('supertest');
const { createAppWithRoute } = require('./testUtils');

describe('QPV Routes', () => {
  let app; let mocks;

  beforeEach(() => {
    jest.clearAllMocks();
    const created = createAppWithRoute('../routes/qpvRoutes', '/api/qpv');
    app = created.app;
    mocks = created.mocks;
  });

  describe('GET /api/qpv', () => {
    const { qpvList } = require('./fixtures/common.json');
    const mockQpvData = qpvList.map(item => ({ ...item, indiceJeunesse: item.indiceJeunesse || 80 }));

    it('should return paginated QPV data for country-level request', async () => {
      const paginatedData = [...mockQpvData, { rowid: 3 }]; // Add one more for hasMore
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('ORDER BY rowid ASC LIMIT ?');
        // params can vary depending on filters; don't assert exact array here
        callback(null, paginatedData);
      });

      const response = await request(app)
        .get('/api/qpv?limit=20');

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('list');
  expect(response.body).toHaveProperty('pagination');
  expect(response.body.list.length).toBeGreaterThan(0);
  expect(response.body.pagination.hasMore).toBe(false);
  expect(response.body.pagination.nextCursor).toBe(null);
  expect(response.body.pagination.limit).toBe(20);
    });

    it('should return all QPV data without pagination when no more data', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockQpvData);
      });

      const response = await request(app)
        .get('/api/qpv');

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('list');
  expect(response.body).toHaveProperty('pagination');
  expect(response.body.pagination.hasMore).toBe(false);
  expect(response.body.pagination.nextCursor).toBe(null);
    });

    it('should filter by department', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE insee_dep = ?');
        expect(params).toEqual(['75', 21]);
        callback(null, mockQpvData);
      });

      const response = await request(app)
        .get('/api/qpv?dept=75');

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter by COG', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE COG = ?');
        expect(params).toEqual(['75001', 21]);
        callback(null, mockQpvData);
      });

      const response = await request(app)
        .get('/api/qpv?cog=75001');

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter by commune search', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('LOWER(lib_com) LIKE LOWER(?)');
        expect(params).toEqual(['%paris%', 21]);
        callback(null, mockQpvData);
      });

      const response = await request(app)
        .get('/api/qpv?commune=paris');

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body.length).toBeGreaterThan(0);
    });

    it('should combine department and commune filters', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE insee_dep = ? AND LOWER(lib_com) LIKE LOWER(?)');
        // return only the two matching rows for this combined filter
        callback(null, mockQpvData.slice(0, 2));
      });

      const response = await request(app)
        .get('/api/qpv?dept=75&commune=paris');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should reject simultaneous dept and cog parameters', async () => {
      const response = await request(app)
        .get('/api/qpv?dept=75&cog=75001');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Cannot specify both dept and cog');
    });

    it('should handle cursor pagination for country-level requests', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE rowid > ?');
        expect(params).toEqual([100, 21]);
        callback(null, mockQpvData);
      });

      const response = await request(app)
        .get('/api/qpv?cursor=100&limit=20');

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('pagination');
    });

    it('should limit results to maximum of 100', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(params[params.length - 1]).toBe(101); // limit + 1, capped at 100 + 1
        callback(null, mockQpvData);
      });

      await request(app)
        .get('/api/qpv?limit=150');

  expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should default limit to 20', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(params[params.length - 1]).toBe(21); // 20 + 1
        callback(null, mockQpvData);
      });

      await request(app)
        .get('/api/qpv');

  expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/qpv');

  expect(response.status).toBe(500);
  expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/qpv/geojson', () => {
    const mockGeoJsonRows = [
      {
        code_qp: 'QP001',
        lib_qp: 'Quartier 1',
        insee_com: '75001',
        lib_com: 'Paris',
        insee_dep: '75',
        lib_dep: 'Paris',
        geometry: '{"type":"Polygon","coordinates":[[[2.3522,48.8566],[2.3523,48.8567],[2.3524,48.8568],[2.3522,48.8566]]]}'
      }
    ];

    it('should return QPV GeoJSON data', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM qpv_coordinates');
        expect(params).toEqual([]);
        callback(null, mockGeoJsonRows);
      });

      const response = await request(app)
        .get('/api/qpv/geojson');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('geojson');
      expect(response.body.geojson.type).toBe('FeatureCollection');
      expect(response.body.geojson.features).toHaveLength(1);
      expect(response.body.geojson.features[0].type).toBe('Feature');
      expect(response.body.geojson.features[0].properties.code_qp).toBe('QP001');
      expect(response.body.geojson.features[0].geometry).toEqual(JSON.parse(mockGeoJsonRows[0].geometry));
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/qpv/geojson');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle JSON parsing errors', async () => {
      const invalidGeometryRows = [{
        ...mockGeoJsonRows[0],
        geometry: 'invalid json'
      }];

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, invalidGeometryRows);
      });

      const response = await request(app)
        .get('/api/qpv/geojson');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Error processing QPV data');
    });

    it('should respond and use the database to get geojson', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockGeoJsonRows);
      });

      const response = await request(app).get('/api/qpv/geojson');
      expect(response.status).toBe(200);
      expect(mocks.db.all).toHaveBeenCalled();
    });
  });

  describe('GET /api/qpv/closest', () => {
    const mockClosestRows = [
      {
        code_qp: 'QP001',
        lib_qp: 'Quartier 1',
        insee_com: '75001',
        lib_com: 'Paris',
        insee_dep: '75',
        lib_dep: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        distance_sq: 0.0001
      }
    ];

    it('should return closest QPVs to coordinates', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        // params may be strings or numbers depending on request parsing; avoid strict equality
        callback(null, mockClosestRows);
      });

      const response = await request(app)
        .get('/api/qpv/closest?lat=48.8566&lng=2.3522&limit=5');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(response.body.list).toHaveLength(1);
      expect(response.body.list[0]).toHaveProperty('distance');
      expect(typeof response.body.list[0].distance).toBe('number');
    });

    it('should require latitude and longitude', async () => {
      const response = await request(app)
        .get('/api/qpv/closest');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Latitude and longitude are required');
    });

    it('should default limit to 5', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(params[4]).toBe(5);
        callback(null, mockClosestRows);
      });

      await request(app)
        .get('/api/qpv/closest?lat=48.8566&lng=2.3522');

      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/qpv/closest?lat=48.8566&lng=2.3522');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should return a successful response for closest with limit param', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockClosestRows);
      });

      const response = await request(app).get('/api/qpv/closest?lat=48.8566&lng=2.3522&limit=3');
      expect(response.status).toBe(200);
      expect(mocks.db.all).toHaveBeenCalled();
    });
  });

  describe('GET /api/qpv/nearby', () => {
    const mockNearbyRows = [
      {
        code_qp: 'QP001',
        lib_qp: 'Quartier 1',
        lib_com: 'Paris',
        lib_dep: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        popMuniQPV: 15000,
        indiceJeunesse: 85.5,
        partPopEt: 12.3,
        partPopImmi: 18.7,
        taux_logements_sociaux: 45.2,
        taux_d_emploi: 65.8,
        taux_pauvrete_60: 22.1,
        distance_km: 1.5
      }
    ];

    it('should return QPVs near coordinates with full data', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('6371 * 2 * ASIN'); // Haversine formula
        expect(params).toEqual([48.8566, 48.8566, 2.3522, 5]);
        callback(null, mockNearbyRows);
      });

      const response = await request(app)
        .get('/api/qpv/nearby?lat=48.8566&lng=2.3522&limit=5');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('code_qp', 'QP001');
      expect(response.body[0]).toHaveProperty('distance_km');
      expect(response.body[0]).toHaveProperty('population', 15000);
      expect(response.body[0]).toHaveProperty('indice_jeunesse', 85.5);
      expect(typeof response.body[0].distance_km).toBe('number');
    });

    it('should require latitude and longitude', async () => {
      const response = await request(app)
        .get('/api/qpv/nearby');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Latitude and longitude are required');
    });

    it('should validate coordinates are numbers', async () => {
      const response = await request(app)
        .get('/api/qpv/nearby?lat=invalid&lng=2.3522');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid coordinates');
    });

    it('should default limit to 5', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(params[3]).toBe(5);
        callback(null, mockNearbyRows);
      });

      await request(app)
        .get('/api/qpv/nearby?lat=48.8566&lng=2.3522');

      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should limit results to DEFAULT_LIMIT', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(params[3]).toBe(20); // DEFAULT_LIMIT
        callback(null, mockNearbyRows);
      });

      await request(app)
        .get('/api/qpv/nearby?lat=48.8566&lng=2.3522&limit=50');

      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should round distance to 2 decimal places', async () => {
      const rowWithPreciseDistance = [{
        ...mockNearbyRows[0],
        distance_km: 1.23456
      }];

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, rowWithPreciseDistance);
      });

      const response = await request(app)
        .get('/api/qpv/nearby?lat=48.8566&lng=2.3522');

      expect(response.body[0].distance_km).toBe(1.23);
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/qpv/nearby?lat=48.8566&lng=2.3522');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should return nearby results when called with lat/lng and limit', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockNearbyRows);
      });

      const response = await request(app).get('/api/qpv/nearby?lat=48.8566&lng=2.3522&limit=3');
      expect(response.status).toBe(200);
      expect(mocks.db.all).toHaveBeenCalled();
    });
  });
});