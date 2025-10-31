/**
 * Enhanced test assertion helpers for common testing patterns
 */
const testAssertions = {
  // Response structure assertions
  expectSuccessfulResponse: (response, expectedData = null) => {
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();

    if (expectedData) {
      if (Array.isArray(expectedData)) {
        expect(Array.isArray(response.body.data || response.body)).toBe(true);
      } else if (typeof expectedData === 'object') {
        expect(response.body).toMatchObject(expectedData);
      }
    }
  },

  expectErrorResponse: (response, statusCode = 500, errorMessage = null) => {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('error');
    if (errorMessage) {
      expect(response.body.error).toContain(errorMessage);
    }
  },

  expectValidationError: (response, field = null) => {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(response.body).toHaveProperty('status', 400);
    expect(response.body).toHaveProperty('details');
    expect(Array.isArray(response.body.details)).toBe(true);

    if (field) {
      const error = response.body.details.find(e => e.path === field);
      expect(error).toBeDefined();
      expect(error).toHaveProperty('msg');
    }
  },

  // Database and cache assertions
  expectDatabaseCalled: (mockDb, method = 'all', expectedParams = null) => {
    expect(mockDb[method]).toHaveBeenCalled();

    if (expectedParams) {
      expect(mockDb[method]).toHaveBeenCalledWith(
        expect.any(String),
        expectedParams,
        expect.any(Function)
      );
    }
  },

  expectCacheHit: (mockCacheService, key) => {
    expect(mockCacheService.get).toHaveBeenCalledWith(key);
  },

  expectCacheMiss: (mockCacheService, key) => {
    expect(mockCacheService.get).toHaveBeenCalledWith(key);
    // For cache miss, we expect the mock to return null/undefined
  },

  // Data structure assertions
  expectCommuneData: (data) => {
    expect(data).toHaveProperty('COG');
    expect(data).toHaveProperty('commune');
    expect(data).toHaveProperty('population');
    expect(data).toHaveProperty('insecurite_score');
    expect(typeof data.population).toBe('number');
    expect(typeof data.insecurite_score).toBe('number');
  },

  expectDepartmentData: (data) => {
    expect(data).toHaveProperty('departement');
    expect(data).toHaveProperty('population');
    expect(data).toHaveProperty('insecurite_score');
    expect(typeof data.population).toBe('number');
    expect(typeof data.insecurite_score).toBe('number');
  },

  expectPaginatedResponse: (response, expectedCount = null) => {
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total_count');
    expect(Array.isArray(response.body.data)).toBe(true);

    if (expectedCount !== null) {
      expect(response.body.data).toHaveLength(expectedCount);
    }
  }
};

module.exports = {
  testAssertions
};