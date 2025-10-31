const request = require('supertest');
const app = require('../server');

describe('Server', () => {
  describe('GET /', () => {
    it('should return OK for Google health check', async () => {
      const response = await request(app)
        .get('/')
        .set('User-Agent', 'GoogleHC/1.0');

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });

    it('should serve index.html for regular requests', async () => {
      const response = await request(app)
        .get('/')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
    });
  });

  describe('GET /api/version', () => {
    it('should return version information', async () => {
      const response = await request(app)
        .get('/api/version');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('buildHash');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /{*path}', () => {
    it('should return 404 for API routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should return 404 for static files', async () => {
      const response = await request(app)
        .get('/assets/nonexistent.js');

      expect(response.status).toBe(404);
    });
  });
});

describe('Domain redirection middleware', () => {
    it('should redirect from old Replit domain to new domain', async () => {
      const response = await request(app)
        .get('/some-path')
        .set('Host', 'ouvamafrance.replit.app');

      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('https://mafrance.app/some-path');
    });

    it('should not redirect for other domains', async () => {
      const response = await request(app)
        .get('/some-path')
        .set('Host', 'localhost:3000');

      // Should continue to normal processing
      expect(response.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    it('should handle 404 for non-existent API routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should serve index.html for client-side routes', async () => {
      const response = await request(app)
        .get('/some-client-route');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
    });
  });

  describe('CORS configuration', () => {
    it('should allow requests from allowed origins in production', async () => {
      // Set production environment
      process.env.NODE_ENV = 'production';

      // Create new app instance with production CORS
      delete require.cache[require.resolve('../server')];
      const prodApp = require('../server');

      const response = await request(prodApp)
        .options('/api/version')
        .set('Origin', 'https://mafrance.app');

      expect(response.status).toBe(204); // OPTIONS returns 204
      expect(response.headers['access-control-allow-origin']).toBe('https://mafrance.app');
    });

    it('should allow all origins in development', async () => {
      // Ensure development environment
      process.env.NODE_ENV = 'development';

      // Create new app instance with development CORS
      delete require.cache[require.resolve('../server')];
      const devApp = require('../server');

      const response = await request(devApp)
        .options('/api/version')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(204); // OPTIONS returns 204
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });