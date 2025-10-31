const request = require('supertest');
const { createAppWithRoute } = require('./testUtils');

describe('Subvention Routes', () => {
  let app;
  let mocks;

  beforeEach(() => {
    ({ app, mocks } = createAppWithRoute('../routes/subventionRoutes', '/api/subventions'));
    jest.clearAllMocks();
  });

  describe('GET /api/subventions/country', () => {
    const mockCountrySubventions = [
      {
        country: 'FRANCE',
        etat_central: 1500000000,
        autres_organismes_publics: 500000000,
        total_subv_commune: 800000000,
        total_subv_EPCI: 600000000,
        total_subv_dept: 400000000,
        total_subv_region: 300000000,
        total_subventions_parHab: 850
      },
      {
        country: 'ITALY',
        etat_central: 1200000000,
        autres_organismes_publics: 400000000,
        total_subv_commune: 700000000,
        total_subv_EPCI: 500000000,
        total_subv_dept: 350000000,
        total_subv_region: 250000000,
        total_subventions_parHab: 720
      }
    ];

    it('should return all country subventions ordered by country', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM country_subventions');
        expect(sql).toContain('ORDER BY country');
        expect(params).toEqual([]);
        callback(null, mockCountrySubventions);
      });

      const response = await request(app).get('/api/subventions/country');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('country', 'FRANCE');
      expect(response.body[0]).toHaveProperty('total_subventions_parHab', 850);
    });

    it('should return 404 when no country subventions found', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app).get('/api/subventions/country');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Données de subventions non trouvées');
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/subventions/country');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/subventions/departement/:dept', () => {
    const mockDeptSubventions = {
      subvention_region_distributed: 25000000,
      subvention_departement: 15000000,
      total_subventions_parHab: 450
    };

    it('should return department subventions', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM department_subventions');
        expect(sql).toContain('WHERE dep = ?');
        expect(params).toEqual(['75']);
        callback(null, mockDeptSubventions);
      });

      const response = await request(app).get('/api/subventions/departement/75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        subvention_region_distributed: 25000000,
        subvention_departement: 15000000,
        total_subventions_parHab: 450
      });
    });

    it('should return 404 when department subventions not found', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app).get('/api/subventions/departement/75');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Données de subventions non trouvées pour ce département');
    });

    it('should handle database errors', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/subventions/departement/75');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should call validation middleware', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockDeptSubventions);
      });

      await request(app).get('/api/subventions/departement/75');

      expect(mocks.validate.validateDepartementParam).toHaveBeenCalled();
    });
  });

  describe('GET /api/subventions/commune/:cog', () => {
    const mockCommuneSubventions = {
      subvention_EPCI_distributed: 5000000,
      subvention_commune: 3000000,
      total_subventions_parHab: 320
    };

    it('should return commune subventions', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM commune_subventions');
        expect(sql).toContain('WHERE COG = ?');
        expect(params).toEqual(['75001']);
        callback(null, mockCommuneSubventions);
      });

      const response = await request(app).get('/api/subventions/commune/75001');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        subvention_EPCI_distributed: 5000000,
        subvention_commune: 3000000,
        total_subventions_parHab: 320
      });
    });

    it('should return 404 when commune subventions not found', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app).get('/api/subventions/commune/75001');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Données de subventions non trouvées pour cette commune');
    });

    it('should handle database errors', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app).get('/api/subventions/commune/75001');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should call validation middleware', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCommuneSubventions);
      });

      await request(app).get('/api/subventions/commune/75001');

      expect(mocks.validate.validateCOGParam).toHaveBeenCalled();
    });
  });

  describe('GET /api/subventions/subventions', () => {
    it('should return a simple message', async () => {
      const response = await request(app).get('/api/subventions/subventions?dept=75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Subventions endpoint' });
    });

    it('should call validation middleware', async () => {
      await request(app).get('/api/subventions/subventions?dept=75');

      expect(mocks.validate.validateDepartementParam).toHaveBeenCalled();
    });
  });
});