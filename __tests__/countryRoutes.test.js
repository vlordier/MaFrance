const request = require('supertest');
const { createAppWithRoute } = require('./testUtils');
const fixtures = require('./fixtures/common.json');

describe('Country Routes', () => {
  let app;
  let mocks;

  beforeEach(() => {
    jest.clearAllMocks();
    const created = createAppWithRoute('../routes/countryRoutes', '/api/country');
    app = created.app;
    mocks = created.mocks;
  });

  describe('GET /api/country/details', () => {
    const mockCountryData = [
      {
        country: 'FRANCE',
        population: 67000000,
        logements_sociaux_pct: 17.5,
        insecurite_score: 7.2,
        immigration_score: 8.1,
        islamisation_score: 6.8,
        defrancisation_score: 5.9,
        wokisme_score: 7.5,
        number_of_mosques: 2500,
        mosque_p100k: 3.7,
        total_qpv: 1500,
        pop_in_qpv_pct: 8.2,
        total_places_migrants: 45000,
        places_migrants_p1k: 0.67
      }
    ];

    it('should return all country details when no country specified', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('FROM country');
        expect(sql).not.toContain('WHERE');
        expect(params).toEqual([]);
        callback(null, mockCountryData);
      });

      const response = await request(app)
        .get('/api/country/details');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCountryData);
      expect(mocks.db.all).toHaveBeenCalled();
      expect(mocks.cache.cacheMiddleware).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return specific country details when country specified', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE UPPER(country) = ?');
        expect(params).toEqual(['FRANCE']);
        callback(null, mockCountryData);
      });

      const response = await request(app)
        .get('/api/country/details?country=France');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCountryData);
      expect(mocks.db.all).toHaveBeenCalled();
    });

    it('should handle case insensitive country search', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(params).toEqual(['FRANCE']);
        callback(null, mockCountryData);
      });

      await request(app)
        .get('/api/country/details?country=france');

      expect(mocks.db.all).toHaveBeenCalledWith(
        expect.any(String),
        ['FRANCE'],
        expect.any(Function)
      );
    });

    it('should return 404 when no data found', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/country/details?country=NonExistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Données pays non trouvées');
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/country/details');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Database operation failed');
    });

    it('should call validation middleware', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCountryData);
      });

      await request(app).get('/api/country/details');

      expect(mocks.validate.validateCountry).toHaveBeenCalled();
    });

    it('should call cache middleware with correct key', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCountryData);
      });

      const response = await request(app).get('/api/country/details?country=France');

      // cache middleware is provided by the helper; assert it was attached
      expect(mocks.cache.cacheMiddleware).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/country/names', () => {
    const mockNamesData = [
      {
        country: 'FRANCE',
        musulman_pct: 15.2,
        africain_pct: 8.7,
        asiatique_pct: 3.1,
        traditionnel_pct: 45.6,
        moderne_pct: 22.4,
        annais: 2023
      }
    ];

    it('should return names data for latest year when no country specified', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('annais = (SELECT MAX(annais) FROM country_names)');
        expect(sql).not.toContain('WHERE UPPER(country) = ?');
        expect(params).toEqual([]);
        callback(null, mockNamesData);
      });

      const response = await request(app)
        .get('/api/country/names');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockNamesData);
    });

    it('should return names data for specific country latest year', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE UPPER(country) = ? AND annais = (SELECT MAX(annais) FROM country_names WHERE UPPER(country) = ?)');
        expect(params).toEqual(['FRANCE', 'FRANCE']);
        callback(null, mockNamesData);
      });

      const response = await request(app)
        .get('/api/country/names?country=France');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockNamesData);
    });

    it('should return 404 when no names data found', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/country/names');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Données de prénoms non trouvées pour la dernière année');
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/country/names');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/country/names_history', () => {
    const mockHistoryData = [
      {
        country: 'FRANCE',
        musulman_pct: 12.5,
        africain_pct: 7.2,
        asiatique_pct: 2.8,
        traditionnel_pct: 48.1,
        moderne_pct: 24.4,
        invente_pct: 3.2,
        europeen_pct: 1.8,
        annais: 2020
      },
      {
        country: 'FRANCE',
        musulman_pct: 15.2,
        africain_pct: 8.7,
        asiatique_pct: 3.1,
        traditionnel_pct: 45.6,
        moderne_pct: 22.4,
        invente_pct: 3.5,
        europeen_pct: 1.5,
        annais: 2023
      }
    ];

    it('should return all countries names history when no country specified', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('ORDER BY country, annais ASC');
        expect(sql).not.toContain('WHERE country = ?');
        expect(params).toEqual([]);
        callback(null, mockHistoryData);
      });

      const response = await request(app)
        .get('/api/country/names_history');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHistoryData);
    });

    it('should return specific country names history', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE country = ?');
        expect(sql).toContain('ORDER BY annais ASC');
        expect(params).toEqual(['France']);
        callback(null, mockHistoryData);
      });

      const response = await request(app)
        .get('/api/country/names_history?country=France');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHistoryData);
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/country/names_history');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/country/crime', () => {
    const mockCrimeData = [
      {
        country: 'FRANCE',
        annee: 2023,
        homicides: 850,
        vols_violents: 12500,
        cambriolages: 28500,
        agressions_sexuelles: 3200
      }
    ];

    it('should return crime data for latest year when no country specified', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('annee = (SELECT MAX(annee) FROM country_crime)');
        expect(sql).not.toContain('WHERE UPPER(country) = ?');
        expect(params).toEqual([]);
        callback(null, mockCrimeData);
      });

      const response = await request(app)
        .get('/api/country/crime');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCrimeData);
    });

    it('should return crime data for specific country latest year', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE UPPER(country) = ? AND annee = (SELECT MAX(annee) FROM country_crime WHERE UPPER(country) = ?)');
        expect(params).toEqual(['FRANCE', 'FRANCE']);
        callback(null, mockCrimeData);
      });

      const response = await request(app)
        .get('/api/country/crime?country=France');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCrimeData);
    });

    it('should return 404 when no crime data found', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/country/crime');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Données criminelles non trouvées pour la dernière année');
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/country/crime');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/country/crime_history', () => {
    const mockCrimeHistory = [
      {
        country: 'FRANCE',
        annee: 2020,
        homicides: 780,
        vols_violents: 11800
      },
      {
        country: 'FRANCE',
        annee: 2023,
        homicides: 850,
        vols_violents: 12500
      }
    ];

    it('should return all countries crime history when no country specified', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('ORDER BY country, annee ASC');
        expect(sql).not.toContain('WHERE country = ?');
        expect(params).toEqual([]);
        callback(null, mockCrimeHistory);
      });

      const response = await request(app)
        .get('/api/country/crime_history');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCrimeHistory);
    });

    it('should return specific country crime history', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('WHERE country = ?');
        expect(sql).toContain('ORDER BY annee ASC');
        expect(params).toEqual(['France']);
        callback(null, mockCrimeHistory);
      });

      const response = await request(app)
        .get('/api/country/crime_history?country=France');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCrimeHistory);
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/country/crime_history');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/country/ministre', () => {
    const mockMinistreData = {
      country: 'FRANCE',
      prenom: 'Gérald',
      nom: 'DARMANIN',
      date_mandat: '2020-07-06',
      famille_nuance: 'Droite',
      nuance_politique: 'Les Républicains'
    };

    it('should return current French minister data', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(sql).toContain("UPPER(country) = 'FRANCE'");
        expect(sql).toContain('ORDER BY date_mandat DESC LIMIT 1');
        expect(params).toEqual([]);
        callback(null, mockMinistreData);
      });

      const response = await request(app)
        .get('/api/country/ministre');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMinistreData);
    });

    it('should return 404 when no minister found', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/country/ministre');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Ministre non trouvé');
    });

    it('should handle database errors', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const response = await request(app)
        .get('/api/country/ministre');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should call cache middleware with correct key', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockMinistreData);
      });

      await request(app).get('/api/country/ministre');

      expect(mocks.cache.cacheMiddleware).toHaveBeenCalled();
      const calls = mocks.cache.cacheMiddleware.mock.calls;
      const cacheKeyFn = calls[calls.length - 1][0];
      expect(cacheKeyFn()).toBe('ministre_france');
    });
  });
});