const SearchService = require('../services/searchService');

// Mock the database
jest.mock('../config/db', () => ({
  all: jest.fn()
}));

const db = require('../config/db');

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      const result = SearchService.levenshteinDistance('test', 'test');

      expect(result).toBe(0);
    });

    it('should return correct distance for single character difference', () => {
      const result = SearchService.levenshteinDistance('test', 'tost');

      expect(result).toBe(1);
    });

    it('should return correct distance for insertions', () => {
      const result = SearchService.levenshteinDistance('test', 'tesst');

      expect(result).toBe(1);
    });

    it('should return correct distance for deletions', () => {
      const result = SearchService.levenshteinDistance('test', 'tst');

      expect(result).toBe(1);
    });

    it('should handle empty strings', () => {
      expect(SearchService.levenshteinDistance('', '')).toBe(0);
      expect(SearchService.levenshteinDistance('', 'a')).toBe(1);
      expect(SearchService.levenshteinDistance('a', '')).toBe(1);
    });

    it('should handle completely different strings', () => {
      const result = SearchService.levenshteinDistance('abc', 'xyz');

      expect(result).toBe(3);
    });

    it('should handle longer strings', () => {
      const result = SearchService.levenshteinDistance('kitten', 'sitting');

      expect(result).toBe(3);
    });
  });

  describe('normalizeText', () => {
    it('should convert to lowercase', () => {
      const result = SearchService.normalizeText('TEST');

      expect(result).toBe('test');
    });

    it('should remove accents', () => {
      const result = SearchService.normalizeText('café');

      expect(result).toBe('cafe');
    });

    it('should handle multiple accents', () => {
      const result = SearchService.normalizeText('naïve façade');

      expect(result).toBe('naive facade');
    });

    it('should handle empty string', () => {
      const result = SearchService.normalizeText('');

      expect(result).toBe('');
    });

    it('should handle strings without accents', () => {
      const result = SearchService.normalizeText('hello world');

      expect(result).toBe('hello world');
    });
  });

  describe('searchCommunes', () => {
    it('should return communes for valid search', async () => {
      const mockRows = [
        {
          commune: 'Test Commune',
          COG: '01001',
          population: 1000
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await SearchService.searchCommunes('01', 'test');

      expect(db.all).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });

    it('should handle short queries by returning popular communes', async () => {
      const mockRows = [
        {
          commune: 'Popular Commune',
          COG: '01001'
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await SearchService.searchCommunes('01', 'a');

      expect(db.all).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });

    it('should handle database errors', async () => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      await expect(SearchService.searchCommunes('01', 'test')).rejects.toThrow('Database error');
    });

    it('should handle empty results', async () => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const result = await SearchService.searchCommunes('01', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should limit results for fuzzy ranking', async () => {
      const mockRows = Array.from({ length: 50 }, (_, i) => ({
        commune: `Commune ${i}`,
        COG: `010${String(i).padStart(2, '0')}`,
        population: 1000
      }));

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await SearchService.searchCommunes('01', 'commune');

      expect(result.length).toBeLessThanOrEqual(10); // Should be limited
    });

    it('should handle special characters in query', async () => {
      const mockRows = [
        {
          commune: 'L\'Abergement-Clémenciat',
          COG: '01001',
          population: 800
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await SearchService.searchCommunes('01', 'l\'abergement');

      expect(result).toEqual(mockRows);
    });
  });

  describe('getCommuneSuggestions', () => {
    it('should return suggestions for valid input', async () => {
      const mockRows = [
        { commune: 'Paris' },
        { commune: 'Paris 1er' },
        { commune: 'Paris 2e' }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await SearchService.getCommuneSuggestions('75', 'paris');

      expect(db.all).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle database errors', async () => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      await expect(SearchService.getCommuneSuggestions('75', 'test')).rejects.toThrow('Database error');
    });

    it('should handle empty results', async () => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const result = await SearchService.getCommuneSuggestions('75', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle short queries', async () => {
      const result = await SearchService.getCommuneSuggestions('75', 'p');

      expect(result).toEqual([]); // Short queries return empty array
    });
  });

  describe('searchCommunesGlobally', () => {
    it('should return global search results', async () => {
      const mockRows = [
        {
          commune: 'Paris',
          COG: '75001',
          departement: '75',
          population: 100000
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await SearchService.searchCommunesGlobally('paris');

      expect(db.all).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });

    it('should handle short queries by returning empty array', async () => {
      const result = await SearchService.searchCommunesGlobally('pa');

      expect(result).toEqual([]);
      expect(db.all).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      await expect(SearchService.searchCommunesGlobally('test')).rejects.toThrow('Database error');
    });

    it('should limit results', async () => {
      const mockResults = Array.from({ length: 20 }, (_, i) => ({
        COG: `0100${i}`,
        commune: `Commune ${i}`,
        departement: '01',
        population: 1000 + i
      }));

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      const result = await SearchService.searchCommunesGlobally('commune');

      expect(result.length).toBeLessThanOrEqual(15); // GLOBAL_SEARCH_LIMIT is 15
    });

    it('should handle empty results', async () => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const result = await SearchService.searchCommunesGlobally('definitelynotacommunename');

      expect(result).toEqual([]);
    });

    it('should handle special characters in global search', async () => {
      const mockRows = [
        {
          commune: 'L\'Abergement-Clémenciat',
          COG: '01001',
          departement: '01',
          population: 800
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await SearchService.searchCommunesGlobally('l\'abergement');

      expect(result).toEqual(mockRows);
    });
  });
});