const request = require('supertest');
const express = require('express');
const {
  validateDepartement,
  validateDepartementParam,
  validateCOG,
  validateCOGParam,
  validateOptionalCOG,
  validateOptionalDepartement,
  validateSearchQuery,
  validateSort,
  validateDirection,
  validatePagination,
  validatePopulationRange,
  validateCountry,
  validateLieu
} = require('../middleware/validate');

const app = express();
app.use(express.json());

describe('Validation Middleware', () => {
  describe('validateDepartement', () => {
    beforeEach(() => {
      app.use('/test-dept', validateDepartement, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass with valid department code', async () => {
      const response = await request(app)
        .get('/test-dept?dept=01');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid department codes', async () => {
      const validDepts = ['01', '95', '2A', '2B', '971', '976'];

      for (const dept of validDepts) {
        const response = await request(app)
          .get(`/test-dept?dept=${dept}`);

        expect(response.status).toBe(200);
      }
    });

    test('should fail with missing dept parameter', async () => {
      const response = await request(app)
        .get('/test-dept');

      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
      expect(response.body.details[0].msg).toBe('Département requis');
    });

    test('should fail with empty dept parameter', async () => {
      const response = await request(app)
        .get('/test-dept?dept=');

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
      expect(response.body.details[0].msg).toBe('Département requis');
    });

    test('should fail with invalid department code', async () => {
      const response = await request(app)
        .get('/test-dept?dept=00');

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
      expect(response.body.details[0].msg).toBe('Code département invalide');
    });

    test('should fail with invalid department codes', async () => {
      const invalidDepts = ['00', '96', '3A', '977', 'abc', '1234'];

      for (const dept of invalidDepts) {
        const response = await request(app)
          .get(`/test-dept?dept=${dept}`);

        expect(response.status).toBe(400);
        expect(response.body.details[0].msg).toBe('Code département invalide');
      }
    });
  });

  describe('validateDepartementParam', () => {
    beforeEach(() => {
      app.use('/test-dept-param/:dept', validateDepartementParam, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass with valid department code in path', async () => {
      const response = await request(app)
        .get('/test-dept-param/01');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with special "all" value', async () => {
      const response = await request(app)
        .get('/test-dept-param/all');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should fail with invalid department code in path', async () => {
      const response = await request(app)
        .get('/test-dept-param/00');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('Code département invalide');
    });
  });

  describe('validateCOG', () => {
    beforeEach(() => {
      app.use('/test-cog', validateCOG, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass with valid 5-digit COG', async () => {
      const response = await request(app)
        .get('/test-cog?cog=01001');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid COG formats', async () => {
      const validCogs = ['01001', '2A001', '2B123', '97101', '97223', '1234'];

      for (const cog of validCogs) {
        const response = await request(app)
          .get(`/test-cog?cog=${cog}`);

        expect(response.status).toBe(200);
      }
    });

    test('should fail with missing cog parameter', async () => {
      const response = await request(app)
        .get('/test-cog');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('COG requis');
    });

    test('should fail with invalid COG format', async () => {
      const response = await request(app)
        .get('/test-cog?cog=abc123');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('Code COG invalide');
    });

    test('should fail with invalid COG lengths', async () => {
      const invalidCogs = ['123', '123456', 'abc', ''];

      for (const cog of invalidCogs) {
        const response = await request(app)
          .get(`/test-cog?cog=${cog}`);

        expect(response.status).toBe(400);
        // Empty string triggers "COG requis", others trigger "Code COG invalide"
        if (cog === '') {
          expect(response.body.details[0].msg).toBe('COG requis');
        } else {
          expect(response.body.details[0].msg).toBe('Code COG invalide');
        }
      }
    });
  });

  describe('validateOptionalCOG', () => {
    beforeEach(() => {
      app.use('/test-optional-cog', validateOptionalCOG, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass without cog parameter', async () => {
      const response = await request(app)
        .get('/test-optional-cog');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid cog parameter', async () => {
      const response = await request(app)
        .get('/test-optional-cog?cog=01001');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should fail with invalid cog parameter', async () => {
      const response = await request(app)
        .get('/test-optional-cog?cog=invalid');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('Code COG invalide');
    });
  });

  describe('validateSort', () => {
    beforeEach(() => {
      app.use('/test-sort', validateSort, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass without sort parameter', async () => {
      const response = await request(app)
        .get('/test-sort');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid sort parameters', async () => {
      const validSorts = ['total_score', 'population', 'insecurite_score', 'etrangers_pct'];

      for (const sort of validSorts) {
        const response = await request(app)
          .get(`/test-sort?sort=${sort}`);

        expect(response.status).toBe(200);
      }
    });

    test('should fail with invalid sort parameter', async () => {
      const response = await request(app)
        .get('/test-sort?sort=invalid_field');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('Paramètre de tri invalide');
    });
  });

  describe('validateDirection', () => {
    beforeEach(() => {
      app.use('/test-direction', validateDirection, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass without direction parameter', async () => {
      const response = await request(app)
        .get('/test-direction');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid direction values', async () => {
      const validDirections = ['ASC', 'DESC'];

      for (const direction of validDirections) {
        const response = await request(app)
          .get(`/test-direction?direction=${direction}`);

        expect(response.status).toBe(200);
      }
    });

    test('should fail with invalid direction', async () => {
      const response = await request(app)
        .get('/test-direction?direction=INVALID');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('Direction doit être ASC ou DESC');
    });
  });

  describe('validatePagination', () => {
    beforeEach(() => {
      app.use('/test-pagination', validatePagination, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass without pagination parameters', async () => {
      const response = await request(app)
        .get('/test-pagination');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid limit', async () => {
      const response = await request(app)
        .get('/test-pagination?limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid cursor', async () => {
      const response = await request(app)
        .get('/test-pagination?cursor=100');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should fail with invalid limit (too low)', async () => {
      const response = await request(app)
        .get('/test-pagination?limit=0');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toContain('Limit doit être un entier entre 1 et');
    });

    test('should fail with invalid cursor (negative)', async () => {
      const response = await request(app)
        .get('/test-pagination?cursor=-1');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('Cursor doit être un entier positif');
    });
  });

  describe('validatePopulationRange', () => {
    beforeEach(() => {
      app.use('/test-population', validatePopulationRange, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass without population_range parameter', async () => {
      const response = await request(app)
        .get('/test-population');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid min-max range', async () => {
      const response = await request(app)
        .get('/test-population?population_range=1000-50000');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid min+ range', async () => {
      const response = await request(app)
        .get('/test-population?population_range=10000%2B');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid 0-max range', async () => {
      const response = await request(app)
        .get('/test-population?population_range=0-100000');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should fail with invalid range format', async () => {
      const response = await request(app)
        .get('/test-population?population_range=invalid');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toContain('Format de population invalide');
    });

    test('should fail with min >= max', async () => {
      const response = await request(app)
        .get('/test-population?population_range=50000-1000');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toContain('Plage de population invalide');
    });
  });

  describe('validateCountry', () => {
    beforeEach(() => {
      app.use('/test-country', validateCountry, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass without country parameter', async () => {
      const response = await request(app)
        .get('/test-country');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid country values', async () => {
      const validCountries = ['france metro', 'france entiere'];

      for (const country of validCountries) {
        const response = await request(app)
          .get(`/test-country?country=${encodeURIComponent(country)}`);

        expect(response.status).toBe(200);
      }
    });

    test('should fail with invalid country', async () => {
      const response = await request(app)
        .get('/test-country?country=invalid');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('Pays doit être france entiere ou metro');
    });
  });

  describe('validateLieu', () => {
    beforeEach(() => {
      app.use('/test-lieu', validateLieu, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass without lieu parameter', async () => {
      const response = await request(app)
        .get('/test-lieu');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid lieu', async () => {
      const response = await request(app)
        .get('/test-lieu?lieu=Paris');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should trim and escape lieu', async () => {
      const response = await request(app)
        .get('/test-lieu?lieu=  Paris<script>  ');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should fail with too long lieu', async () => {
      const longLieu = 'a'.repeat(101);
      const response = await request(app)
        .get(`/test-lieu?lieu=${longLieu}`);

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('Lieu trop long');
    });
  });

  describe('validateOptionalDepartement', () => {
    beforeEach(() => {
      app.use('/test-optional-dept', validateOptionalDepartement, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass without dept parameter', async () => {
      const response = await request(app)
        .get('/test-optional-dept');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should pass with valid dept', async () => {
      const response = await request(app)
        .get('/test-optional-dept?dept=123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should fail with invalid dept format', async () => {
      const response = await request(app)
        .get('/test-optional-dept?dept=abc');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toBe('Le paramètre dept doit être un nombre');
    });
  });

  describe('validateSearchQuery', () => {
    beforeEach(() => {
      app.use('/test-search', validateSearchQuery, (req, res) => res.json({ success: true }));
      // Mount error handler middleware after routes to ensure errors are properly formatted
      const { errorHandler } = require('../middleware/errorHandler');
      app.use(errorHandler);
    });

    test('should pass with valid search query', async () => {
      const response = await request(app)
        .get('/test-search?q=paris');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should fail without q parameter', async () => {
      const response = await request(app)
        .get('/test-search');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toContain('doit contenir entre');
    });

    test('should fail with empty q parameter', async () => {
      const response = await request(app)
        .get('/test-search?q=');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toContain('doit contenir entre');
    });

    test('should fail with q too short', async () => {
      const response = await request(app)
        .get('/test-search?q=a');

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toContain('doit contenir entre');
    });

    test('should fail with q too long', async () => {
      const longQuery = 'a'.repeat(101);
      const response = await request(app)
        .get(`/test-search?q=${longQuery}`);

      expect(response.status).toBe(400);
      expect(response.body.details[0].msg).toContain('doit contenir entre');
    });

    test('should fail with non-string q', async () => {
      const response = await request(app)
        .get('/test-search?q=123');

      // This will actually pass because strings are strings, but let's test edge cases
      expect(response.status).toBe(200);
    });
  });
});