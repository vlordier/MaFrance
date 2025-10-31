# Test Refactoring Pattern Guide

This guide demonstrates the pattern used to refactor `communeRoutes.test.js` that can be applied to other route test files.

## Pattern Overview

The refactored test structure follows this pattern:

```
describe('Feature Routes', () => {
  // Setup
  beforeEach(() => {
    // Create app and clear mocks
  });

  // Organized by endpoint
  describe('GET /api/route/endpoint', () => {
    // Organized by scenario type
    describe('Valid requests', () => {
      // Happy path tests
    });

    describe('Parameter validation', () => {
      // Input validation tests
    });

    describe('Error handling', () => {
      // Error scenario tests (parametrized)
    });
  });

  // Edge cases and cross-cutting concerns
  describe('Edge cases and boundary conditions', () => {
    // Null/undefined handling
    // Data type edge cases
    // Concurrent requests
    // Response format
  });
});
```

## Step-by-Step Refactoring Process

### Step 1: Create Fixtures
Create `__tests__/fixtures/<feature>Fixtures.js` with:
- Mock objects for each data type
- Parametrization arrays (valid/invalid inputs)
- Utility functions for common mock creation
- Error scenarios with expected status codes

**Example fixture structure:**
```javascript
// Mock objects
const MOCK_ITEM = { /* ... */ };
const MOCK_ITEMS = [/* ... */];

// Parametrization data
const VALID_INPUTS = ['val1', 'val2'];
const INVALID_INPUTS = ['invalid1', 'invalid2'];
const ERROR_SCENARIOS = [
  { name: 'error type', error: new Error(), expectedStatus: 500 }
];

// Utilities
const createMockWithOverrides = (overrides = {}) => ({
  ...MOCK_ITEM,
  ...overrides
});

module.exports = {
  MOCK_ITEM,
  MOCK_ITEMS,
  VALID_INPUTS,
  INVALID_INPUTS,
  ERROR_SCENARIOS,
  createMockWithOverrides
};
```

### Step 2: Import and Setup
Replace hardcoded mock data with imports from fixtures:

```javascript
const request = require('supertest');
const express = require('express');
const routes = require('../routes/featureRoutes');
const {
  MOCK_ITEM,
  MOCK_ITEMS,
  VALID_INPUTS,
  INVALID_INPUTS,
  ERROR_SCENARIOS,
  createMockWithOverrides
} = require('./fixtures/featureFixtures');

// Mock dependencies
jest.mock('../config/db', () => ({
  all: jest.fn(),
  get: jest.fn()
}));

jest.mock('../services/serviceModule', () => ({
  searchItems: jest.fn()
}));

const db = require('../config/db');
const Service = require('../services/serviceModule');

let app;

const createApp = () => {
  const newApp = express();
  newApp.use(express.json());
  newApp.use('/api/feature', routes);
  return newApp;
};

describe('Feature Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });
  // ... tests follow
});
```

### Step 3: Organize Tests by Endpoint
Group tests by endpoint and scenario type:

```javascript
describe('GET /api/feature/endpoint', () => {
  describe('Valid requests', () => {
    it('should return data for valid request', async () => {
      Service.searchItems.mockResolvedValue(MOCK_ITEMS);
      const response = await request(app)
        .get('/api/feature/endpoint?param=value');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle empty results', async () => {
      Service.searchItems.mockResolvedValue([]);
      const response = await request(app)
        .get('/api/feature/endpoint?param=value');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(0);
    });
  });

  describe('Parameter validation', () => {
    INVALID_INPUTS.forEach(input => {
      it(`should reject invalid input: ${input}`, async () => {
        const response = await request(app)
          .get(`/api/feature/endpoint?param=${encodeURIComponent(input)}`);
        expect(response.status).toBe(400);
      });
    });
  });

  describe('Error handling', () => {
    ERROR_SCENARIOS.forEach(({ name, error, expectedStatus }) => {
      it(`should handle ${name}`, async () => {
        Service.searchItems.mockRejectedValue(error);
        const response = await request(app)
          .get('/api/feature/endpoint?param=test');
        expect(response.status).toBe(expectedStatus);
      });
    });
  });
});
```

### Step 4: Add Edge Cases
Include comprehensive edge case testing:

```javascript
describe('Edge cases and boundary conditions', () => {
  describe('Null and undefined handling', () => {
    it('should handle null values', async () => {
      db.get.mockImplementation((query, params, callback) => {
        callback(null, null);
      });
      const response = await request(app).get('/api/feature/endpoint?param=test');
      expect(response.status).toBe(404);
    });
  });

  describe('Data type edge cases', () => {
    it('should handle zero values', async () => {
      const mockWithZero = createMockWithOverrides({ population: 0 });
      db.get.mockImplementation((q, p, cb) => cb(null, mockWithZero));
      const response = await request(app).get('/api/feature/endpoint?param=test');
      expect(response.status).toBe(200);
      expect(response.body.population).toBe(0);
    });

    it('should handle very large numbers', async () => {
      const mockWithLarge = createMockWithOverrides({ value: 999999999 });
      db.get.mockImplementation((q, p, cb) => cb(null, mockWithLarge));
      const response = await request(app).get('/api/feature/endpoint?param=test');
      expect(response.status).toBe(200);
      expect(response.body.value).toBe(999999999);
    });
  });

  describe('Response format consistency', () => {
    it('should always return JSON', async () => {
      Service.searchItems.mockResolvedValue(MOCK_ITEMS);
      const response = await request(app).get('/api/feature/endpoint?param=test');
      expect(response.type).toContain('application/json');
    });

    it('should include proper HTTP headers', async () => {
      Service.searchItems.mockResolvedValue(MOCK_ITEMS);
      const response = await request(app).get('/api/feature/endpoint?param=test');
      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});
```

## Key Improvements from This Pattern

### 1. Maintainability
- Mock data centralized in fixtures
- Changes propagate automatically to all tests
- Single source of truth for test data

### 2. Readability
- Clear describe hierarchy shows test organization
- Descriptive test names explain what's being tested
- Logical grouping makes failures easy to locate

### 3. Coverage
- Parametrized tests cover multiple scenarios efficiently
- Edge cases systematically tested
- Error scenarios included with proper assertions

### 4. Reusability
- Fixtures used across multiple test files
- Utility functions eliminate duplication
- Patterns can be extended to new routes

### 5. Scalability
- Easy to add new test scenarios
- Simple to extend existing test categories
- New parametrization data requires minimal changes

## Common Parametrization Patterns

### Valid/Invalid Input Testing
```javascript
const VALID_VALUES = ['value1', 'value2'];
const INVALID_VALUES = ['invalid1', 'invalid2'];

VALID_VALUES.forEach(val => {
  it(`should accept ${val}`, async () => {
    // expect success
  });
});

INVALID_VALUES.forEach(val => {
  it(`should reject ${val}`, async () => {
    // expect error
  });
});
```

### Error Scenario Testing
```javascript
const ERROR_SCENARIOS = [
  { name: 'Connection error', error: new Error('Connection failed'), expectedStatus: 500 },
  { name: 'Timeout error', error: new Error('Timeout'), expectedStatus: 500 }
];

ERROR_SCENARIOS.forEach(({ name, error, expectedStatus }) => {
  it(`should handle ${name}`, async () => {
    Service.method.mockRejectedValue(error);
    const response = await request(app).get('/api/endpoint');
    expect(response.status).toBe(expectedStatus);
  });
});
```

### Special Character Testing
```javascript
const SPECIAL_CHARS = [
  { query: "L'Abergement", expected: true },
  { query: 'Châteauroux', expected: true }
];

SPECIAL_CHARS.forEach(({ query, expected }) => {
  it(`should handle "${query}"`, async () => {
    const response = await request(app)
      .get(`/api/endpoint?q=${encodeURIComponent(query)}`);
    expect(response.status).toBe(expected ? 200 : 400);
  });
});
```

## Best Practices

1. **Create fixtures first** - Design test data structure before writing tests
2. **Use utility functions** - Create mock generators instead of duplicating data
3. **Organize logically** - Group related tests in describe blocks
4. **Parametrize repetitive tests** - Use forEach for multiple similar test cases
5. **Include edge cases** - Test boundaries, null values, and extreme cases
6. **Test error paths** - Include error scenarios with proper status codes
7. **Keep tests DRY** - Use fixtures and utilities to reduce duplication
8. **Document fixtures** - Add clear comments explaining mock data purposes

## Applying to Other Routes

To refactor other route test files:

1. Check if fixtures exist for the route (if not, create them)
2. Import fixtures at the top of the test file
3. Replace hardcoded mock data with fixture imports
4. Reorganize tests into describe blocks by endpoint
5. Add parametrized tests for validation
6. Include edge cases and error scenarios
7. Verify all tests pass
8. Update test documentation

### Routes Ready for Refactoring:
- `mosqueRoutes.test.js` (fixtures ready)
- `qpvRoutes.test.js` (fixtures ready)
- `cacheRoutes.test.js` (fixtures ready)
- `departementRoutes.test.js`
- `countryRoutes.test.js`
- `nat1Routes.test.js`
- `rankingRoutes.test.js`
- `migrantRoutes.test.js`

Each can follow this same pattern for consistent, maintainable test coverage.

---

**Pattern Version:** 1.0
**Last Updated:** Current Session
**Status:** Tested and verified with communeRoutes
