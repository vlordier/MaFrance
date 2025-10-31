// Import the route module to get the class
const { handleGetAll, handleGetDetails, handleGetNames, handleGetNamesHistory, handleGetCrime, handleGetCrimeHistory, handleGetPrefet } = require('../../routes/departementRoutes');

// Mock the database
jest.mock('../../config/db');
const db = require('../../config/db');



describe('DepartementRoute Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetAll', () => {
    it('should return all departments sorted by code', async () => {
      const mockDepartments = [
        { departement: '95' },
        { departement: '01' },
        { departement: '75' }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockDepartments);
      });

      const req = {};
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetAll(req, res, next);

      // Should be sorted by padded department code
      expect(res.json).toHaveBeenCalledWith([
        { departement: '01' },
        { departement: '75' },
        { departement: '95' }
      ]);
    });
  });

  describe('handleGetDetails', () => {
    it('should return department details', async () => {
      const mockDetails = {
        departement: '75',
        population: 2161000,
        insecurite_score: 7.2,
        pop_in_qpv_pct: 15.5
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockDetails);
      });

      const req = { query: { dept: '75' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetDetails(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockDetails);
    });

    it('should handle single digit department codes', async () => {
      const mockDetails = {
        departement: '01',
        population: 650000,
        insecurite_score: 3.1
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockDetails);
      });

      const req = { query: { dept: '1' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetDetails(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockDetails);
    });
  });

  describe('handleGetNames', () => {
    it('should return latest names data for department', async () => {
      const mockNames = {
        dpt: '75',
        musulman_pct: 12.5,
        africain_pct: 8.3,
        annais: 2022
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockNames);
      });

      const req = { query: { dept: '75' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetNames(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockNames);
    });
  });

  describe('handleGetNamesHistory', () => {
    it('should return names history for department', async () => {
      const mockHistory = [
        { dpt: '75', annais: 2020, musulman_pct: 11.2 },
        { dpt: '75', annais: 2021, musulman_pct: 11.8 }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockHistory);
      });

      const req = { query: { dept: '75' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetNamesHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });
  });

  describe('handleGetCrime', () => {
    it('should return latest crime data for department', async () => {
      const mockCrime = {
        dep: '75',
        homicides_p100k: 1.8,
        violences_physiques_p1k: 25.3,
        annee: 2022
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCrime);
      });

      const req = { query: { dept: '75' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetCrime(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockCrime);
    });
  });

  describe('handleGetCrimeHistory', () => {
    it('should return crime history for department', async () => {
      const mockHistory = [
        { dep: '75', annee: 2020, homicides_p100k: 1.5 },
        { dep: '75', annee: 2021, homicides_p100k: 1.6 }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockHistory);
      });

      const req = { query: { dept: '75' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetCrimeHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });
  });

  describe('handleGetPrefet', () => {
    it('should return prefect information for department', async () => {
      const mockPrefect = {
        code: '75',
        prenom: 'Michel',
        nom: 'Delpuech',
        date_poste: '2022-01-01'
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockPrefect);
      });

      const req = { query: { dept: '75' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetPrefet(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockPrefect);
    });
  });
});