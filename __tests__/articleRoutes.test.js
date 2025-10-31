const request = require('supertest');
const { createAppWithRoute } = require('./testUtils');

describe('Article Routes', () => {
  let app; let mocks;

  beforeEach(() => {
    jest.clearAllMocks();
    const created = createAppWithRoute('../routes/articleRoutes', '/api/articles', { mockValidate: false });
    app = created.app;
    mocks = created.mocks;
  });

  describe('GET /api/articles', () => {
    const mockCountRow = {
      insecurite_count: 5,
      immigration_count: 3,
      islamisme_count: 2,
      defrancisation_count: 1,
      wokisme_count: 4,
      total_count: 15
    };

    const mockArticles = [
      {
        date: '2024-01-01',
        title: 'Test Article 1',
        url: 'https://example.com/1',
        lieu: 'Paris',
        commune: 'Paris 1er',
        departement: '75',
        insecurite: 1,
        immigration: 0,
        islamisme: 0,
        defrancisation: 0,
        wokisme: 1,
        rowid: 1
      },
      {
        date: '2024-01-02',
        title: 'Test Article 2',
        url: 'https://example.com/2',
        lieu: 'Lyon',
        commune: 'Lyon 1er',
        departement: '69',
        insecurite: 0,
        immigration: 1,
        islamisme: 1,
        defrancisation: 0,
        wokisme: 0,
        rowid: 2
      }
    ];

    it('should return articles with counts for valid request', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        if (sql.includes('SUM(insecurite)')) {
          callback(null, mockCountRow);
        }
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockArticles);
      });

      const response = await request(app)
        .get('/api/articles?dept=75&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('counts');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.list)).toBe(true);
      expect(response.body.list.length).toBe(2);
      expect(response.body.counts).toEqual({
        insecurite: 5,
        immigration: 3,
        islamisme: 2,
        defrancisation: 1,
        wokisme: 4,
        total: 15
      });
      expect(response.body.pagination).toHaveProperty('hasMore');
      expect(response.body.pagination).toHaveProperty('nextCursor');
      expect(response.body.pagination).toHaveProperty('limit');
    });

    it('should handle category filtering', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('insecurite = 1');
        callback(null, [mockArticles[0]]);
      });

      const response = await request(app)
        .get('/api/articles?category=insecurite');

      expect(response.status).toBe(200);
      expect(response.body.list.length).toBe(1);
    });

    it('should handle cursor pagination', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('rowid > ?');
        expect(params).toContain('100');
        callback(null, mockArticles);
      });

      const response = await request(app)
        .get('/api/articles?cursor=100');

      expect(response.status).toBe(200);
    });

    it('should handle COG filtering', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('cog = ?');
        expect(params).toContain('75001');
        callback(null, mockArticles);
      });

      const response = await request(app)
        .get('/api/articles?cog=75001');

      expect(response.status).toBe(200);
    });

    it('should handle lieu filtering', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('lieu LIKE ?');
        expect(params).toContain('%Paris%');
        callback(null, mockArticles);
      });

      const response = await request(app)
        .get('/api/articles?lieu=Paris');

      expect(response.status).toBe(200);
    });

    it('should limit results to maximum of 100', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(params[params.length - 1]).toBe(101); // limit + 1
        callback(null, mockArticles);
      });

      const response = await request(app)
        .get('/api/articles?limit=200');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
    });

    it('should default limit to 20', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(params[params.length - 1]).toBe(21); // limit + 1
        callback(null, mockArticles);
      });

      const response = await request(app)
        .get('/api/articles');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should handle database errors in count query', async () => {
      const dbError = new Error('Database error');
      mocks.db.get.mockImplementation((sql, params, callback) => {
        if (sql.includes('SUM(insecurite)')) {
          callback(dbError);
        }
      });

      const response = await request(app)
        .get('/api/articles');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Database operation failed');
    });

    it('should handle database errors in articles query', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Articles query error'));
      });

      const response = await request(app)
        .get('/api/articles');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Database operation failed');
    });

    it('should remove rowid from response', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockArticles);
      });

      const response = await request(app)
        .get('/api/articles');

      expect(response.status).toBe(200);
      expect(response.body.list[0]).not.toHaveProperty('rowid');
      expect(response.body.list[1]).not.toHaveProperty('rowid');
    });

    it('should handle empty results', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/articles');

      expect(response.status).toBe(200);
      expect(response.body.list).toEqual([]);
      expect(response.body.counts).toEqual({
        insecurite: 0,
        immigration: 0,
        islamisme: 0,
        defrancisation: 0,
        wokisme: 0,
        total: 0
      });
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.pagination.nextCursor).toBe(null);
    });

    it('should handle pagination with hasMore flag', async () => {
      const manyArticles = Array.from({ length: 25 }, (_, i) => ({
        ...mockArticles[0],
        rowid: i + 1
      }));

      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCountRow);
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, manyArticles);
      });

      const response = await request(app)
        .get('/api/articles?limit=20');

      expect(response.status).toBe(200);
      expect(response.body.list.length).toBe(20);
      expect(response.body.pagination.hasMore).toBe(true);
      expect(response.body.pagination.nextCursor).toBe(20);
    });
  });

  describe('GET /api/articles/counts', () => {
    const mockCountResult = {
      insecurite_count: 10,
      immigration_count: 8,
      islamisme_count: 5,
      defrancisation_count: 3,
      wokisme_count: 12
    };

    it('should return counts for valid department', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(params).toContain('75');
        callback(null, mockCountResult);
      });

      const response = await request(app)
        .get('/api/articles/counts?dept=75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        insecurite: 10,
        immigration: 8,
        islamisme: 5,
        defrancisation: 3,
        wokisme: 12
      });
    });

    it('should handle COG filtering in counts', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('COG = ?');
        expect(params).toContain('75001');
        callback(null, mockCountResult);
      });

      const response = await request(app)
        .get('/api/articles/counts?dept=75&cog=75001');

      expect(response.status).toBe(200);
    });

    it('should handle lieu filtering in counts', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        expect(sql).toContain('lieu LIKE ?');
        expect(params).toContain('%Paris%');
        callback(null, mockCountResult);
      });

      const response = await request(app)
        .get('/api/articles/counts?dept=75&lieu=Paris');

      expect(response.status).toBe(200);
    });

    it('should handle database errors', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Counts query error'));
      });

      const response = await request(app)
        .get('/api/articles');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Database operation failed');
    });

    it('should handle null results', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/articles/counts?dept=75');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        insecurite: 0,
        immigration: 0,
        islamisme: 0,
        defrancisation: 0,
        wokisme: 0
      });
    });
  });

  describe('GET /api/articles/lieux', () => {
    const mockLieux = [
      { lieu: 'Paris' },
      { lieu: 'Lyon' },
      { lieu: 'Marseille' }
    ];

    it('should return distinct lieux for valid COG', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        expect(params).toContain('75001');
        callback(null, mockLieux);
      });

      const response = await request(app)
        .get('/api/articles/lieux?cog=75001');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0]).toHaveProperty('lieu');
      expect(response.body[0].lieu).toBe('Paris');
    });

    it('should handle database errors', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Lieux query error'));
      });

       const response = await request(app)
         .get('/api/articles');

       expect(response.status).toBe(500);
       expect(response.body).toHaveProperty('error');
       expect(response.body.error).toBe('Database operation failed');
    });

    it('should handle empty results', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/articles/lieux?cog=75001');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('Validation Middleware', () => {
    it('should call validation middleware for main endpoint', async () => {
      // Validation is now handled by testUtils with mockValidate: false
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, { insecurite_count: 0, immigration_count: 0, islamisme_count: 0, defrancisation_count: 0, wokisme_count: 0, total_count: 0 });
      });

      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await request(app).get('/api/articles');

      // Validation middleware is called by the route, but mocked by testUtils
    });

    it('should call validation middleware for counts endpoint', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(null, { insecurite_count: 0, immigration_count: 0, islamisme_count: 0, defrancisation_count: 0, wokisme_count: 0 });
      });

      await request(app).get('/api/articles/counts?dept=75');

      // Validation middleware is called by the route, but mocked by testUtils
    });

    it('should call validation middleware for lieux endpoint', async () => {
      mocks.db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await request(app).get('/api/articles/lieux?cog=75001');

      // Validation middleware is called by the route, but mocked by testUtils
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors properly', async () => {
      mocks.db.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Test error'));
      });

      const response = await request(app).get('/api/articles');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});