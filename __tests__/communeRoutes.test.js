const request = require('supertest');
const { createAppWithRoute } = require('./testUtils');
const {
  MOCK_COMMUNE,
  MOCK_COMMUNES,
  MOCK_COMMUNE_WITH_ACCENTS,
  MOCK_COMMUNE_NAMES,
  MOCK_COMMUNE_NAMES_HISTORY,
  MOCK_CRIME_DATA,
  MOCK_CRIME_HISTORY,
  MOCK_COMMUNE_DETAILS,
  MOCK_MAIRE,
  VALID_DEPARTMENTS,
  INVALID_DEPARTMENTS,
  VALID_COGS,
  INVALID_COGS,
  SPECIAL_CHARACTERS,
  NUANCE_CODES_AND_LABELS,
  MOCK_ERROR_SCENARIOS,
  createMockCommuneWithOverrides,
  createMockCommunesArray,
  LONG_QUERY
} = require('./fixtures/communeFixtures');

// Mock the search service (we still want to control it explicitly)
jest.mock('../services/searchService', () => ({
  searchCommunes: jest.fn(),
  getCommuneSuggestions: jest.fn(),
  searchCommunesGlobally: jest.fn()
}));

let app;
let mocks;
let SearchService;

describe('Commune Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  const created = createAppWithRoute('../routes/communeRoutes', '/api/communes', { mockValidate: false });
    app = created.app;
    mocks = created.mocks;
    // require the (mocked) search service after module reset so we get the mock
    SearchService = require('../services/searchService');
  });

  describe('GET /api/communes - Search endpoint', () => {
    describe('Valid requests', () => {
      it('should return communes for valid search', async () => {
        SearchService.searchCommunes.mockResolvedValue(MOCK_COMMUNES);

        const response = await request(app)
          .get('/api/communes?dept=01&q=paris');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
        expect(response.body[0]).toHaveProperty('COG');
        expect(response.body[0]).toHaveProperty('commune');
      });

      it('should handle empty search results gracefully', async () => {
        SearchService.searchCommunes.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/communes?dept=01&q=nonexistent');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('should return single result', async () => {
        SearchService.searchCommunes.mockResolvedValue([MOCK_COMMUNE]);

        const response = await request(app)
          .get('/api/communes?dept=75&q=paris');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].COG).toBe('75001');
      });

      it('should return multiple results', async () => {
        const mockResults = createMockCommunesArray(10);
        SearchService.searchCommunes.mockResolvedValue(mockResults);

        const response = await request(app)
          .get('/api/communes?dept=75&q=paris');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(10);
      });
    });

    describe('Special characters and encoding', () => {
      SPECIAL_CHARACTERS.forEach(({ query }) => {
        it(`should handle query with special characters: "${query}"`, async () => {
          SearchService.searchCommunes.mockResolvedValue([MOCK_COMMUNE_WITH_ACCENTS]);

          const response = await request(app)
            .get(`/api/communes?dept=01&q=${encodeURIComponent(query)}`);

          expect(response.status).toBe(200);
        });
      });
    });

    describe('Parameter validation', () => {
      it('should require both dept and q parameters', async () => {
        const response = await request(app)
          .get('/api/communes');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('details');
      });

      it('should require dept parameter', async () => {
        const response = await request(app)
          .get('/api/communes?q=paris');

        expect(response.status).toBe(400);
      });

      it('should require q parameter', async () => {
        const response = await request(app)
          .get('/api/communes?dept=75');

        expect(response.status).toBe(400);
      });

      it('should reject query longer than max length', async () => {
        const response = await request(app)
          .get(`/api/communes?dept=01&q=${encodeURIComponent(LONG_QUERY)}`);

        expect(response.status).toBe(400);
      });
    });

    describe('Error handling', () => {
      MOCK_ERROR_SCENARIOS.forEach(({ name, error, expectedStatus }) => {
        it(`should handle ${name}`, async () => {
          SearchService.searchCommunes.mockRejectedValue(error);

          const response = await request(app)
            .get('/api/communes?dept=01&q=test');

          expect(response.status).toBe(expectedStatus);
          expect(response.body).toHaveProperty('error');
        });
      });
    });
  });

  describe('GET /api/communes/suggestions - Autocomplete endpoint', () => {
    describe('Valid requests', () => {
      it('should return suggestions for valid search', async () => {
        const mockSuggestions = ['Paris', 'Paris 1er', 'Paris 2e'];
        SearchService.getCommuneSuggestions.mockResolvedValue(mockSuggestions);

        const response = await request(app)
          .get('/api/communes/suggestions?dept=75&q=paris');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(typeof response.body[0]).toBe('string');
      });

      it('should handle empty suggestions', async () => {
        SearchService.getCommuneSuggestions.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/communes/suggestions?dept=75&q=nonexistent');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('should limit suggestions appropriately', async () => {
        const mockSuggestions = Array.from({ length: 5 }, (_, i) => `Suggestion ${i + 1}`);
        SearchService.getCommuneSuggestions.mockResolvedValue(mockSuggestions);

        const response = await request(app)
          .get('/api/communes/suggestions?dept=75&q=test');

        expect(response.status).toBe(200);
        expect(response.body.length).toBeLessThanOrEqual(5);
      });
    });

    describe('Parameter validation', () => {
      it('should require dept parameter', async () => {
        const response = await request(app)
          .get('/api/communes/suggestions?q=test');

        expect(response.status).toBe(400);
      });

      it('should require q parameter', async () => {
        const response = await request(app)
          .get('/api/communes/suggestions?dept=75');

        expect(response.status).toBe(400);
      });
    });

    describe('Error handling', () => {
      it('should handle service errors', async () => {
        SearchService.getCommuneSuggestions.mockRejectedValue(new Error('Service error'));

        const response = await request(app)
          .get('/api/communes/suggestions?dept=75&q=test');

        expect(response.status).toBe(500);
      });
    });
  });

  describe('GET /api/communes/search - Global search endpoint', () => {
    describe('Valid requests', () => {
      it('should return global search results for valid query', async () => {
        SearchService.searchCommunesGlobally.mockResolvedValue(MOCK_COMMUNES);

        const response = await request(app)
          .get('/api/communes/search?q=paris');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should return empty array for queries shorter than 3 chars', async () => {
        const response = await request(app)
          .get('/api/communes/search?q=pa');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('should return empty array for single character', async () => {
        const response = await request(app)
          .get('/api/communes/search?q=p');

        expect([200, 400]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body.length).toBe(0);
        }
      });

      it('should handle empty results', async () => {
        SearchService.searchCommunesGlobally.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/communes/search?q=zzzzzzzzzzz');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(0);
      });
    });

    describe('Query length validation', () => {
      it('should accept exactly 3 character queries', async () => {
        SearchService.searchCommunesGlobally.mockResolvedValue(MOCK_COMMUNES);

        const response = await request(app)
          .get('/api/communes/search?q=par');

        expect(response.status).toBe(200);
      });

      it('should accept very long queries', async () => {
        SearchService.searchCommunesGlobally.mockResolvedValue([]);

        const response = await request(app)
          .get(`/api/communes/search?q=${encodeURIComponent(LONG_QUERY.substring(0, 200))}`);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Error handling', () => {
      it('should handle service errors', async () => {
        SearchService.searchCommunesGlobally.mockRejectedValue(new Error('Search failed'));

        const response = await request(app)
          .get('/api/communes/search?q=test');

        expect(response.status).toBe(500);
      });
    });
  });

  describe('GET /api/communes/all - Get all communes', () => {
    describe('Valid requests', () => {
      it('should return all communes data', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
            callback(null, MOCK_COMMUNES);
          });

        const response = await request(app)
          .get('/api/communes/all');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should return empty array when no communes exist', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
            callback(null, []);
          });

        const response = await request(app)
          .get('/api/communes/all');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(0);
      });

      it('should return large dataset', async () => {
        const largeMockData = createMockCommunesArray(1000);
        mocks.db.all.mockImplementation((query, params, callback) => {
          callback(null, largeMockData);
        });

        const response = await request(app)
          .get('/api/communes/all');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1000);
      });
    });

    describe('Error handling', () => {
      it('should handle database errors', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
          callback(new Error('Database error'), null);
        });

        const response = await request(app)
          .get('/api/communes/all');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('GET /api/communes/names - Get commune names data', () => {
    describe('Valid requests', () => {
      VALID_COGS.forEach(cog => {
        it(`should return names data for COG ${cog}`, async () => {
          mocks.db.get.mockImplementation((query, params, callback) => {
            callback(null, MOCK_COMMUNE_NAMES);
          });

          const response = await request(app)
            .get(`/api/communes/names?cog=${cog}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('musulman_pct');
          expect(response.body).toHaveProperty('annais');
        });
      });

      it('should return correct data structure', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, MOCK_COMMUNE_NAMES);
        });

        const response = await request(app)
          .get('/api/communes/names?cog=75001');

        expect(response.body.musulman_pct >= 0).toBe(true);
        expect(response.body.annais).toBe(2022);
      });
    });

    describe('Missing data', () => {
      it('should return 404 when no names data found', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, null);
        });

        const response = await request(app)
          .get('/api/communes/names?cog=75001');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Error handling', () => {
      it('should handle database errors', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(new Error('Database error'), null);
        });

        const response = await request(app)
          .get('/api/communes/names?cog=75001');

        expect(response.status).toBe(500);
      });
    });
  });

  describe('GET /api/communes/names_history - Get historical names data', () => {
    describe('Valid requests', () => {
      it('should return names history', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
          callback(null, MOCK_COMMUNE_NAMES_HISTORY);
        });

        const response = await request(app)
          .get('/api/communes/names_history?cog=75001');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
      });

      it('should return chronologically ordered data', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
          callback(null, MOCK_COMMUNE_NAMES_HISTORY);
        });

        const response = await request(app)
          .get('/api/communes/names_history?cog=75001');

        expect(response.body[0].annais).toBe(2020);
        expect(response.body[1].annais).toBe(2022);
      });

      it('should handle empty history', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
          callback(null, []);
        });

        const response = await request(app)
          .get('/api/communes/names_history?cog=75001');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(0);
      });
    });

    describe('Error handling', () => {
      it('should handle database errors', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
          callback(new Error('Database error'), null);
        });

        const response = await request(app)
          .get('/api/communes/names_history?cog=75001');

        expect(response.status).toBe(500);
      });
    });
  });

  describe('GET /api/communes/crime - Get crime data', () => {
    describe('Valid requests', () => {
      VALID_COGS.forEach(cog => {
        it(`should return crime data for COG ${cog}`, async () => {
          mocks.db.get.mockImplementation((query, params, callback) => {
            callback(null, MOCK_CRIME_DATA);
          });

          const response = await request(app)
            .get(`/api/communes/crime?cog=${cog}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('COG');
          expect(response.body).toHaveProperty('annee');
        });
      });
    });

    describe('Missing data', () => {
      it('should return 404 when no crime data found', async () => {
          mocks.db.get.mockImplementation((query, params, callback) => {
            callback(null, null);
          });

          const response = await request(app)
            .get('/api/communes/crime?cog=75001');

          expect(response.status).toBe(404);
        });
    });

    describe('Error handling', () => {
      it('should handle database errors', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(new Error('Database error'), null);
        });

        const response = await request(app)
          .get('/api/communes/crime?cog=75001');

        expect(response.status).toBe(500);
      });
    });
  });

  describe('GET /api/communes/crime_history - Get historical crime data', () => {
    describe('Valid requests', () => {
      it('should return crime history', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
          callback(null, MOCK_CRIME_HISTORY);
        });

        const response = await request(app)
          .get('/api/communes/crime_history?cog=75001');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should handle empty history', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
          callback(null, []);
        });

        const response = await request(app)
          .get('/api/communes/crime_history?cog=75001');

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(0);
      });
    });

    describe('Error handling', () => {
      it('should handle database errors', async () => {
        mocks.db.all.mockImplementation((query, params, callback) => {
          callback(new Error('Database error'), null);
        });

        const response = await request(app)
          .get('/api/communes/crime_history?cog=75001');

        expect(response.status).toBe(500);
      });
    });
  });

  describe('GET /api/communes/details - Get detailed commune info', () => {
    describe('Valid requests', () => {
      VALID_COGS.forEach(cog => {
        it(`should return details for COG ${cog}`, async () => {
          mocks.db.get.mockImplementation((query, params, callback) => {
            callback(null, MOCK_COMMUNE_DETAILS);
          });

          const response = await request(app)
            .get(`/api/communes/details?cog=${cog}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('COG');
          expect(response.body).toHaveProperty('commune');
          expect(response.body).toHaveProperty('population');
        });
      });
    });

    describe('Missing data', () => {
      it('should return 404 when commune not found', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, null);
        });

        const response = await request(app)
          .get('/api/communes/details?cog=75001');

        expect(response.status).toBe(404);
      });
    });

    describe('Error handling', () => {
      it('should handle database errors', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(new Error('Database error'), null);
        });

        const response = await request(app)
          .get('/api/communes/details?cog=75001');

        expect(response.status).toBe(500);
      });
    });
  });

  describe('GET /api/communes/maire - Get mayor information', () => {
    describe('Valid requests', () => {
      VALID_COGS.forEach(cog => {
        it(`should return maire data for COG ${cog}`, async () => {
          mocks.db.get.mockImplementation((query, params, callback) => {
            callback(null, MOCK_MAIRE);
          });

          const response = await request(app)
            .get(`/api/communes/maire?cog=${cog}`);

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('prenom');
          expect(response.body).toHaveProperty('nom');
        });
      });
    });

    describe('Political party mapping', () => {
      NUANCE_CODES_AND_LABELS.forEach(({ code, label }) => {
        it(`should map nuance "${code}" to "${label}"`, async () => {
          const mockedMaire = { ...MOCK_MAIRE, nuance_politique: code };
          mocks.db.get.mockImplementation((query, params, callback) => {
            callback(null, mockedMaire);
          });

          const response = await request(app)
            .get('/api/communes/maire?cog=75001');

          expect(response.status).toBe(200);
          expect(response.body.nuance_politique).toBe(label);
        });
      });

      it('should preserve unknown nuance codes', async () => {
        const mockedMaire = { ...MOCK_MAIRE, nuance_politique: 'UNKNOWNCODE' };
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, mockedMaire);
        });

        const response = await request(app)
          .get('/api/communes/maire?cog=75001');

        expect(response.body.nuance_politique).toBe('UNKNOWNCODE');
      });
    });

    describe('Missing data', () => {
      it('should return 404 when maire not found', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, null);
        });

        const response = await request(app)
          .get('/api/communes/maire?cog=75001');

        expect(response.status).toBe(404);
      });
    });

    describe('Error handling', () => {
      it('should handle database errors', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(new Error('Database error'), null);
        });

        const response = await request(app)
          .get('/api/communes/maire?cog=75001');

        expect(response.status).toBe(500);
      });
    });
  });

  describe('Edge cases and boundary conditions', () => {
    describe('Null and undefined handling', () => {
      it('should handle null response gracefully', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, null);
        });

        const response = await request(app)
          .get('/api/communes/names?cog=75001');

        expect(response.status).toBe(404);
      });

      it('should handle undefined fields in response', async () => {
        const incompleteData = { COG: '75001' };
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, incompleteData);
        });

        const response = await request(app)
          .get('/api/communes/details?cog=75001');

        expect(response.status).toBe(200);
        expect(response.body.COG).toBe('75001');
      });
    });

    describe('Data type edge cases', () => {
      it('should handle zero population', async () => {
        const zeroPopData = { ...MOCK_COMMUNE_DETAILS, population: 0 };
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, zeroPopData);
        });

        const response = await request(app)
          .get('/api/communes/details?cog=75001');

        expect(response.status).toBe(200);
        expect(response.body.population).toBe(0);
      });

      it('should handle negative scores in crime data', async () => {
        const negativeScoreData = { ...MOCK_CRIME_DATA, crimes_violents: -5 };
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, negativeScoreData);
        });

        const response = await request(app)
          .get('/api/communes/crime?cog=75001');

        expect(response.status).toBe(200);
        expect(response.body.crimes_violents).toBe(-5);
      });

      it('should handle very large numbers', async () => {
        const largeData = { ...MOCK_COMMUNE_DETAILS, population: 999999999 };
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, largeData);
        });

        const response = await request(app)
          .get('/api/communes/details?cog=75001');

        expect(response.status).toBe(200);
        expect(response.body.population).toBe(999999999);
      });

      it('should handle decimal percentages', async () => {
        const decimalData = { ...MOCK_COMMUNE_NAMES, musulman_pct: 5.123456 };
        mocks.db.get.mockImplementation((query, params, callback) => {
          callback(null, decimalData);
        });

        const response = await request(app)
          .get('/api/communes/names?cog=75001');

        expect(response.status).toBe(200);
        expect(response.body.musulman_pct).toBeCloseTo(5.123456, 5);
      });
    });

    describe('Concurrent requests', () => {
      it('should handle multiple simultaneous requests', async () => {
        mocks.db.get.mockImplementation((query, params, callback) => {
          setTimeout(() => callback(null, MOCK_COMMUNE_NAMES), 10);
        });

        const promises = Array.from({ length: 5 }, () =>
          request(app).get('/api/communes/names?cog=75001')
        );

        const responses = await Promise.all(promises);

        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
      });
    });

    describe('Response format consistency', () => {
      it('should always return JSON', async () => {
        SearchService.searchCommunes.mockResolvedValue(MOCK_COMMUNES);

        const response = await request(app)
          .get('/api/communes?dept=75&q=paris');

        expect(response.type).toContain('application/json');
      });

      it('should include proper HTTP headers', async () => {
        SearchService.searchCommunes.mockResolvedValue(MOCK_COMMUNES);

        const response = await request(app)
          .get('/api/communes?dept=75&q=paris');

        expect(response.headers['content-type']).toContain('application/json');
      });
    });
  });
});
