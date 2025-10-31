const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Custom format for file output (no colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),

    // Error log file
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // Combined log file
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // HTTP requests log
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
    }),
  ],
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper functions for common logging patterns
const logRequest = (req, res, responseTime) => {
  const { method, url, ip, headers } = req;
  const { statusCode } = res;
  const userAgent = headers['user-agent'] || 'unknown';
  const correlationId = req.correlationId || headers['x-correlation-id'] || 'unknown';

  logger.http('Request completed', {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    ip,
    userAgent,
    correlationId,
  });
};

const logError = (error, context = {}) => {
  const errorInfo = {
    message: error.message,
    name: error.name,
    code: error.code,
    stack: error.stack,
    ...context,
  };

  // Log with appropriate level based on error type
  if (error.status && error.status < 500) {
    logger.warn('Client error occurred', errorInfo);
  } else {
    logger.error('Server error occurred', errorInfo);
  }
};

const logDatabaseQuery = (query, params, duration) => {
  logger.debug('Database query executed', {
    query: query.substring(0, 500), // Truncate long queries
    params: Array.isArray(params) ? params : [params],
    duration: `${duration}ms`,
  });
};

const logCacheOperation = (operation, key, hit = null, duration = null) => {
  const level = operation === 'error' ? 'error' : 'debug';
  logger.log(level, `Cache ${operation}`, {
    key,
    hit,
    duration: duration ? `${duration}ms` : undefined,
  });
};

const logServiceOperation = (service, operation, data = {}, duration = null) => {
  logger.info(`${service} service: ${operation}`, {
    service,
    operation,
    duration: duration ? `${duration}ms` : undefined,
    ...data,
  });
};

const logImportOperation = (table, operation, data = {}) => {
  logger.info(`Import operation: ${table} - ${operation}`, {
    table,
    operation,
    ...data,
  });
};

const logPerformance = (operation, duration, threshold = 1000) => {
  const level = duration > threshold ? 'warn' : 'debug';
  logger.log(level, `Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    threshold: `${threshold}ms`,
    exceeded: duration > threshold,
  });
};

module.exports = {
  logger,
  logRequest,
  logError,
  logDatabaseQuery,
  logCacheOperation,
  logServiceOperation,
  logImportOperation,
  logPerformance,
};