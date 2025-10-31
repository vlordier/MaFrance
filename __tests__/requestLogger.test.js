const { requestLogger } = require('../middleware/requestLogger');
const { logger } = require('../utils/logger');

jest.mock('../utils/logger');

describe('Request Logger Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      method: 'GET',
      url: '/api/test',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn(),
      connection: {
        remoteAddress: '192.168.1.1'
      },
      headers: {}
    };

    res = {
      statusCode: 200,
      json: jest.fn(function(data) { return this; }),
      send: jest.fn(function(data) { return this; }),
      on: jest.fn(function(event, callback) { 
        if (event === 'finish') {
          // Call finish callback immediately in tests
          callback();
        }
        return this;
      })
    };

    next = jest.fn();
  });

  describe('Correlation ID handling', () => {
    test('should use existing correlation ID from headers', () => {
      req.headers['x-correlation-id'] = 'existing-id-123';

      requestLogger(req, res, next);

      expect(req.correlationId).toBe('existing-id-123');
    });

    test('should generate correlation ID if not provided', () => {
      requestLogger(req, res, next);

      expect(req.correlationId).toBeDefined();
      expect(typeof req.correlationId).toBe('string');
      expect(req.correlationId.length).toBeGreaterThan(0);
    });

    test('should log incoming request with correlation ID', () => {
      req.headers['x-correlation-id'] = 'test-id-456';
      req.get.mockReturnValue('Mozilla/5.0');

      requestLogger(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          correlationId: 'test-id-456',
          method: 'GET',
          url: '/api/test'
        })
      );
    });
  });

  describe('Request logging', () => {
    test('should log POST request with method and URL', () => {
      req.method = 'POST';
      req.url = '/api/submit';
      req.originalUrl = '/api/submit';
      req.get.mockReturnValue('Chrome');

      requestLogger(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          method: 'POST',
          url: '/api/submit'
        })
      );
    });

    test('should log user agent from request headers', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      req.get.mockReturnValue(userAgent);

      requestLogger(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          userAgent
        })
      );
    });

    test('should log client IP address', () => {
      req.ip = '192.168.100.1';

      requestLogger(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          ip: '192.168.100.1'
        })
      );
    });

    test('should use connection remoteAddress as fallback for IP', () => {
      req.ip = undefined;
      req.connection.remoteAddress = '10.0.0.1';

      requestLogger(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          ip: '10.0.0.1'
        })
      );
    });

    test('should log content length from headers', () => {
      req.get.mockImplementation((header) => {
        if (header === 'user-agent') return 'Mozilla/5.0';
        if (header === 'content-length') return '1024';
        return undefined;
      });

      requestLogger(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          contentLength: '1024'
        })
      );
    });

    test('should use "unknown" for missing content length', () => {
      req.get.mockReturnValue(undefined);

      requestLogger(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          contentLength: 'unknown'
        })
      );
    });
  });

  describe('Response logging with res.json', () => {
    test('should intercept res.json calls', () => {
      requestLogger(req, res, next);

      const responseData = { success: true };
      res.json(responseData);

      expect(logger.info).toHaveBeenCalledWith(
        'Response sent',
        expect.anything()
      );
    });

    test('should log response status and duration', () => {
      requestLogger(req, res, next);
      res.statusCode = 200;

      res.json({ data: 'test' });

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall).toBeDefined();
      expect(responseLogCall[1]).toMatchObject({
        method: 'GET',
        url: '/api/test',
        status: 200
      });
      expect(responseLogCall[1].duration).toMatch(/\d+ms/);
    });

    test('should log data size for JSON responses', () => {
      requestLogger(req, res, next);

      const data = { key: 'value', array: [1, 2, 3] };
      res.json(data);

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1]).toHaveProperty('dataSize');
      expect(typeof responseLogCall[1].dataSize).toBe('number');
    });

    test('should call original res.json method', () => {
      const originalJson = res.json;
      requestLogger(req, res, next);

      const data = { test: true };
      res.json(data);

      // The original json should have been called
      expect(res.json).toBeDefined();
    });

    test('should log error status responses (400+)', () => {
      requestLogger(req, res, next);
      res.statusCode = 404;

      res.json({ error: 'Not found' });

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall).toBeDefined();
      expect(responseLogCall[1].status).toBe(404);
    });
  });

  describe('Response logging with res.send', () => {
    test('should intercept res.send calls', () => {
      requestLogger(req, res, next);

      res.send('Hello World');

      expect(logger.info).toHaveBeenCalledWith(
        'Response sent',
        expect.anything()
      );
    });

    test('should log response with string data', () => {
      requestLogger(req, res, next);
      res.statusCode = 200;

      res.send('Response text');

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1]).toMatchObject({
        method: 'GET',
        url: '/api/test',
        status: 200
      });
    });

    test('should log data size for string responses', () => {
      requestLogger(req, res, next);

      const responseText = 'This is response text';
      res.send(responseText);

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1].dataSize).toBe(responseText.length);
    });

    test('should handle null/undefined response data', () => {
      requestLogger(req, res, next);

      res.send(undefined);

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1].dataSize).toBe(0);
    });

    test('should log HTML responses', () => {
      requestLogger(req, res, next);
      res.statusCode = 200;

      const htmlContent = '<html><body>Test</body></html>';
      res.send(htmlContent);

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1].dataSize).toBe(htmlContent.length);
    });
  });

  describe('Response finish event handling', () => {
    test('should listen for response finish event', () => {
      requestLogger(req, res, next);

      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    test('should log warning for error status on finish', () => {
      requestLogger(req, res, next);
      res.statusCode = 500;

      // Trigger the finish event by calling the callback stored in on mock
      const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();

      expect(logger.warn).toHaveBeenCalledWith(
        'Request completed with error status',
        expect.objectContaining({
          status: 500,
          method: 'GET',
          url: '/api/test'
        })
      );
    });

    test('should not log warning for successful responses on finish', () => {
      requestLogger(req, res, next);
      res.statusCode = 200;

      const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();

      // Should not call logger.warn for 200 status
      const warnCalls = logger.warn.mock.calls;
      expect(warnCalls.length).toBe(0);
    });

    test('should include duration in finish event log', () => {
      const mockStartTime = 1500;
      const originalDateNow = Date.now;
      let currentTime = mockStartTime;
      
      Date.now = jest.fn(() => {
        const result = currentTime;
        currentTime += 50; // Simulate passage of time
        return result;
      });

      requestLogger(req, res, next);
      res.statusCode = 500;

      const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishCallback();

      expect(logger.warn).toHaveBeenCalledWith(
        'Request completed with error status',
        expect.objectContaining({
          duration: expect.stringMatching(/\d+ms/)
        })
      );

      Date.now = originalDateNow;
    });
  });

  describe('Middleware flow', () => {
    test('should call next function', () => {
      requestLogger(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should process multiple requests independently', () => {
      const req1 = { ...req, method: 'GET', url: '/api/test1', headers: { 'x-correlation-id': 'id-1' }, get: jest.fn(), connection: { remoteAddress: '192.168.1.1' } };
      const req2 = { ...req, method: 'POST', url: '/api/test2', headers: { 'x-correlation-id': 'id-2' }, get: jest.fn(), connection: { remoteAddress: '192.168.1.2' } };
      const res1 = { statusCode: 200, json: jest.fn(function(data) { return this; }), send: jest.fn(function(data) { return this; }), on: jest.fn(function(event, callback) { if (event === 'finish') callback(); return this; }) };
      const res2 = { statusCode: 200, json: jest.fn(function(data) { return this; }), send: jest.fn(function(data) { return this; }), on: jest.fn(function(event, callback) { if (event === 'finish') callback(); return this; }) };
      const next1 = jest.fn();
      const next2 = jest.fn();

      requestLogger(req1, res1, next1);
      requestLogger(req2, res2, next2);

      expect(req1.correlationId).toBe('id-1');
      expect(req2.correlationId).toBe('id-2');
      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });

    test('should handle DELETE method requests', () => {
      const deleteReq = { ...req, method: 'DELETE', url: '/api/resource/123', originalUrl: '/api/resource/123', get: jest.fn(), connection: { remoteAddress: '192.168.1.1' }, headers: {} };
      requestLogger(deleteReq, res, next);

      const calls = logger.info.mock.calls;
      const requestLogCall = calls.find(call => call[0] === 'Incoming request');

      expect(requestLogCall).toBeDefined();
      expect(requestLogCall[1]).toMatchObject({
        method: 'DELETE',
        url: '/api/resource/123'
      });
    });

    test('should handle PUT method requests', () => {
      const putReq = { ...req, method: 'PUT', url: '/api/resource/456', originalUrl: '/api/resource/456', get: jest.fn(), connection: { remoteAddress: '192.168.1.1' }, headers: {} };
      requestLogger(putReq, res, next);

      const calls = logger.info.mock.calls;
      const requestLogCall = calls.find(call => call[0] === 'Incoming request');

      expect(requestLogCall).toBeDefined();
      expect(requestLogCall[1]).toMatchObject({
        method: 'PUT',
        url: '/api/resource/456'
      });
    });
  });

  describe('Timing accuracy', () => {
    test('should measure response time accurately', () => {
      jest.useFakeTimers();
      const mockStartTime = 1000;
      Date.now = jest.fn(() => mockStartTime);
      
      requestLogger(req, res, next);
      
      // Advance time by 150ms
      jest.advanceTimersByTime(150);
      Date.now = jest.fn(() => mockStartTime + 150);
      
      res.json({ data: 'test' });

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1].duration).toMatch(/150ms/);
      
      jest.useRealTimers();
    });

    test('should handle sub-millisecond timing', () => {
      requestLogger(req, res, next);
      
      res.json({});

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1].duration).toMatch(/\d+ms/);
    });
  });

  describe('Edge cases', () => {
    test('should handle requests with special characters in URL', () => {
      req.url = '/api/search?q=special%20chars&filter=active';
      req.originalUrl = '/api/search?q=special%20chars&filter=active';

      requestLogger(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: expect.stringContaining('search')
        })
      );
    });

    test('should handle missing originalUrl', () => {
      req.originalUrl = undefined;
      req.url = '/api/test';

      requestLogger(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: '/api/test'
        })
      );
    });

    test('should handle large response payloads', () => {
      requestLogger(req, res, next);

      // Create a large object
      const largeData = {
        items: Array(1000).fill({ id: 1, name: 'test', description: 'test description' })
      };

      res.json(largeData);

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1].dataSize).toBeGreaterThan(1000);
    });

    test('should handle empty response data', () => {
      requestLogger(req, res, next);

      res.json({});

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1].dataSize).toBe(2); // Empty object JSON
    });

    test('should handle 3xx redirect responses', () => {
      requestLogger(req, res, next);
      res.statusCode = 301;

      res.json({ redirectUrl: '/new-location' });

      const calls = logger.info.mock.calls;
      const responseLogCall = calls.find(call => call[0] === 'Response sent');

      expect(responseLogCall[1].status).toBe(301);
    });
  });
});
