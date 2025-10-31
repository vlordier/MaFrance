// Retry utility for handling transient failures
class RetryError extends Error {
  constructor(message, attempts, lastError) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 30000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried (default: retry on any error)
 * @param {Function} options.onRetry - Callback called before each retry attempt
 * @returns {Promise} - Result of the function call
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If shouldRetry returns false, don't retry and throw original error
      if (!shouldRetry(error)) {
        throw error;
      }

      // If this is the last attempt, break to throw RetryError
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitter = Math.random() * 0.1 * delay; // Add up to 10% jitter
      const totalDelay = delay + jitter;

      if (onRetry) {
        onRetry(attempt, error, totalDelay);
      }

      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw new RetryError(
    `Function failed after ${maxAttempts} attempts`,
    maxAttempts,
    lastError
  );
}

/**
 * Retry database operations with appropriate error handling
 * @param {Function} dbOperation - Database operation function
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the database operation
 */
async function retryDatabaseOperation(dbOperation, options = {}) {
  const { logger } = require('./logger');

  return retryWithBackoff(dbOperation, {
    maxAttempts: 3,
    baseDelay: 500,
    shouldRetry: (error) => {
      // Retry on connection errors, timeouts, but not on SQL syntax errors
      const retryableErrors = [
        'SQLITE_BUSY',
        'SQLITE_LOCKED',
        'ETIMEDOUT',
        'ECONNRESET',
        'ECONNREFUSED'
      ];

      return retryableErrors.some(code => error.code === code) ||
             error.message.includes('timeout') ||
             error.message.includes('connection');
    },
    onRetry: (attempt, error, delay) => {
      logger.warn('Retrying database operation', {
        attempt,
        error: error.message,
        delay,
        operation: dbOperation.name || 'anonymous'
      });
    },
    ...options
  });
}

/**
 * Circuit breaker for external service calls
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds

    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    const { logger } = require('./logger');

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker moving to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
      const { logger } = require('./logger');
      logger.info('Circuit breaker reset to CLOSED state');
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      const { logger } = require('./logger');
      logger.warn('Circuit breaker opened due to failures', { failures: this.failures });
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

module.exports = {
  retryWithBackoff,
  retryDatabaseOperation,
  CircuitBreaker,
  RetryError
};