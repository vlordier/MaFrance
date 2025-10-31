# Test Fixtures Guide

This directory contains centralized test fixtures for the MaFrance test suite. Using centralized fixtures improves test maintainability, consistency, and enables parametrized testing patterns.

## Available Fixture Files

### `communeFixtures.js`
Test fixtures for commune routes endpoints.

**Mock Objects:**
- `MOCK_COMMUNE` - Single commune object with basic properties
- `MOCK_COMMUNES` - Array of multiple communes
- `MOCK_COMMUNE_WITH_ACCENTS` - Commune with special characters
- `MOCK_COMMUNE_NAMES` - Demographic data for communes
- `MOCK_COMMUNE_NAMES_HISTORY` - Historical demographic data
- `MOCK_CRIME_DATA` - Crime statistics for a commune
- `MOCK_CRIME_HISTORY` - Historical crime data
- `MOCK_COMMUNE_DETAILS` - Detailed commune information
- `MOCK_MAIRE` - Mayor information

**Parametrization Data:**
- `VALID_DEPARTMENTS` - Array of valid French department codes
- `INVALID_DEPARTMENTS` - Array of invalid department codes for error testing
- `VALID_COGS` - Array of valid commune codes
- `INVALID_COGS` - Array of invalid commune codes
- `SEARCH_QUERIES` - Array of search query test cases
- `SPECIAL_CHARACTERS` - Array of queries with special characters/accents
- `NUANCE_CODES_AND_LABELS` - Political party code mappings
- `MOCK_ERROR_SCENARIOS` - Array of error test cases with expected status codes

**Utility Functions:**
- `createMockCommuneWithOverrides(overrides)` - Create customized commune mock
- `createMockCommunesArray(count)` - Create array of N communes
- `createMockErrorResponse(message)` - Create standard error response
- `createValidationErrorResponse(field)` - Create validation error response

**Usage Example:**
```javascript
const { MOCK_COMMUNE, createMockCommuneWithOverrides, VALID_DEPARTMENTS } = require('./fixtures/communeFixtures');

// Use mock directly
const commune = MOCK_COMMUNE;

// Use with overrides
const customCommune = createMockCommuneWithOverrides({ population: 50000 });

// Use parametrization data
VALID_DEPARTMENTS.forEach(dept => {
  it(`should handle department ${dept}`, () => {
    // test code
  });
});
```

### `mosqueFixtures.js`
Test fixtures for mosque routes endpoints.

**Mock Objects:**
- `MOCK_MOSQUE` - Single mosque with location and amenities
- `MOCK_MOSQUES` - Array of multiple mosques
- `MOCK_MOSQUE_DETAILS` - Detailed mosque information
- `MOCK_MOSQUE_WITH_ACCENTS` - Mosque with special characters

**Parametrization Data:**
- `VALID_COORDINATES` - Array of valid lat/lon coordinates
- `INVALID_COORDINATES` - Array of invalid coordinates for error testing
- `AMENITIES_OPTIONS` - Available amenity types
- `RADIUS_VALUES` - Valid and invalid search radius values
- `SEARCH_QUERIES` - Search query test cases
- `SPECIAL_CHARACTERS` - Queries with special characters

**Utility Functions:**
- `createMockMosqueWithOverrides(overrides)` - Create customized mosque
- `createMockMosquesArray(count)` - Create array of N mosques
- `createMockMosqueWithAmenities(amenities)` - Create mosque with specific amenities
- `calculateDistance(lat1, lon1, lat2, lon2)` - Calculate distance between points

### `qpvFixtures.js`
Test fixtures for QPV (Priority Neighborhoods) routes.

**Mock Objects:**
- `MOCK_QPV` - Single QPV with basic properties
- `MOCK_QPVS` - Array of multiple QPVs
- `MOCK_QPV_DETAILS` - Detailed QPV information with statistics
- `MOCK_QPV_WITH_ACCENTS` - QPV with special characters
- `MOCK_QPV_GEOJSON` - GeoJSON formatted QPV for geographic testing

**Parametrization Data:**
- `VALID_QPV_CODES` - Array of valid QPV codes
- `INVALID_QPV_CODES` - Array of invalid QPV codes
- `GEOGRAPHIC_BOUNDS` - Array of geographic boundary test cases
- `STATISTICS_TYPES` - Available statistics fields
- `SEARCH_QUERIES` - Search query test cases

**Utility Functions:**
- `createMockQPVWithOverrides(overrides)` - Create customized QPV
- `createMockQPVsArray(count)` - Create array of N QPVs
- `createMockQPVWithStatistics(statistics)` - Create QPV with custom statistics
- `validateBounds(bounds)` - Validate geographic boundaries

### `cacheFixtures.js`
Test fixtures for cache management endpoints.

**Mock Objects:**
- `MOCK_CACHE_ENTRY` - Single cache entry with TTL
- `MOCK_CACHE_ENTRIES` - Array of multiple cache entries
- `MOCK_CACHE_STATS` - Cache statistics snapshot
- `MOCK_EXPIRED_CACHE_ENTRY` - Expired cache entry
- `LARGE_CACHE_ENTRY` - Large dataset for stress testing

**Parametrization Data:**
- `CACHE_PATTERNS` - Common cache key patterns
- `CACHE_OPERATIONS` - Types of cache operations
- `VALID_TTL_VALUES` - Array of TTL test cases
- `CACHE_INVALIDATION_SCENARIOS` - Cache invalidation test cases
- `MOCK_ERROR_SCENARIOS` - Cache-specific error scenarios

**Utility Functions:**
- `createMockCacheEntryWithOverrides(overrides)` - Create customized cache entry
- `createMockCacheEntriesArray(count)` - Create array of N cache entries
- `isEntryExpired(entry)` - Check if cache entry has expired
- `matchCachePattern(pattern, key)` - Check if key matches pattern
- `generateCacheKey(prefix, ...parts)` - Generate cache key from parts
- `calculateCacheMemoryUsage(entries)` - Calculate total memory usage

## Usage Patterns

### Parametrized Testing with `describe.each` or `test.each`

```javascript
const { VALID_DEPARTMENTS, INVALID_DEPARTMENTS } = require('./fixtures/communeFixtures');

describe('Department Validation', () => {
  VALID_DEPARTMENTS.forEach(dept => {
    it(`should accept valid department ${dept}`, async () => {
      const response = await request(app).get(`/communes?dept=${dept}&q=test`);
      expect(response.status).toBe(200);
    });
  });

  INVALID_DEPARTMENTS.forEach(dept => {
    it(`should reject invalid department ${dept}`, async () => {
      const response = await request(app).get(`/communes?dept=${dept}&q=test`);
      expect(response.status).toBe(400);
    });
  });
});
```

### Using Mock Data with Overrides

```javascript
const { createMockCommuneWithOverrides } = require('./fixtures/communeFixtures');

db.get.mockImplementation((query, params, callback) => {
  const customCommune = createMockCommuneWithOverrides({
    population: 100000,
    commune: 'Custom City'
  });
  callback(null, customCommune);
});
```

### Testing Error Scenarios

```javascript
const { MOCK_ERROR_SCENARIOS } = require('./fixtures/communeFixtures');

MOCK_ERROR_SCENARIOS.forEach(({ name, error, expectedStatus }) => {
  it(`should handle ${name}`, async () => {
    SearchService.searchCommunes.mockRejectedValue(error);
    const response = await request(app).get('/api/communes?dept=75&q=test');
    expect(response.status).toBe(expectedStatus);
  });
});
```

## Best Practices

1. **Always use fixtures for mock data** - Don't hardcode test data in test files
2. **Create data generators** - Use utility functions to create varied test data
3. **Group related tests** - Use `describe` blocks to organize test scenarios
4. **Keep fixtures DRY** - Reuse utility functions instead of duplicating data creation
5. **Document fixture purposes** - Add comments explaining what each fixture represents
6. **Use parametrization** - Leverage `test.each` or `forEach` for multiple test cases
7. **Update fixtures together** - When changing data structure, update fixtures and all consuming tests

## Adding New Fixtures

When adding new fixtures:

1. Create a new file in `__tests__/fixtures/` following naming convention: `<feature>Fixtures.js`
2. Export mock objects, parametrization data, and utility functions
3. Add comprehensive comments
4. Include examples of usage in JSDoc comments
5. Update this README with the new fixture file description
6. Use the new fixtures in test files with `require('./fixtures/<feature>Fixtures.js')`

## Maintenance

- Keep mock data synchronized with actual database schema
- Update error scenarios when new error types are added
- Review and refresh parametrization data annually
- Remove unused fixtures to keep file size manageable
