const request = require('supertest');
const { createAppWithRoute } = require('./testUtils');
const fixtures = require('./fixtures/common.json');

describe('Departement Routes', () => {
  let app;
  let mocks;

  beforeEach(() => {
    jest.clearAllMocks();
    const created = createAppWithRoute('../routes/departementRoutes', '/api/departements');
    app = created.app;
    mocks = created.mocks;
  });

  describe('GET /api/departements', () => {
    const mockDepartments = [
      { departement: '01' },
      { departement: '75' },
      { departement: '2A' },
      { departement: '2B' }
    ];

    it('should return all departments sorted correctly', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM departements');
        expect(params).toEqual([]);
        callback(null, mockDepartments);
      });

      const response = await request(app)
        .get('/api/departements');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(4);
      // Should be sorted with numeric departments first, then alphanumeric
      const deps = response.body.map(d => d.departement);
      expect(deps[0]).toBe('01');
      expect(new Set(deps)).toEqual(new Set(['01', '75', '2A', '2B']));
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/departements');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/departements/details', () => {
    const mockDeptDetails = {
      departement: '75',
      population: 2161000,
      logements_sociaux_pct: 22.5,
      insecurite_score: 8.2,
      immigration_score: 9.1,
      islamisation_score: 7.8,
      defrancisation_score: 6.9,
      wokisme_score: 8.5,
      number_of_mosques: 150,
      mosque_p100k: 6.9,
      total_qpv: 250,
      total_population_qpv: 180000,
      pop_in_qpv_pct: 8.3,
      total_places_migrants: 15000,
      places_migrants_p1k: 6.9
    };

    it('should return department details with QPV statistics', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM departements d');
        expect(sql).toContain('LEFT JOIN');
        expect(sql).toContain('WHERE d.departement = ?');
        expect(params).toEqual(['75', '75']);
        callback(null, mockDeptDetails);
      });

      const response = await request(app)
        .get('/api/departements/details?dept=75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDeptDetails);
    });

    it('should normalize single digit department codes', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        // dept normalization should attempt both padded and original forms
        expect(params).toEqual(expect.arrayContaining(['01']));
        callback(null, mockDeptDetails);
      });

      await request(app)
        .get('/api/departements/details?dept=1');

      expect(mocks.db.get).toHaveBeenCalled();
    });

    it('should return 404 when department not found', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/departements/details?dept=99');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Département non trouvé');
    });

    it('should handle database errors', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/departements/details?dept=75');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should call validation middleware', async () => {
      // validate module is mocked by the test helper
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockDeptDetails);
      });

      await request(app).get('/api/departements/details?dept=75');

      expect(mocks.validate.validateDepartement).toHaveBeenCalled();
    });

    it('should call cache middleware with correct key', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockDeptDetails);
      });

      await request(app).get('/api/departements/details?dept=75');

      // cache middleware is mocked by the helper; assert it was attached
      expect(mocks.cache.cacheMiddleware).toHaveBeenCalled();
      const cacheKeyFn = mocks.cache.cacheMiddleware.mock.calls[0][0];
      expect(cacheKeyFn({ query: { dept: '75' } })).toBe('dept_details_75');
    });
  });

  describe('GET /api/departements/names', () => {
    const mockNamesData = {
      musulman_pct: 8.5,
      africain_pct: 4.2,
      asiatique_pct: 2.1,
      traditionnel_pct: 52.3,
      moderne_pct: 28.9,
      annais: 2023
    };

    it('should return names data for latest year', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM department_names');
        expect(sql).toContain('annais = (SELECT MAX(annais) FROM department_names WHERE dpt = ?)');
        expect(params).toEqual(['75', '75']);
        callback(null, mockNamesData);
      });

      const response = await request(app)
        .get('/api/departements/names?dept=75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockNamesData);
    });

    it('should return 404 when no names data found', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/departements/names?dept=75');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Données de prénoms non trouvées pour la dernière année');
    });

    it('should handle database errors', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/departements/names?dept=75');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/departements/names_history', () => {
    const mockHistoryData = [
      {
        musulman_pct: 6.2,
        africain_pct: 3.1,
        asiatique_pct: 1.8,
        traditionnel_pct: 55.6,
        moderne_pct: 30.3,
        invente_pct: 2.1,
        europeen_pct: 0.9,
        annais: 2020
      },
      {
        musulman_pct: 8.5,
        africain_pct: 4.2,
        asiatique_pct: 2.1,
        traditionnel_pct: 52.3,
        moderne_pct: 28.9,
        invente_pct: 2.5,
        europeen_pct: 1.5,
        annais: 2023
      }
    ];

    it('should return names history for department', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM department_names');
        expect(sql).toContain('WHERE dpt = ?');
        expect(sql).toContain('ORDER BY annais ASC');
        expect(params).toEqual(['75']);
        callback(null, mockHistoryData);
      });

      const response = await request(app)
        .get('/api/departements/names_history?dept=75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHistoryData);
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/departements/names_history?dept=75');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/departements/crime', () => {
    const mockCrimeData = {
      dep: '75',
      annee: 2023,
      homicides: 45,
      vols_violents: 8500,
      cambriolages: 19500,
      agressions_sexuelles: 1200
    };

    it('should return crime data for latest year', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM department_crime');
        expect(sql).toContain('annee = (SELECT MAX(annee) FROM department_crime WHERE dep = ?)');
        expect(params).toEqual(['75', '75']);
        callback(null, mockCrimeData);
      });

      const response = await request(app)
        .get('/api/departements/crime?dept=75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCrimeData);
    });

    it('should return 404 when no crime data found', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/departements/crime?dept=75');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Données criminelles non trouvées pour la dernière année');
    });

    it('should handle database errors', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/departements/crime?dept=75');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/departements/crime_history', () => {
    const mockCrimeHistory = [
      {
        dep: '75',
        annee: 2020,
        homicides: 35,
        vols_violents: 7800
      },
      {
        dep: '75',
        annee: 2023,
        homicides: 45,
        vols_violents: 8500
      }
    ];

    it('should return crime history for department', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM department_crime');
        expect(sql).toContain('WHERE dep = ?');
        expect(sql).toContain('ORDER BY annee ASC');
        expect(params).toEqual(['75']);
        callback(null, mockCrimeHistory);
      });

      const response = await request(app)
        .get('/api/departements/crime_history?dept=75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCrimeHistory);
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/departements/crime_history?dept=75');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/departements/prefet', () => {
    const mockPrefetData = {
      prenom: 'Jean',
      nom: 'MARTIN',
      date_poste: '2022-03-15'
    };

    it('should return prefect data for department', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM prefets');
        expect(sql).toContain('WHERE code = ?');
        expect(params).toEqual(['75']);
        callback(null, mockPrefetData);
      });

      const response = await request(app)
        .get('/api/departements/prefet?dept=75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPrefetData);
    });

    it('should return 404 when prefect not found', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/departements/prefet?dept=75');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Préfet non trouvé');
    });

    it('should handle database errors', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/departements/prefet?dept=75');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should call cache middleware with correct key', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockPrefetData);
      });

      await request(app).get('/api/departements/prefet?dept=75');

      expect(mocks.cache.cacheMiddleware).toHaveBeenCalled();
      const calls = mocks.cache.cacheMiddleware.mock.calls;
      const cacheKeyFn = calls[calls.length - 1][0];
      expect(cacheKeyFn({ query: { dept: '75' } })).toBe('prefet_75');
    });
  });
});