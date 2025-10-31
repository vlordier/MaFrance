const {
  errorHandler,
  DatabaseError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  handleDatabaseError,
  handleValidationError,
  createDbHandler
} = require('../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    // Reset environment
    delete process.env.NODE_ENV;
  });

  describe('Error Classes', () => {
    test('DatabaseError should create error with correct properties', () => {
      const error = new DatabaseError('Test message', 'details');

      expect(error.name).toBe('DatabaseError');
      expect(error.message).toBe('Test message');
      expect(error.status).toBe(500);
      expect(error.details).toBe('details');
    });

    test('DatabaseError should work without details', () => {
      const error = new DatabaseError('Test message');

      expect(error.name).toBe('DatabaseError');
      expect(error.message).toBe('Test message');
      expect(error.status).toBe(500);
      expect(error.details).toBeNull();
    });

    test('ValidationError should create error with correct properties', () => {
      const error = new ValidationError('Validation failed', 'field error');

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.status).toBe(400);
      expect(error.details).toBe('field error');
    });

    test('ValidationError should work without details', () => {
      const error = new ValidationError('Validation failed');

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.status).toBe(400);
      expect(error.details).toBeNull();
    });

    test('NotFoundError should create error with correct properties', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.status).toBe(404);
      expect(error.context).toEqual({});
    });

    test('NotFoundError should work with default message', () => {
      const error = new NotFoundError();

      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.status).toBe(404);
    });

    test('RateLimitError should create error with correct properties', () => {
      const error = new RateLimitError('Too many requests');

      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Too many requests');
      expect(error.status).toBe(429);
      expect(error.context).toEqual({});
    });

    test('RateLimitError should work with default message', () => {
      const error = new RateLimitError();

      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.status).toBe(429);
    });

    test('AuthenticationError should create error with correct properties', () => {
      const error = new AuthenticationError('Please login');

      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Please login');
      expect(error.status).toBe(401);
      expect(error.context).toEqual({});
    });

    test('AuthenticationError should work with default message', () => {
      const error = new AuthenticationError();

      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication required');
      expect(error.status).toBe(401);
    });

    test('AuthorizationError should create error with correct properties', () => {
      const error = new AuthorizationError('Access denied');

      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Access denied');
      expect(error.status).toBe(403);
      expect(error.context).toEqual({});
    });

    test('AuthorizationError should work with default message', () => {
      const error = new AuthorizationError();

      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.status).toBe(403);
    });
  });

  describe('handleDatabaseError', () => {
    test('should handle database error in development', () => {
      process.env.NODE_ENV = 'development';
      const dbError = new Error('Connection failed');

      handleDatabaseError(dbError, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la requête à la base de données',
        code: 'DATABASE_ERROR',
        status: 500,
        details: 'Connection failed',
        timestamp: expect.any(String)
      });
    });

    test('should handle database error in production', () => {
      process.env.NODE_ENV = 'production';
      const dbError = new Error('Connection failed');

      handleDatabaseError(dbError, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la requête à la base de données',
        code: 'DATABASE_ERROR',
        status: 500,
        details: null,
        timestamp: expect.any(String)
      });
    });

    test('should handle database error with custom message', () => {
      const dbError = { message: 'Custom DB error' };

      handleDatabaseError(dbError, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la requête à la base de données',
        code: 'DATABASE_ERROR',
        status: 500,
        details: 'Custom DB error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('handleValidationError', () => {
    test('should handle validation error in development', () => {
      process.env.NODE_ENV = 'development';
      const validationErr = new Error('Invalid input');
      validationErr.details = 'Field is required';

      handleValidationError(validationErr, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: 'Field is required',
        timestamp: expect.any(String)
      });
    });

    test('should handle validation error in production', () => {
      process.env.NODE_ENV = 'production';
      const validationErr = new Error('Invalid input');
      validationErr.details = 'Field is required';

      handleValidationError(validationErr, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: null,
        timestamp: expect.any(String)
      });
    });

    test('should handle validation error with default message', () => {
      process.env.NODE_ENV = 'development';
      const validationErr = {};

      handleValidationError(validationErr, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur de validation',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('createDbHandler', () => {
    test('should handle database error', () => {
      const dbHandler = createDbHandler(mockRes);
      const dbError = new Error('DB connection failed');

      dbHandler(dbError, null);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database operation failed',
        code: 'DATABASE_ERROR',
        status: 500,
        details: 'DB connection failed',
        timestamp: expect.any(String)
      });
    });

    test('should handle successful database operation', () => {
      const dbHandler = createDbHandler(mockRes);
      const result = { data: 'success' };

      dbHandler(null, result);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });

    test('should handle null result', () => {
      const dbHandler = createDbHandler(mockRes);

      dbHandler(null, null);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(null);
    });
  });

  describe('errorHandler middleware', () => {
    let mockReq;

    beforeEach(() => {
      mockReq = {};
    });

    test('should handle error with status code in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.status = 404;
      error.details = 'Not found details';

      errorHandler(error, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Test error',
        code: 'INTERNAL_ERROR',
        status: 404,
        details: 'Not found details',
        correlationId: undefined,
        timestamp: expect.any(String)
      });
    });

    test('should handle error with status code in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.status = 404;
      error.details = 'Not found details';

      errorHandler(error, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur serveur interne',
        code: 'INTERNAL_ERROR',
        status: 404,
        details: null,
        correlationId: undefined,
        timestamp: expect.any(String)
      });
    });

    test('should handle error without status code', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Generic error');

      errorHandler(error, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Generic error',
        code: 'INTERNAL_ERROR',
        status: 500,
        details: undefined,
        correlationId: undefined,
        timestamp: expect.any(String)
      });
    });

    test('should handle error without message', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error();
      error.status = 400;

      errorHandler(error, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur serveur',
        code: 'INTERNAL_ERROR',
        status: 400,
        details: undefined,
        correlationId: undefined,
        timestamp: expect.any(String)
      });
    });

    test('should handle error without message in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error();

      errorHandler(error, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur serveur interne',
        code: 'INTERNAL_ERROR',
        status: 500,
        details: null,
        correlationId: undefined,
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Class Inheritance', () => {
    test('DatabaseError should be instance of Error', () => {
      const error = new DatabaseError('test');
      expect(error).toBeInstanceOf(Error);
    });

    test('ValidationError should be instance of Error', () => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(Error);
    });

    test('NotFoundError should be instance of Error', () => {
      const error = new NotFoundError('test');
      expect(error).toBeInstanceOf(Error);
    });

    test('RateLimitError should be instance of Error', () => {
      const error = new RateLimitError('test');
      expect(error).toBeInstanceOf(Error);
    });

    test('AuthenticationError should be instance of Error', () => {
      const error = new AuthenticationError('test');
      expect(error).toBeInstanceOf(Error);
    });

    test('AuthorizationError should be instance of Error', () => {
      const error = new AuthorizationError('test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Environment-specific behavior', () => {
    test('should hide details in production for all handlers', () => {
      process.env.NODE_ENV = 'production';

      // Test handleDatabaseError
      handleDatabaseError(new Error('test'), mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la requête à la base de données',
        code: 'DATABASE_ERROR',
        status: 500,
        details: null,
        timestamp: expect.any(String)
      });

      // Reset mock
      mockRes.json.mockClear();

      // Test handleValidationError
      handleValidationError({ message: 'test', details: 'secret' }, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'test',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: null,
        timestamp: expect.any(String)
      });

      // Reset mock
      mockRes.json.mockClear();

      // Test errorHandler
      const error = new Error('test');
      error.details = 'secret';
      errorHandler(error, {}, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur serveur interne',
        code: 'INTERNAL_ERROR',
        status: 500,
        details: null,
        correlationId: undefined,
        timestamp: expect.any(String)
      });
    });

    test('should show details in development for all handlers', () => {
      process.env.NODE_ENV = 'development';

      // Test handleDatabaseError
      handleDatabaseError(new Error('test'), mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la requête à la base de données',
        code: 'DATABASE_ERROR',
        status: 500,
        details: 'test',
        timestamp: expect.any(String)
      });

      // Reset mock
      mockRes.json.mockClear();

      // Test handleValidationError
      handleValidationError({ message: 'test', details: 'details' }, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'test',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: 'details',
        timestamp: expect.any(String)
      });

      // Reset mock
      mockRes.json.mockClear();

      // Test errorHandler
      const error = new Error('test');
      error.details = 'details';
      errorHandler(error, {}, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'test',
        code: 'INTERNAL_ERROR',
        status: 500,
        details: 'details',
        correlationId: undefined,
        timestamp: expect.any(String)
      });
    });
  });
});