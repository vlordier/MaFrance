// Import the route module to get the class
const { handleGetDetails, handleGetNames, handleGetNamesHistory, handleGetCrime, handleGetCrimeHistory, handleGetMinistre } = require('../../routes/countryRoutes');

// Mock the database
jest.mock('../../config/db');
const db = require('../../config/db');



describe('CountryRoute Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetDetails', () => {
    it('should return all countries when no country specified', async () => {
      const mockCountries = [
        { country: 'France', population: 67000000 },
        { country: 'Germany', population: 83000000 }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCountries);
      });

      const req = { query: {} };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetDetails(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockCountries);
    });

    it('should filter by specific country', async () => {
      const mockCountry = [{ country: 'France', population: 67000000 }];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCountry);
      });

      const req = { query: { country: 'France' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetDetails(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockCountry);
    });
  });

  describe('handleGetNames', () => {
    it('should return latest names data for all countries', async () => {
      const mockNames = [
        { country: 'France', musulman_pct: 8.5, annais: 2022 },
        { country: 'Germany', musulman_pct: 6.2, annais: 2022 }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockNames);
      });

      const req = { query: {} };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetNames(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockNames);
    });

    it('should filter by specific country', async () => {
      const mockNames = [{ country: 'France', musulman_pct: 8.5, annais: 2022 }];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockNames);
      });

      const req = { query: { country: 'France' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetNames(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockNames);
    });
  });

  describe('handleGetNamesHistory', () => {
    it('should return names history for all countries', async () => {
      const mockHistory = [
        { country: 'France', annais: 2020, musulman_pct: 7.8 },
        { country: 'France', annais: 2021, musulman_pct: 8.1 }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockHistory);
      });

      const req = { query: {} };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetNamesHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });

    it('should filter history by specific country', async () => {
      const mockHistory = [
        { country: 'France', annais: 2020, musulman_pct: 7.8 }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockHistory);
      });

      const req = { query: { country: 'France' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetNamesHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });
  });

  describe('handleGetCrime', () => {
    it('should return latest crime data for all countries', async () => {
      const mockCrime = [
        { country: 'France', homicides_p100k: 1.2, annee: 2022 }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCrime);
      });

      const req = { query: {} };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetCrime(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockCrime);
    });

    it('should filter by specific country', async () => {
      const mockCrime = [{ country: 'France', homicides_p100k: 1.2, annee: 2022 }];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCrime);
      });

      const req = { query: { country: 'France' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetCrime(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockCrime);
    });
  });

  describe('handleGetCrimeHistory', () => {
    it('should return crime history for all countries', async () => {
      const mockHistory = [
        { country: 'France', annee: 2020, homicides_p100k: 1.0 }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockHistory);
      });

      const req = { query: {} };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetCrimeHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });

    it('should filter history by specific country', async () => {
      const mockHistory = [
        { country: 'France', annee: 2020, homicides_p100k: 1.0 }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockHistory);
      });

      const req = { query: { country: 'France' } };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetCrimeHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });
  });

  describe('handleGetMinistre', () => {
    it('should return minister information for France', async () => {
      const mockMinister = {
        country: 'France',
        prenom: 'Gérald',
        nom: 'Darmanin',
        date_mandat: '2020-01-01',
        famille_nuance: 'LR',
        nuance_politique: 'LR'
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockMinister);
      });

      const req = { query: {} };
      const res = { json: jest.fn() };
      const next = jest.fn();

      handleGetMinistre(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockMinister);
    });
  });
});