require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const db = require('./config/db');
const { HTTP_OK, HTTP_NOT_FOUND, HTTP_INTERNAL_SERVER_ERROR, HTTP_MOVED_PERMANENTLY, RATE_LIMIT_WINDOW_MINUTES } = require('./constants');
const { logger } = require('./utils/logger');
const { requestLogger } = require('./middleware/requestLogger');
const app = express();
const compression = require('compression');

// Enable compression
app.use(compression());

// Request correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  if (req.correlationId) {
    res.setHeader('x-correlation-id', req.correlationId);
  }
  next();
});

// Request logging middleware - logs all requests and responses with correlation IDs
app.use(requestLogger);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ?
    ['https://mafrance.app'] : // Replace with your actual domain
    true,
  credentials: true
}));

// Stricter rate limit for search endpoints
const searchLimiter = rateLimit({
  windowMs: 1 * RATE_LIMIT_WINDOW_MINUTES * 1000, // 1 minute
  max: 50, // 50 searches per minute
  message: 'Limite de recherche atteinte, veuillez attendre.'
});

// Domain redirection middleware
app.use((req, res, next) => {
  const host = req.get('host');

  // Redirect from old Replit domain to new custom domain
  if (host === 'ouvamafrance.replit.app') {
    const newUrl = `https://mafrance.app${req.originalUrl}`;
    return res.redirect(HTTP_MOVED_PERMANENTLY, newUrl);
  }

  next();
});

// Middleware
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Input sanitization
const { sanitizeInput } = require('./middleware/security');
app.use(sanitizeInput);

// Health check and root route
app.get('/', (req, res) => {
  if (req.headers['user-agent']?.includes('GoogleHC')) {
    return res.status(HTTP_OK).send('OK');
  }
  const filePath = path.resolve(__dirname, 'dist', 'index.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(HTTP_INTERNAL_SERVER_ERROR).json({ error: err.message, details: null });
    }
  });
});

app.use(
  express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
    }
  })
);

// Serve Vue.js built files
const publicPath = path.resolve(__dirname, 'dist');
app.use(express.static(publicPath));

// Routes
const articleRoutes = require('./routes/articleRoutes');
const communeRoutes = require('./routes/communeRoutes');
const countryRoutes = require('./routes/countryRoutes');
const departementRoutes = require('./routes/departementRoutes');
const migrantRoutes = require('./routes/migrantRoutes');
const mosqueRoutes = require('./routes/mosqueRoutes');
const otherRoutes = require('./routes/otherRoutes');
const qpvRoutes = require('./routes/qpvRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const subventionRoutes = require('./routes/subventionRoutes');
const cacheRoutes = require('./routes/cacheRoutes');
const nat1Routes = require('./routes/nat1Routes');

// Make database available to all routes
app.locals.db = db;

// Version endpoint for cache validation
app.get('/api/version', (_req, res) => {
  // Try to read build hash from built index.html
  let buildHash = process.env.BUILD_HASH;

  if (!buildHash) {
    try {
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        const hashMatch = indexContent.match(/window\.__BUILD_HASH__="([^"]+)"/);
        if (hashMatch) {
          buildHash = hashMatch[1];
        }
      }
    } catch {
      // Continue with fallback
    }
  }

  // Fallback to package version if no build hash found
  if (!buildHash) {
    buildHash = require('./package.json').version;
  }

  res.json({
    buildHash,
    timestamp: Date.now(),
    version: require('./package.json').version
  });
});

// Attach routes with search rate limiting where applicable
app.use('/api/communes', searchLimiter, communeRoutes.router || communeRoutes);
app.use('/api/departements', departementRoutes.router || departementRoutes);
app.use('/api/country', countryRoutes.router || countryRoutes);
app.use('/api/articles', articleRoutes.router || articleRoutes);
app.use('/api/qpv', qpvRoutes.router || qpvRoutes);
app.use('/api/rankings', rankingRoutes.router || rankingRoutes);
app.use('/api/subventions', subventionRoutes.router || subventionRoutes);
app.use('/api/migrants', migrantRoutes.router || migrantRoutes);
app.use('/api/mosques', mosqueRoutes.router || mosqueRoutes);
app.use('/api/nat1', nat1Routes.router || nat1Routes);
app.use('/api', otherRoutes.router || otherRoutes);
app.use('/api/cache', cacheRoutes.router || cacheRoutes);

// Handle Vue.js routing - serve index.html for non-API routes
app.get('/{*path}', (req, res) => {
  // Skip for API routes and static files
  if (req.originalUrl.startsWith('/api/') ||
      req.originalUrl.startsWith('/assets/') ||
      req.originalUrl.includes('.')) {
    return res.status(HTTP_NOT_FOUND).send('Not Found');
  }

  // Serve index.html for client-side routing
  const filePath = path.resolve(__dirname, 'dist', 'index.html');
  res.sendFile(filePath);
});

// Error handling
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
  logger.info('Server started successfully', {
    port: config.server.port,
    host: config.server.host,
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version,
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, initiating graceful shutdown');
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, initiating graceful shutdown');
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

module.exports = app;