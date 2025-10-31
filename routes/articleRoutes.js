const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { createDbHandler } = require('../middleware/errorHandler');
const {
  validateCOG,
  validateLieu,
  validateOptionalDepartement,
  validateDepartement,
  validateOptionalCOG
} = require('../middleware/validate');

// Base condition for articles with at least one category flag
const getBaseCondition = (hasDept) => {
  if (hasDept) {
    return 'departement = ? AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)';
  }
  return '(insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)';
};

// Helper function to build count query
function buildCountQuery(dept, cog, lieu) {
  const baseCondition = getBaseCondition(!!dept);
  let countSql = `
  SELECT
    SUM(insecurite) as insecurite_count,
    SUM(immigration) as immigration_count,
    SUM(islamisme) as islamisme_count,
    SUM(defrancisation) as defrancisation_count,
    SUM(wokisme) as wokisme_count,
    COUNT(*) as total_count
  FROM articles
  WHERE ${baseCondition}`;
  const countParams = dept ? [dept] : [];

  if (cog) {
    countSql += ' AND cog = ?';
    countParams.push(cog);
  }
  if (lieu) {
    countSql += ' AND lieu LIKE ?';
    countParams.push(`%${lieu}%`);
  }

  return { countSql, countParams };
}

// Helper function to build articles query
function buildArticlesQuery(dept, cog, lieu, category, cursor, pageLimit) {
  const baseCondition = getBaseCondition(!!dept);
  let sql = `
  SELECT date, title, url, lieu, commune, departement, insecurite, immigration, islamisme, defrancisation, wokisme,
         rowid
  FROM articles
  WHERE ${baseCondition}`;
  const params = dept ? [dept] : [];

  if (cog) {
    sql += ' AND cog = ?';
    params.push(cog);
  }
  if (lieu) {
    sql += ' AND lieu LIKE ?';
    params.push(`%${lieu}%`);
  }

  // Add category filtering if specified and not 'tous'
  if (category && category !== 'tous') {
    const validCategories = ['insecurite', 'immigration', 'islamisme', 'defrancisation', 'wokisme'];
    if (validCategories.includes(category)) {
      sql += ` AND ${category} = 1`;
    }
  }

  // Add cursor-based pagination
  if (cursor) {
    sql += ' AND rowid > ?';
    params.push(cursor);
  }

  sql += ' ORDER BY rowid ASC LIMIT ?';
  params.push(pageLimit + 1); // Get one extra to check if there are more

  return { sql, params };
}

// Helper function to process count results
function processCountResults(countRow) {
  return {
    insecurite: countRow?.insecurite_count || 0,
    immigration: countRow?.immigration_count || 0,
    islamisme: countRow?.islamisme_count || 0,
    defrancisation: countRow?.defrancisation_count || 0,
    wokisme: countRow?.wokisme_count || 0,
    total: countRow?.total_count || 0
  };
}

// Helper function to process articles results
function processArticlesResults(rows, pageLimit) {
  const hasMore = rows.length > pageLimit;
  const articles = hasMore ? rows.slice(0, pageLimit) : rows;
  const nextCursor = hasMore && articles.length > 0 ? articles[articles.length - 1].rowid : null;

  // Remove rowid from response
  const cleanArticles = articles.map(row => {
    delete row.rowid;
    return row;
  });

  return {
    list: cleanArticles,
    pagination: {
      hasMore,
      nextCursor,
      limit: pageLimit
    }
  };
}

// GET /api/articles
router.get(
  '/',
  [validateOptionalDepartement, validateOptionalCOG, validateLieu],
  (req, res, next) => {
    const handleDbError = createDbHandler(res, next);
    const { dept, cog, lieu, category, cursor, limit = '20' } = req.query;
    const pageLimit = Math.min(parseInt(limit), 100);

    // Build count query
    const { countSql, countParams } = buildCountQuery(dept, cog, lieu);

    // Get counts first
    db.get(countSql, countParams, (err, countRow) => {
      if (err) {
        return handleDbError(err);
      }

      const counts = processCountResults(countRow);

      // Build articles query
      const { sql, params } = buildArticlesQuery(dept, cog, lieu, category, cursor, pageLimit);

      // Get articles
      db.all(sql, params, (articlesErr, rows) => {
        if (articlesErr) {
          return handleDbError(articlesErr);
        }

        const result = processArticlesResults(rows, pageLimit);
        res.json({
          ...result,
          counts
        });
      });
    });
  }
);

// GET /api/articles/counts
router.get(
  '/counts',
  [validateDepartement, validateOptionalCOG, validateLieu],
  (req, res, next) => {
    const handleDbError = createDbHandler(res, next);
    const { dept, cog, lieu } = req.query;

    const baseCondition = getBaseCondition(!!dept);

    let sql = `
    SELECT
      SUM(insecurite) as insecurite_count,
      SUM(immigration) as immigration_count,
      SUM(islamisme) as islamisme_count,
      SUM(defrancisation) as defrancisation_count,
      SUM(wokisme) as wokisme_count
    FROM articles
    WHERE ${getBaseCondition(true)}`;
    const params = [dept];

    if (cog) {
      sql += ' AND COG = ?';
      params.push(cog);
    }
    if (lieu) {
      sql += ' AND lieu LIKE ?';
      params.push(`%${lieu}%`);
    }

    db.get(sql, params, (err, row) => {
      if (err) {
        return handleDbError(err);
      }
      const result = {
        insecurite: row?.insecurite_count || 0,
        immigration: row?.immigration_count || 0,
        islamisme: row?.islamisme_count || 0,
        defrancisation: row?.defrancisation_count || 0,
        wokisme: row?.wokisme_count || 0
      };
      res.json(result);
    });
  }
);

// GET /api/articles/lieux
router.get(
  '/lieux',
  [validateCOG, validateLieu],
  (req, res, next) => {
    const handleDbError = createDbHandler(res, next);
    const { cog } = req.query;

    const sql = 'SELECT DISTINCT lieu FROM lieux WHERE cog = ? ORDER BY lieu';
    const params = [cog];

    db.all(sql, params, (err, rows) => {
      if (err) {
        return handleDbError(err);
      }
      const lieux = rows.map(row => ({ lieu: row.lieu }));
      res.json(lieux);
    });
  }
);

module.exports = router;
