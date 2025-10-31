/**
 * Test Fixtures for QPV Routes
 * Centralized test data and common utilities for Priority Neighborhoods (Quartiers Prioritaires de la Ville)
 */

const MOCK_QPV = {
  id: 1,
  qpv_code: 'FR001001',
  qpv_name: 'Les Minguettes',
  commune: 'Vénissieux',
  cog: '69259',
  region: 'Auvergne-Rhône-Alpes',
  population: 45000,
  surface_hectares: 320
};

const MOCK_QPVS = [
  {
    id: 1,
    qpv_code: 'FR001001',
    qpv_name: 'Les Minguettes',
    commune: 'Vénissieux',
    cog: '69259'
  },
  {
    id: 2,
    qpv_code: 'FR001002',
    qpv_name: 'Grappinière',
    commune: 'Lyon',
    cog: '69123'
  }
];

const MOCK_QPV_DETAILS = {
  id: 1,
  qpv_code: 'FR001001',
  qpv_name: 'Les Minguettes',
  commune: 'Vénissieux',
  cog: '69259',
  region: 'Auvergne-Rhône-Alpes',
  population: 45000,
  surface_hectares: 320,
  unemployment_rate: 18.5,
  median_income: 18500,
  school_completion_rate: 72.3
};

const MOCK_QPV_WITH_ACCENTS = {
  qpv_code: 'FR001003',
  qpv_name: 'Les Halles d\'Orly',
  commune: 'L\'Haÿ-les-Roses'
};

const MOCK_QPV_GEOJSON = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [4.8357, 45.7640],
        [4.8400, 45.7640],
        [4.8400, 45.7680],
        [4.8357, 45.7680],
        [4.8357, 45.7640]
      ]
    ]
  },
  properties: {
    qpv_code: 'FR001001',
    qpv_name: 'Les Minguettes'
  }
};

// Test data for parametrized tests
const VALID_COGS = ['69259', '75001', '13001', '92001'];
const INVALID_COGS = ['999999', 'invalid', '0', 'XYZ'];

const VALID_QPV_CODES = ['FR001001', 'FR001002', 'FR001003'];
const INVALID_QPV_CODES = ['INVALID', '999999', 'FR999999', ''];

const SEARCH_QUERIES = [
  { query: 'Minguettes', valid: true },
  { query: 'Lyon', valid: true },
  { query: 'Grappinière', valid: true },
  { query: 'a', valid: false }
];

const SPECIAL_CHARACTERS = [
  { query: "L'Haÿ-les-Roses", expected: true },
  { query: 'Châteauroux', expected: true },
  { query: 'Saint-Étienne', expected: true }
];

const STATISTICS_TYPES = [
  'unemployment_rate',
  'median_income',
  'school_completion_rate',
  'poverty_rate',
  'population_density'
];

const GEOGRAPHIC_BOUNDS = [
  {
    bounds: { minLat: 42.0, maxLat: 51.0, minLon: -6.0, maxLon: 8.0 },
    valid: true
  },
  {
    bounds: { minLat: 90, maxLat: -90, minLon: 0, maxLon: 1 },
    valid: false
  },
  {
    bounds: { minLat: 45, maxLat: 45, minLon: 5, maxLon: 5 },
    valid: true
  }
];

const MOCK_ERROR_SCENARIOS = [
  {
    name: 'Database connection error',
    error: new Error('Database connection failed'),
    expectedStatus: 500
  },
  {
    name: 'GeoJSON parsing error',
    error: new Error('Invalid GeoJSON'),
    expectedStatus: 500
  },
  {
    name: 'Invalid coordinates',
    error: new Error('Invalid geographic bounds'),
    expectedStatus: 400
  }
];

const LONG_QUERY = 'a'.repeat(1000);

// Utility functions
const createMockQPVWithOverrides = (overrides = {}) => ({
  ...MOCK_QPV,
  ...overrides
});

const createMockQPVsArray = (count = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    qpv_code: `FR001${String(i + 1).padStart(3, '0')}`,
    qpv_name: `QPV ${i + 1}`,
    commune: `City ${i + 1}`,
    cog: `${69000 + i}`
  }));
};

const createMockQPVWithStatistics = (statistics = {}) => ({
  ...MOCK_QPV_DETAILS,
  unemployment_rate: statistics.unemployment_rate || 18.5,
  median_income: statistics.median_income || 18500,
  school_completion_rate: statistics.school_completion_rate || 72.3
});

const createMockErrorResponse = (message = 'Service error') => ({
  error: 'Erreur de service',
  details: message
});

const validateBounds = (bounds) => {
  if (!bounds || typeof bounds !== 'object') return false;
  const { minLat, maxLat, minLon, maxLon } = bounds;
  return minLat >= -90 && maxLat <= 90 && minLon >= -180 && maxLon <= 180 &&
    minLat < maxLat && minLon < maxLon;
};

module.exports = {
  // Fixtures
  MOCK_QPV,
  MOCK_QPVS,
  MOCK_QPV_DETAILS,
  MOCK_QPV_WITH_ACCENTS,
  MOCK_QPV_GEOJSON,

  // Test data for parametrization
  VALID_COGS,
  INVALID_COGS,
  VALID_QPV_CODES,
  INVALID_QPV_CODES,
  SEARCH_QUERIES,
  SPECIAL_CHARACTERS,
  STATISTICS_TYPES,
  GEOGRAPHIC_BOUNDS,
  MOCK_ERROR_SCENARIOS,
  LONG_QUERY,

  // Utility functions
  createMockQPVWithOverrides,
  createMockQPVsArray,
  createMockQPVWithStatistics,
  createMockErrorResponse,
  validateBounds
};
