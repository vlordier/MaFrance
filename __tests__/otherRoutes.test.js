const request = require('supertest');
const express = require('express');
const otherRoutes = require('../routes/otherRoutes');

// Mock the database
jest.mock('../config/db', () => ({
  all: jest.fn()
}));

const db = require('../config/db');

const app = express();
app.use(express.json());
app.use('/api', otherRoutes);

describe('Other Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/search', () => {
    it('should return filtered communes for valid search', async () => {
      const mockRows = [
        {
          COG: '01001',
          departement: '01',
          commune: 'L\'Abergement-Clémenciat',
          population: 800,
          insecurite_score: 5.2,
          immigration_score: 3.1,
          islamisation_score: 2.8,
          defrancisation_score: 1.5,
          wokisme_score: 4.0,
          number_of_mosques: 0,
          mosque_p100k: 0,
          total_qpv: 0,
          pop_in_qpv_pct: 0
        },
        {
          COG: '01002',
          departement: '01',
          commune: 'L\'Abergement-de-Varey',
          population: 250,
          insecurite_score: 2.1,
          immigration_score: 1.2,
          islamisation_score: 1.0,
          defrancisation_score: 0.8,
          wokisme_score: 2.5,
          number_of_mosques: 0,
          mosque_p100k: 0,
          total_qpv: 0,
          pop_in_qpv_pct: 0
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const response = await request(app)
        .get('/api/search?dept=01&q=abergement');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('COG');
      expect(response.body[0]).toHaveProperty('commune');
    });

    it('should handle database errors', async () => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/search?dept=01&q=test');

      expect(response.status).toBe(500);
    });

    it('should require dept and q parameters', async () => {
      const response = await request(app)
        .get('/api/search');

      expect(response.status).toBe(400);
    });
  });
});