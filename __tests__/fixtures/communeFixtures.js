/**
 * Test Fixtures for Commune Routes
 * Centralized test data and common utilities
 */

// Mock commune data fixtures
const MOCK_COMMUNE = {
  COG: '75001',
  commune: 'Paris 1er Arrondissement',
  population: 16000,
  departement: '75'
};

const MOCK_COMMUNES = [
  {
    COG: '75001',
    commune: 'Paris 1er',
    population: 16000
  },
  {
    COG: '75002',
    commune: 'Paris 2e',
    population: 20000
  }
];

const MOCK_COMMUNE_WITH_ACCENTS = {
  COG: '01001',
  commune: 'L\'Abergement-Clémenciat',
  population: 800
};

const MOCK_COMMUNE_NAMES = {
  musulman_pct: 5.2,
  africain_pct: 3.1,
  asiatique_pct: 1.8,
  traditionnel_pct: 45.6,
  moderne_pct: 44.3,
  annais: 2022
};

const MOCK_COMMUNE_NAMES_HISTORY = [
  {
    musulman_pct: 4.8,
    africain_pct: 2.9,
    annais: 2020
  },
  {
    musulman_pct: 5.2,
    africain_pct: 3.1,
    annais: 2022
  }
];

const MOCK_CRIME_DATA = {
  COG: '75001',
  annee: 2022,
  crimes_violents: 15,
  cambriolages: 8,
  vols: 42
};

const MOCK_CRIME_HISTORY = [
  {
    annee: 2020,
    crimes_violents: 12
  },
  {
    annee: 2022,
    crimes_violents: 15
  }
];

const MOCK_COMMUNE_DETAILS = {
  COG: '75001',
  commune: 'Paris 1er',
  population: 16000,
  insecurite_score: 25.5,
  logements_sociaux_pct: 12.3
};

const MOCK_MAIRE = {
  cog: '75001',
  prenom: 'Jean',
  nom: 'Dupont',
  nuance_politique: 'LREM'
};

const MOCK_NUANCE_MAP = {
  'LREM': 'La République en marche',
  'LREM': 'La République en marche',
  'LRN': 'Rassemblement National',
  'LSOC': 'Parti Socialiste',
  'LLR': 'Les Républicains',
  'UNKNOWN': 'UNKNOWN'
};

// Test data for parametrized tests
const VALID_DEPARTMENTS = ['01', '75', '69', '13', '92'];
const INVALID_DEPARTMENTS = ['999', '00', 'XX', 'ABC'];

const VALID_COGS = ['75001', '69001', '92001', '13001'];
const INVALID_COGS = ['999999', 'invalid', '0', 'XYZ'];

const SEARCH_QUERIES = [
  { query: 'paris', valid: true },
  { query: 'Lyon', valid: true },
  { query: 'Marseille 1', valid: true },
  { query: 'L\'Abergement-Clémenciat', valid: true },
  { query: 'a', valid: false }, // too short for some validations
  { query: 'b', valid: false }
];

const LONG_QUERY = 'a'.repeat(1000);

const SPECIAL_CHARACTERS = [
  { query: "L'Abergement", expected: true },
  { query: 'Châteauroux', expected: true },
  { query: 'Saint-Étienne', expected: true },
  { query: 'Île-de-France', expected: true }
];

const NUANCE_CODES_AND_LABELS = [
  { code: 'LREM', label: 'La République en marche' },
  { code: 'LRN', label: 'Rassemblement National' },
  { code: 'LSOC', label: 'Parti Socialiste' },
  { code: 'LLR', label: 'Les Républicains' },
  { code: 'LEXG', label: 'Extrême gauche' },
  { code: 'LFI', label: 'France Insoumise' },
  { code: 'UNKNOWN', label: 'UNKNOWN' }
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
    name: 'Service unavailable',
    error: new Error('Service unavailable'),
    expectedStatus: 500
  }
];

// Utility functions
const createMockCommuneWithOverrides = (overrides = {}) => ({
  ...MOCK_COMMUNE,
  ...overrides
});

const createMockCommunesArray = (count = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    COG: `${75000 + i}`,
    commune: `Paris ${i + 1}`,
    population: 10000 + i * 1000
  }));
};

const createMockErrorResponse = (message = 'Database error') => ({
  error: 'Erreur de base de données',
  details: message
});

const createValidationErrorResponse = (field) => ({
  errors: [{
    msg: `Validation error for ${field}`
  }]
});

module.exports = {
  // Fixtures
  MOCK_COMMUNE,
  MOCK_COMMUNES,
  MOCK_COMMUNE_WITH_ACCENTS,
  MOCK_COMMUNE_NAMES,
  MOCK_COMMUNE_NAMES_HISTORY,
  MOCK_CRIME_DATA,
  MOCK_CRIME_HISTORY,
  MOCK_COMMUNE_DETAILS,
  MOCK_MAIRE,
  MOCK_NUANCE_MAP,

  // Test data for parametrization
  VALID_DEPARTMENTS,
  INVALID_DEPARTMENTS,
  VALID_COGS,
  INVALID_COGS,
  SEARCH_QUERIES,
  LONG_QUERY,
  SPECIAL_CHARACTERS,
  NUANCE_CODES_AND_LABELS,
  MOCK_ERROR_SCENARIOS,

  // Utility functions
  createMockCommuneWithOverrides,
  createMockCommunesArray,
  createMockErrorResponse,
  createValidationErrorResponse
};
