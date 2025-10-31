// Base error class
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      status: this.status,
      details: process.env.NODE_ENV === 'production' ? null : this.details,
      timestamp: this.timestamp
    };
  }
}

// Error classes with specific codes
class DatabaseError extends AppError {
  constructor(message, details = null, context = {}) {
    super(message, 500, 'DATABASE_ERROR', details, context);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null, context = {}) {
    super(message, 400, 'VALIDATION_ERROR', details, context);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', context = {}) {
    super(message, 404, 'NOT_FOUND', null, context);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', context = {}) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', null, context);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', context = {}) {
    super(message, 401, 'AUTHENTICATION_REQUIRED', null, context);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', context = {}) {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS', null, context);
  }
}

class ServiceError extends AppError {
  constructor(message, details = null, context = {}) {
    super(message, 503, 'SERVICE_ERROR', details, context);
  }
}

class InvalidInputError extends AppError {
  constructor(message, details = null, context = {}) {
    super(message, 400, 'INVALID_INPUT', details, context);
  }
}

class TimeoutError extends AppError {
  constructor(message = 'Request timeout', context = {}) {
    super(message, 408, 'REQUEST_TIMEOUT', null, context);
  }
}


// Error handling functions
const handleDatabaseError = (err, res, context = {}) => {
  const { logger } = require('../utils/logger');
  const error = new DatabaseError('Erreur lors de la requête à la base de données', err.message, context);
  
  logger.error('Database error occurred', {
    error: error.message,
    details: error.details,
    stack: err.stack,
    context: error.context
  });

  res.status(error.status).json(error.toJSON());
};

const handleValidationError = (err, res, context = {}) => {
  const { logger } = require('../utils/logger');
  const error = new ValidationError(err.message || 'Erreur de validation', err.details, context);
  
  logger.warn('Validation error occurred', {
    error: error.message,
    details: error.details,
    context: error.context
  });

  res.status(error.status).json(error.toJSON());
};

const createDbHandler = (res, next, context = {}) => (err, result) => {
  if (err) {
    const { logger } = require('../utils/logger');
    const dbError = new DatabaseError('Database operation failed', err.message, context);
    
    logger.error('Database operation failed', {
      error: dbError.message,
      details: dbError.details,
      stack: err.stack,
      context: dbError.context,
    });
    
    return res.status(dbError.status).json(dbError.toJSON());
  }
  
  if (result !== undefined) {
    res.json(result);
  }
};

const errorHandler = (err, req, res, next) => {
  const { logger } = require('../utils/logger');

  // Check if it's our custom error
  if (err instanceof AppError) {
    logger.error(`${err.name} occurred`, {
      message: err.message,
      code: err.code,
      status: err.status,
      details: err.details,
      stack: err.stack,
      url: req?.url,
      method: req?.method,
      correlationId: req?.correlationId,
      context: err.context,
      userAgent: req?.headers?.['user-agent'],
      ip: req?.ip,
    });

    return res.status(err.status).json({
      ...err.toJSON(),
      correlationId: req?.correlationId,
    });
  }

  // Handle unexpected errors
  logger.error('Unhandled error occurred', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    status: err.status || 500,
    url: req?.url,
    method: req?.method,
    correlationId: req?.correlationId,
    userAgent: req?.headers?.['user-agent'],
    ip: req?.ip,
  });

  // Don't expose internal errors in production
  const isProd = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: isProd ? 'Erreur serveur interne' : (err.message || 'Erreur serveur'),
    code: 'INTERNAL_ERROR',
    status: err.status || 500,
    details: isProd ? null : err.details,
    correlationId: req?.correlationId,
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
  DatabaseError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  ServiceError,
  InvalidInputError,
  TimeoutError,
  handleDatabaseError,
  handleValidationError,
  createDbHandler
};
