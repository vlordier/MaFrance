/**
 * Test Fixtures for Mosque Routes
 * Centralized test data and common utilities
 */

const MOCK_MOSQUE = {
  id: 1,
  latitude: 48.8566,
  longitude: 2.3522,
  commune: 'Paris 1er',
  cog: '75001',
  num_telephone: '0123456789',
  adresse_complete: '123 Rue de Rivoli, 75001 Paris',
  capacite: 500,
  amenagements: 'parking,ablutions,restaurant'
};

const MOCK_MOSQUES = [
  {
    id: 1,
    latitude: 48.8566,
    longitude: 2.3522,
    commune: 'Paris 1er',
    cog: '75001'
  },
  {
    id: 2,
    latitude: 48.8606,
    longitude: 2.2945,
    commune: 'Paris 7e',
    cog: '75007'
  }
];

const MOCK_MOSQUE_DETAILS = {
  id: 1,
  latitude: 48.8566,
  longitude: 2.3522,
  commune: 'Paris 1er',
  cog: '75001',
  num_telephone: '0123456789',
  adresse_complete: '123 Rue de Rivoli, 75001 Paris',
  capacite: 500,
  amenagements: 'parking,ablutions,restaurant,WC,espace_enfants'
};

const MOCK_MOSQUE_WITH_ACCENTS = {
  id: 3,
  commune: 'L\'Île-de-France',
  adresse_complete: 'Rue de l\'Église, Châteauroux'
};

// Test data for parametrized tests
const VALID_COGS = ['75001', '69001', '92001', '13001'];
const INVALID_COGS = ['999999', 'invalid', '0', 'XYZ'];

const VALID_COORDINATES = [
  { latitude: 48.8566, longitude: 2.3522 },
  { latitude: 43.2965, longitude: 5.3698 },
  { latitude: 45.7640, longitude: 4.8357 },
  { latitude: 50.6292, longitude: 3.0573 }
];

const INVALID_COORDINATES = [
  { latitude: 91, longitude: 2 }, // latitude out of range
  { latitude: 48, longitude: 181 }, // longitude out of range
  { latitude: -91, longitude: 0 }, // latitude out of range
  { latitude: 48, longitude: 'abc' }, // invalid type
  { latitude: null, longitude: 2 } // null value
];

const SEARCH_QUERIES = [
  { query: 'paris', valid: true },
  { query: 'Lyon', valid: true },
  { query: 'Marseille', valid: true },
  { query: 'L\'Île-de-France', valid: true },
  { query: 'a', valid: false }
];

const SPECIAL_CHARACTERS = [
  { query: "L'Abergement", expected: true },
  { query: 'Châteauroux', expected: true },
  { query: 'Saint-Étienne', expected: true }
];

const AMENITIES_OPTIONS = [
  'parking',
  'ablutions',
  'restaurant',
  'WC',
  'espace_enfants',
  'biblio',
  'salle_reunion'
];

const RADIUS_VALUES = [
  { radius: 0.5, valid: true },
  { radius: 1, valid: true },
  { radius: 5, valid: true },
  { radius: 10, valid: true },
  { radius: 0.1, valid: false }, // too small
  { radius: 100, valid: false } // too large
];

const MOCK_ERROR_SCENARIOS = [
  {
    name: 'Database connection error',
    error: new Error('Database connection failed'),
    expectedStatus: 500
  },
  {
    name: 'Timeout error',
    error: new Error('Query timeout'),
    expectedStatus: 500
  },
  {
    name: 'Invalid coordinates',
    error: new Error('Invalid coordinates'),
    expectedStatus: 400
  }
];

const LONG_QUERY = 'a'.repeat(1000);

// Utility functions
const createMockMosqueWithOverrides = (overrides = {}) => ({
  ...MOCK_MOSQUE,
  ...overrides
});

const createMockMosquesArray = (count = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    latitude: 48.8566 + (i * 0.01),
    longitude: 2.3522 + (i * 0.01),
    commune: `Paris ${i + 1}`,
    cog: `7500${i + 1}`
  }));
};

const createMockMosqueWithAmenities = (amenities = []) => ({
  ...MOCK_MOSQUE_DETAILS,
  amenagements: amenities.join(',')
});

const createMockErrorResponse = (message = 'Service error') => ({
  error: 'Erreur de service',
  details: message
});

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

module.exports = {
  // Fixtures
  MOCK_MOSQUE,
  MOCK_MOSQUES,
  MOCK_MOSQUE_DETAILS,
  MOCK_MOSQUE_WITH_ACCENTS,

  // Test data for parametrization
  VALID_COGS,
  INVALID_COGS,
  VALID_COORDINATES,
  INVALID_COORDINATES,
  SEARCH_QUERIES,
  SPECIAL_CHARACTERS,
  AMENITIES_OPTIONS,
  RADIUS_VALUES,
  MOCK_ERROR_SCENARIOS,
  LONG_QUERY,

  // Utility functions
  createMockMosqueWithOverrides,
  createMockMosquesArray,
  createMockMosqueWithAmenities,
  createMockErrorResponse,
  calculateDistance
};
