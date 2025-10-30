const request = require('supertest');
const express = require('express');
const communeRoutes = require('../routes/communeRoutes');

// Mock the database
jest.mock('../config/db', () => ({
  all: jest.fn()
}));

// Mock SearchService
jest.mock('../services/searchService', () => ({
  searchCommunes: jest.fn(),
  getCommuneSuggestions: jest.fn(),
  searchCommunesGlobally: jest.fn()
}));

const db = require('../config/db');
const SearchService = require('../services/searchService');

const app = express();
app.use(express.json());
app.use('/api/communes', communeRoutes);

describe('Commune Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/communes', () => {
    it('should return communes for valid search', async () => {
      const mockResults = [
        {
          COG: '01001',
          commune: 'L\'Abergement-Clémenciat',
          population: 800
        }
      ];

      SearchService.searchCommunes.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/communes?dept=01&q=abergement');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('COG');
      expect(response.body[0]).toHaveProperty('commune');
    });

    it('should handle service errors', async () => {
      SearchService.searchCommunes.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/communes?dept=01&q=test');

      expect(response.status).toBe(500);
    });

    it('should require dept and q parameters', async () => {
      const response = await request(app)
        .get('/api/communes');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/communes/suggestions', () => {
    it('should return suggestions for valid search', async () => {
      const mockSuggestions = [
        'Paris',
        'Paris 1er',
        'Paris 2e'
      ];

      SearchService.getCommuneSuggestions.mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .get('/api/communes/suggestions?dept=75&q=paris');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should handle service errors', async () => {
      SearchService.getCommuneSuggestions.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/communes/suggestions?dept=75&q=test');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/communes/search', () => {
    it('should return global search results for valid query', async () => {
      const mockResults = [
        {
          COG: '75001',
          commune: 'Paris 1er',
          departement: '75'
        }
      ];

      SearchService.searchCommunesGlobally.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/communes/search?q=paris');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for short query', async () => {
      const response = await request(app)
        .get('/api/communes/search?q=pa');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should require q parameter', async () => {
      const response = await request(app)
        .get('/api/communes/search');

      expect(response.status).toBe(400);
    });
  });
});