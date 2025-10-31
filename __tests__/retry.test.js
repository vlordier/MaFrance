const { retryWithBackoff, retryDatabaseOperation, CircuitBreaker, RetryError } = require('../utils/retry');

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn()
  }
}));

describe('RetryError', () => {
  it('should create a RetryError with correct properties', () => {
    const originalError = new Error('Original error');
    const retryError = new RetryError('Function failed', 3, originalError);

    expect(retryError.name).toBe('RetryError');
    expect(retryError.message).toBe('Function failed');
    expect(retryError.attempts).toBe(3);
    expect(retryError.lastError).toBe(originalError);
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return result on first successful attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce('success');

    const promise = retryWithBackoff(fn, { maxAttempts: 3 });
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw RetryError after max attempts', async () => {
    jest.useRealTimers();
    const fn = jest.fn().mockRejectedValue(new Error('Persistent failure'));
    const maxAttempts = 3;

    await expect(retryWithBackoff(fn, { maxAttempts })).rejects.toBeInstanceOf(RetryError);

    expect(fn).toHaveBeenCalledTimes(maxAttempts);
    jest.useFakeTimers();
  });

  it('should respect shouldRetry function', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Non-retryable error'));
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(retryWithBackoff(fn, { shouldRetry, maxAttempts: 3 })).rejects.toThrow('Non-retryable error');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call onRetry callback before retries', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce('success');
    const onRetry = jest.fn();

    const promise = retryWithBackoff(fn, { maxAttempts: 3, onRetry });
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
  });

  it('should implement exponential backoff with jitter', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success');

    const promise = retryWithBackoff(fn, { maxAttempts: 3, baseDelay: 1000 });
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect maxDelay limit', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockRejectedValueOnce(new Error('Third failure'))
      .mockRejectedValueOnce(new Error('Fourth failure'))
      .mockResolvedValueOnce('success');

    const promise = retryWithBackoff(fn, { maxAttempts: 5, baseDelay: 1000, maxDelay: 3000 });
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('should use default options when none provided', async () => {
    jest.useRealTimers();
    const fn = jest.fn().mockRejectedValue(new Error('Failure'));

    await expect(retryWithBackoff(fn)).rejects.toBeInstanceOf(RetryError);
    expect(fn).toHaveBeenCalledTimes(3); // Default maxAttempts is 3
    jest.useFakeTimers();
  });
});

describe('retryDatabaseOperation', () => {
  const { logger } = require('../utils/logger');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should retry on database connection errors', async () => {
    const dbOperation = jest.fn()
      .mockRejectedValueOnce({ code: 'SQLITE_BUSY', message: 'Database busy' })
      .mockResolvedValueOnce('success');

    const promise = retryDatabaseOperation(dbOperation);
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(dbOperation).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('should retry on timeout errors', async () => {
    const dbOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Operation timeout'))
      .mockResolvedValueOnce('success');

    const promise = retryDatabaseOperation(dbOperation);
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(dbOperation).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('should not retry on SQL syntax errors', async () => {
    const dbOperation = jest.fn()
      .mockRejectedValue(new Error('SQL syntax error'));

    await expect(retryDatabaseOperation(dbOperation)).rejects.toThrow('SQL syntax error');

    expect(dbOperation).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should use custom options when provided', async () => {
    const dbOperation = jest.fn()
      .mockRejectedValueOnce({ code: 'SQLITE_BUSY' })
      .mockResolvedValueOnce('success');

    const promise = retryDatabaseOperation(dbOperation, { maxAttempts: 5 });
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(dbOperation).toHaveBeenCalledTimes(2);
  });
});

describe('CircuitBreaker', () => {
  const { logger } = require('../utils/logger');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start in CLOSED state', () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getState().state).toBe('CLOSED');
    expect(breaker.getState().failures).toBe(0);
  });

  it('should execute function successfully in CLOSED state', async () => {
    const breaker = new CircuitBreaker();
    const fn = jest.fn().mockResolvedValue('success');

    const result = await breaker.execute(fn);

    expect(result).toBe('success');
    expect(breaker.getState().state).toBe('CLOSED');
    expect(breaker.getState().failures).toBe(0);
  });

  it('should handle failures and stay CLOSED below threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    const fn = jest.fn().mockRejectedValue(new Error('Failure'));

    for (let i = 0; i < 2; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow('Failure');
    }

    expect(breaker.getState().state).toBe('CLOSED');
    expect(breaker.getState().failures).toBe(2);
  });

  it('should open circuit after reaching failure threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2 });
    const fn = jest.fn().mockRejectedValue(new Error('Failure'));

    // First failure
    await expect(breaker.execute(fn)).rejects.toThrow('Failure');
    expect(breaker.getState().state).toBe('CLOSED');

    // Second failure - should open circuit
    await expect(breaker.execute(fn)).rejects.toThrow('Failure');
    expect(breaker.getState().state).toBe('OPEN');
    expect(logger.warn).toHaveBeenCalledWith('Circuit breaker opened due to failures', { failures: 2 });
  });

  it('should reject calls when OPEN', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    const fn = jest.fn().mockRejectedValue(new Error('Failure'));

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow('Failure');
    expect(breaker.getState().state).toBe('OPEN');

    // Try another call - should be rejected immediately
    await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
    expect(fn).toHaveBeenCalledTimes(1); // Should not call fn again
  });

  it('should transition to HALF_OPEN after recovery timeout', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      recoveryTimeout: 1000
    });
    const fn = jest.fn().mockRejectedValue(new Error('Failure'));

    // Open the circuit
    await expect(breaker.execute(fn)).rejects.toThrow('Failure');
    expect(breaker.getState().state).toBe('OPEN');

    // Fast-forward time past recovery timeout
    jest.useFakeTimers();
    jest.advanceTimersByTime(1001);

    // Next call should move to HALF_OPEN
    const successFn = jest.fn().mockResolvedValue('success');
    const result = await breaker.execute(successFn);

    expect(result).toBe('success');
    expect(breaker.getState().state).toBe('CLOSED');
    expect(logger.info).toHaveBeenCalledWith('Circuit breaker moving to HALF_OPEN state');
    expect(logger.info).toHaveBeenCalledWith('Circuit breaker reset to CLOSED state');

    jest.useRealTimers();
  });

  it('should reset to CLOSED on successful HALF_OPEN call', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    const failFn = jest.fn().mockRejectedValue(new Error('Failure'));
    const successFn = jest.fn().mockResolvedValue('success');

    // Open the circuit
    await expect(breaker.execute(failFn)).rejects.toThrow('Failure');
    expect(breaker.getState().state).toBe('OPEN');

    // Manually set to HALF_OPEN for testing
    breaker.state = 'HALF_OPEN';

    // Successful call should reset to CLOSED
    const result = await breaker.execute(successFn);

    expect(result).toBe('success');
    expect(breaker.getState().state).toBe('CLOSED');
    expect(breaker.getState().failures).toBe(0);
    expect(logger.info).toHaveBeenCalledWith('Circuit breaker reset to CLOSED state');
  });

  it('should handle custom options', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 10,
      recoveryTimeout: 120000,
      monitoringPeriod: 20000
    });

    expect(breaker.failureThreshold).toBe(10);
    expect(breaker.recoveryTimeout).toBe(120000);
    expect(breaker.monitoringPeriod).toBe(20000);
  });

  it('should provide state information', () => {
    const breaker = new CircuitBreaker();

    const state = breaker.getState();
    expect(state).toHaveProperty('state');
    expect(state).toHaveProperty('failures');
    expect(state).toHaveProperty('lastFailureTime');
  });
});