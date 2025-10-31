
const sqlite3 = require('sqlite3').verbose();
const config = require('./index');
const { logger, logDatabaseQuery } = require('../utils/logger');
const { retryDatabaseOperation } = require('../utils/retry');

const db = new sqlite3.Database(
  config.database.path,
  (err) => {
    if (err) {
      logger.error('Database connection error', { error: err.message, stack: err.stack });
      process.exit(1);
    }
    logger.info('Connected to SQLite database', { path: config.database.path });
  }
);

// Set database timeout
db.configure('busyTimeout', config.api.timeouts.connection);

// Performance monitoring thresholds
const SLOW_QUERY_THRESHOLD = 1000; // 1 second
const VERY_SLOW_QUERY_THRESHOLD = 5000; // 5 seconds

// Enhanced query logging with performance monitoring
if (process.env.NODE_ENV !== 'production') {
  const originalAll = db.all.bind(db);
  db.all = function(sql, params, callback) {
    const start = Date.now();
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Database query started', {
      queryId,
      sql: sql.substring(0, 200),
      params: params?.slice(0, 5) // Limit params logging
    });

    const wrappedCallback = (err, rows) => {
      const duration = Date.now() - start;

      if (err) {
        logger.error('Database query failed', {
          queryId,
          sql: sql.substring(0, 200),
          duration,
          error: err.message,
          params: params?.slice(0, 5)
        });
      } else {
        const level = duration > VERY_SLOW_QUERY_THRESHOLD ? 'warn' :
                     duration > SLOW_QUERY_THRESHOLD ? 'info' : 'debug';

        logger.log(level, 'Database query completed', {
          queryId,
          sql: sql.substring(0, 200),
          rowCount: rows?.length,
          duration,
          performance: duration > SLOW_QUERY_THRESHOLD ? 'slow' : 'normal'
        });
      }

      logDatabaseQuery(sql, params, duration);
      callback(err, rows);
    };

    return retryDatabaseOperation(() => {
      return new Promise((resolve, reject) => {
        originalAll(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }).then(rows => wrappedCallback(null, rows))
      .catch(err => wrappedCallback(err, null));
  };

  const originalGet = db.get.bind(db);
  db.get = function(sql, params, callback) {
    const start = Date.now();
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug('Database get query started', {
      queryId,
      sql: sql.substring(0, 200),
      params: params?.slice(0, 5)
    });

    const wrappedCallback = (err, row) => {
      const duration = Date.now() - start;

      if (err) {
        logger.error('Database get query failed', {
          queryId,
          sql: sql.substring(0, 200),
          duration,
          error: err.message,
          params: params?.slice(0, 5)
        });
      } else {
        const level = duration > VERY_SLOW_QUERY_THRESHOLD ? 'warn' :
                     duration > SLOW_QUERY_THRESHOLD ? 'info' : 'debug';

        logger.log(level, 'Database get query completed', {
          queryId,
          sql: sql.substring(0, 200),
          hasResult: !!row,
          duration,
          performance: duration > SLOW_QUERY_THRESHOLD ? 'slow' : 'normal'
        });
      }

      logDatabaseQuery(sql, params, duration);
      callback(err, row);
    };

    return retryDatabaseOperation(() => {
      return new Promise((resolve, reject) => {
        originalGet(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }).then(row => wrappedCallback(null, row))
      .catch(err => wrappedCallback(err, null));
  };
}

process.on('SIGINT', () => {
  logger.info('Received SIGINT, closing database connection');
  db.close((err) => {
    if (err) {
      logger.error('Error closing database', { error: err.message });
    } else {
      logger.info('Database connection closed');
    }
  });
});

module.exports = db;
