const { logger } = require('../utils/logger');

/**
 * Request/Response logging middleware
 * Logs all incoming requests and outgoing responses with timing information
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Store correlation ID in request for later use
  req.correlationId = correlationId;

  // Log incoming request
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    contentLength: req.get('content-length') || 'unknown'
  });

  // Capture the original res.json and res.send methods
  const originalJson = res.json;
  const originalSend = res.send;

  // Override res.json to log response
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info('Response sent', {
      correlationId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      dataSize: JSON.stringify(data).length
    });

    return originalJson.call(this, data);
  };

  // Override res.send to log response
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info('Response sent', {
      correlationId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      dataSize: typeof data === 'string' ? data.length : (data ? JSON.stringify(data).length : 0)
    });

    return originalSend.call(this, data);
  };

  // Log on response finish for completeness
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Only log if not already logged by json/send
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error status', {
        correlationId,
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    }
  });

  next();
};

module.exports = {
  requestLogger
};
