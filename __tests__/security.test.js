const request = require('supertest');
const express = require('express');
const { uploadLimiter, sanitizeInput } = require('../middleware/security');

const app = express();
app.use(express.json());

describe('Security Middleware', () => {
  describe('uploadLimiter', () => {
    beforeEach(() => {
      // Create a fresh app for each test to avoid rate limit state
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/upload', uploadLimiter, (req, res) => res.json({ success: true }));
      app.use('/upload', uploadLimiter, (req, res) => res.json({ success: true }));
    });

    test('should allow requests within rate limit', async () => {
      const response = await request(app)
        .post('/upload')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('should have rate limit configuration', () => {
      expect(uploadLimiter).toBeDefined();
      // The middleware should be a function
      expect(typeof uploadLimiter).toBe('function');
    });
  });

  describe('sanitizeInput', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        query: {},
        body: {},
        params: {}
      };
      mockRes = {};
      mockNext = jest.fn();
    });

    test('should pass through clean input unchanged', () => {
      mockReq.query = { search: 'paris' };
      mockReq.body = { name: 'John', age: 30 };
      mockReq.params = { id: '123' };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.query).toEqual({ search: 'paris' });
      expect(mockReq.body).toEqual({ name: 'John', age: 30 });
      expect(mockReq.params).toEqual({ id: '123' });
      expect(mockNext).toHaveBeenCalled();
    });

    test('should sanitize script tags from strings', () => {
      mockReq.query = { input: '<script>alert("xss")</script>Hello' };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.query.input).toBe('Hello');
    });

    test('should sanitize javascript: protocol', () => {
      mockReq.body = { url: 'javascript:alert("xss")' };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.url).toBe('alert("xss")');
    });

    test('should sanitize event handlers', () => {
      mockReq.params = { attr: 'onclick=alert("xss")' };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.params.attr).toBe('alert("xss")');
    });

    test('should sanitize complex script tags', () => {
      mockReq.query = {
        input: '<script type="text/javascript">evil();</script><p>Safe content</p>'
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.query.input).toBe('<p>Safe content</p>');
    });

    test('should sanitize nested objects', () => {
      mockReq.body = {
        user: {
          name: 'John',
          bio: '<script>hack()</script>Nice guy'
        },
        comments: [
          'Good post',
          '<script>alert("xss")</script>Bad comment'
        ]
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.user.name).toBe('John');
      expect(mockReq.body.user.bio).toBe('Nice guy');
      expect(mockReq.body.comments[0]).toBe('Good post');
      expect(mockReq.body.comments[1]).toBe('Bad comment');
    });

    test('should handle non-string values', () => {
      mockReq.query = {
        number: 123,
        boolean: true,
        null: null,
        undefined: undefined,
        array: [1, 2, 3],
        object: { nested: 'value' }
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.query.number).toBe(123);
      expect(mockReq.query.boolean).toBe(true);
      expect(mockReq.query.null).toBe(null);
      expect(mockReq.query.undefined).toBe(undefined);
      expect(mockReq.query.array).toEqual([1, 2, 3]);
      expect(mockReq.query.object).toEqual({ nested: 'value' });
    });

    test('should handle empty objects and arrays', () => {
      mockReq.body = {
        emptyObj: {},
        emptyArr: [],
        nested: {
          empty: {}
        }
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.emptyObj).toEqual({});
      expect(mockReq.body.emptyArr).toEqual([]);
      expect(mockReq.body.nested.empty).toEqual({});
    });

    test('should handle prototype pollution attempts', () => {
      mockReq.query = {
        '__proto__': { polluted: 'value' },
        'constructor': { prototype: { polluted: 'value' } },
        normal: 'safe'
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      // Should not have polluted Object.prototype
      expect({}.polluted).toBeUndefined();
      expect(mockReq.query.normal).toBe('safe');
      // The polluted properties should still exist in the query object
      expect(mockReq.query.__proto__).toEqual({ polluted: 'value' });
    });

    test('should sanitize multiple event handlers', () => {
      mockReq.body = {
        html: 'onclick=evil() onload=moreEvil() data-safe="ok"'
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.html).toBe('evil() moreEvil() data-safe="ok"');
    });

    test('should handle strings with special characters', () => {
      mockReq.query = {
        search: 'café & résumé <test>'
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.query.search).toBe('café & résumé <test>');
    });

    test('should sanitize case-insensitive script tags', () => {
      mockReq.params = {
        data: '<SCRIPT>alert("xss")</SCRIPT><div>safe</div>'
      };

      sanitizeInput(mockReq, mockRes, mockNext);

      expect(mockReq.params.data).toBe('<div>safe</div>');
    });

    test('should handle null and undefined req properties', () => {
      const reqWithoutProps = {};

      sanitizeInput(reqWithoutProps, mockRes, mockNext);

      expect(reqWithoutProps.query).toBeUndefined();
      expect(reqWithoutProps.body).toBeUndefined();
      expect(reqWithoutProps.params).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Integration with Express', () => {
    test('sanitizeInput should work as Express middleware', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use(sanitizeInput);
      testApp.post('/test', (req, res) => {
        res.json({
          query: req.query,
          body: req.body,
          params: req.params
        });
      });

      const response = await request(testApp)
        .post('/test?input=safe')
        .send({
          comment: '<script>alert("xss")</script>Safe comment',
          safe: 'This is safe'
        });

      expect(response.status).toBe(200);
      expect(response.body.query.input).toBe('safe'); // Should not be sanitized as it's not XSS
      expect(response.body.body.comment).toBe('Safe comment'); // Script tags should be removed
      expect(response.body.body.safe).toBe('This is safe');
    });
  });
});