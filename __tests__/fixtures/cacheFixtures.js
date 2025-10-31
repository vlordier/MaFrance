/**
 * Test Fixtures for Cache Routes
 * Centralized test data and utilities for cache management endpoints
 */

const MOCK_CACHE_ENTRY = {
  key: 'communes_search:paris',
  value: [
    { COG: '75001', commune: 'Paris 1er' },
    { COG: '75002', commune: 'Paris 2e' }
  ],
  expiresAt: new Date(Date.now() + 3600000),
  createdAt: new Date()
};

const MOCK_CACHE_ENTRIES = [
  {
    key: 'communes_search:paris',
    value: ['Paris 1er', 'Paris 2e'],
    expiresAt: new Date(Date.now() + 3600000)
  },
  {
    key: 'communes_search:lyon',
    value: ['Lyon 1er', 'Lyon 2e'],
    expiresAt: new Date(Date.now() + 3600000)
  },
  {
    key: 'communes_details:75001',
    value: { COG: '75001', commune: 'Paris 1er' },
    expiresAt: new Date(Date.now() + 7200000)
  }
];

const MOCK_CACHE_STATS = {
  totalEntries: 1500,
  hitRate: 0.85,
  missRate: 0.15,
  averageResponseTime: 2.5,
  memoryUsage: 104857600, // 100MB in bytes
  lastCleanup: new Date(Date.now() - 3600000)
};

const MOCK_EXPIRED_CACHE_ENTRY = {
  key: 'old_cache_key',
  value: 'expired_data',
  expiresAt: new Date(Date.now() - 1000)
};

// Cache key patterns for testing
const CACHE_PATTERNS = [
  'communes_search:*',
  'communes_details:*',
  'communes_names:*',
  'communes_crime:*',
  'mosques_nearby:*',
  'qpv_search:*'
];

// Test scenarios for cache operations
const CACHE_OPERATIONS = [
  { operation: 'get', key: 'test_key', shouldExist: true },
  { operation: 'set', key: 'new_key', value: 'new_value', ttl: 3600 },
  { operation: 'delete', key: 'old_key', shouldExist: false },
  { operation: 'clear_pattern', pattern: 'communes_*', count: 50 }
];

const VALID_TTL_VALUES = [
  { ttl: 60, valid: true },
  { ttl: 3600, valid: true },
  { ttl: 86400, valid: true },
  { ttl: 604800, valid: true },
  { ttl: -1, valid: false },
  { ttl: 0, valid: false },
  { ttl: 99999999, valid: false }
];

const MOCK_ERROR_SCENARIOS = [
  {
    name: 'Cache backend connection error',
    error: new Error('Redis connection failed'),
    expectedStatus: 500
  },
  {
    name: 'Corrupted cache data',
    error: new Error('Cannot parse cache data'),
    expectedStatus: 500
  },
  {
    name: 'Cache backend timeout',
    error: new Error('Cache operation timeout'),
    expectedStatus: 503
  },
  {
    name: 'Invalid cache key format',
    error: new Error('Invalid key format'),
    expectedStatus: 400
  }
];

const LARGE_CACHE_ENTRY = {
  key: 'large_communes_list',
  value: Array.from({ length: 36000 }, (_, i) => ({
    COG: `${String(i).padStart(5, '0')}`,
    commune: `Commune ${i}`,
    population: Math.floor(Math.random() * 1000000)
  }))
};

// Cache invalidation scenarios
const CACHE_INVALIDATION_SCENARIOS = [
  {
    event: 'new_data_imported',
    patterns: ['communes_*', 'qpv_*'],
    affectedKeys: 150
  },
  {
    event: 'data_updated',
    patterns: ['communes_details:*'],
    affectedKeys: 36000
  },
  {
    event: 'full_cache_flush',
    patterns: ['*'],
    affectedKeys: 5000
  }
];

// Utility functions
const createMockCacheEntryWithOverrides = (overrides = {}) => ({
  ...MOCK_CACHE_ENTRY,
  ...overrides
});

const createMockCacheEntriesArray = (count = 10) => {
  return Array.from({ length: count }, (_, i) => ({
    key: `cache_key_${i}`,
    value: `cache_value_${i}`,
    expiresAt: new Date(Date.now() + Math.random() * 86400000)
  }));
};

const calculateCacheMemoryUsage = (entries) => {
  return entries.reduce((sum, entry) => {
    const keySize = entry.key.length * 2; // rough estimate in bytes
    const valueSize = JSON.stringify(entry.value).length * 2;
    return sum + keySize + valueSize;
  }, 0);
};

const isEntryExpired = (entry) => {
  return new Date() > new Date(entry.expiresAt);
};

const generateCacheKey = (prefix, ...parts) => {
  return `${prefix}:${parts.join(':')}`;
};

const matchCachePattern = (pattern, key) => {
  const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
  return regex.test(key);
};

const createMockCacheStats = (overrides = {}) => ({
  ...MOCK_CACHE_STATS,
  ...overrides
});

const createMockErrorResponse = (message = 'Cache error') => ({
  error: 'Erreur de cache',
  details: message
});

module.exports = {
  // Fixtures
  MOCK_CACHE_ENTRY,
  MOCK_CACHE_ENTRIES,
  MOCK_CACHE_STATS,
  MOCK_EXPIRED_CACHE_ENTRY,
  LARGE_CACHE_ENTRY,

  // Test data for parametrization
  CACHE_PATTERNS,
  CACHE_OPERATIONS,
  VALID_TTL_VALUES,
  MOCK_ERROR_SCENARIOS,
  CACHE_INVALIDATION_SCENARIOS,

  // Utility functions
  createMockCacheEntryWithOverrides,
  createMockCacheEntriesArray,
  calculateCacheMemoryUsage,
  isEntryExpired,
  generateCacheKey,
  matchCachePattern,
  createMockCacheStats,
  createMockErrorResponse
};
