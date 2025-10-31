const express = require('express');
const router = express.Router();
const db = require('../config/db');
const SearchService = require('../services/searchService');
const { cacheMiddleware } = require('../middleware/cache');
const {
  validateDepartement,
  validateCOG,
  validateSearchQuery
} = require('../middleware/validate');
const { HTTP_NOT_FOUND, DEFAULT_LIMIT } = require('../constants');
const { asyncHandler, NotFoundError, DatabaseError } = require('../middleware/errorHandler');
const { logger, logError } = require('../utils/logger');

// GET /api/communes
router.get('/', [validateDepartement, validateSearchQuery], asyncHandler(async(req, res) => {
  const { dept, q = '' } = req.query;

  try {
    const results = await SearchService.searchCommunes(dept, q, 10);
    res.json(results);
  } catch (error) {
    logError(error, { route: '/api/communes', dept, query: q });
    throw new DatabaseError('Erreur de service lors de la recherche de communes', error.message, { dept, query: q });
  }
}));

// GET /api/communes/suggestions - New endpoint for autocomplete
router.get('/suggestions', [validateDepartement, validateSearchQuery], asyncHandler(async(req, res) => {
  const { dept, q = '' } = req.query;

  try {
    const suggestions = await SearchService.getCommuneSuggestions(dept, q, 5);
    res.json(suggestions);
  } catch (error) {
    logError(error, { route: '/api/communes/suggestions', dept, query: q });
    throw new DatabaseError('Erreur de service lors de la récupération des suggestions', error.message, { dept, query: q });
  }
}));

// GET /api/communes/search - Global commune search endpoint
router.get('/search', [validateSearchQuery], asyncHandler(async(req, res) => {
  const { q = '' } = req.query;

  if (!q || q.length < 3) {
    return res.json([]);
  }

  try {
    const results = await SearchService.searchCommunesGlobally(q, DEFAULT_LIMIT);
    res.json(results);
  } catch (error) {
    logError(error, { route: '/api/communes/search', query: q });
    throw new DatabaseError('Erreur de service lors de la recherche globale', error.message, { query: q });
  }
}));

// GET /api/communes/all
router.get('/all', cacheMiddleware(() => 'communes:all'), (req, res, next) => {
  db.all(
    'SELECT COG, departement, commune, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k FROM locations',
    [],
    (err, rows) => {
      if (err) {
        logError(err, { route: '/api/communes/all' });
        return next(new DatabaseError('Erreur lors de la récupération de toutes les communes', err.message));
      }
      res.json(rows);
    }
  );
});

// GET /api/communes/names
router.get('/names', validateCOG, cacheMiddleware((req) => `communes:names:${req.query.cog}`), (req, res, next) => {
  const { cog } = req.query;
  db.get(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
     FROM commune_names
     WHERE COG = ? AND annais = (SELECT MAX(annais) FROM commune_names WHERE COG = ?)`,
    [cog, cog],
    (err, row) => {
      if (err) {
        logError(err, { route: '/api/communes/names', cog });
        return next(new DatabaseError('Erreur lors de la récupération des données de prénoms', err.message, { cog }));
      }
      if (!row) {
        return next(new NotFoundError('Données de prénoms non trouvées pour la dernière année', { cog }));
      }
      res.json(row);
    }
  );
});

// GET /api/communes/names_history
router.get('/names_history', validateCOG, cacheMiddleware((req) => `communes:names_history:${req.query.cog}`), (req, res, next) => {
  const { cog } = req.query;
  db.all(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
     FROM commune_names
     WHERE COG = ?
     ORDER BY annais ASC`,
    [cog],
    (err, rows) => {
      if (err) {
        logError(err, { route: '/api/communes/names_history', cog });
        return next(new DatabaseError('Erreur lors de la récupération de l\'historique des prénoms', err.message, { cog }));
      }
      res.json(rows);
    }
  );
});

// GET /api/communes/crime
router.get('/crime', validateCOG, cacheMiddleware((req) => `communes:crime:${req.query.cog}`), (req, res, next) => {
  const { cog } = req.query;
  db.get(
    `SELECT *
     FROM commune_crime
     WHERE COG = ? AND annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = ?)`,
    [cog, cog],
    (err, row) => {
      if (err) {
        logError(err, { route: '/api/communes/crime', cog });
        return next(new DatabaseError('Erreur lors de la récupération des données criminelles', err.message, { cog }));
      }
      if (!row) {
        return next(new NotFoundError('Données criminelles non trouvées pour la dernière année', { cog }));
      }
      res.json(row);
    }
  );
});

// GET /api/communes/crime_history
router.get('/crime_history', validateCOG, cacheMiddleware((req) => `communes:crime_history:${req.query.cog}`), (req, res, next) => {
  const { cog } = req.query;
  db.all(
    `SELECT *
     FROM commune_crime
     WHERE COG = ?
     ORDER BY annee ASC`,
    [cog],
    (err, rows) => {
      if (err) {
        logError(err, { route: '/api/communes/crime_history', cog });
        return next(new DatabaseError('Erreur lors de la récupération de l\'historique criminel', err.message, { cog }));
      }
      res.json(rows);
    }
  );
});

// GET /api/communes/details
router.get('/details', validateCOG, cacheMiddleware((req) => `communes:details:${req.query.cog}`), (req, res, next) => {
  const { cog } = req.query;
  db.get(
    'SELECT COG, departement, commune, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k FROM locations WHERE COG = ?',
    [cog],
    (err, row) => {
      if (err) {
        logError(err, { route: '/api/communes/details', cog });
        return next(new DatabaseError('Erreur lors de la récupération des détails de la commune', err.message, { cog }));
      }
      if (!row) {
        return next(new NotFoundError('Commune non trouvée', { cog }));
      }
      res.json(row);
    }
  );
});

const nuanceMap = {
  LEXG: 'Extrême gauche',
  LCOM: 'Parti Communiste',
  LFI: 'France Insoumise',
  LSOC: 'Parti Socialiste',
  LRDG: 'Parti radical de gauche',
  LDVG: 'Divers gauche',
  LUG: 'Liste d\'Union de la gauche',
  LVEC: 'Europe Ecologie',
  LECO: 'Liste autre écologiste',
  LDIV: 'Liste divers',
  LREG: 'Liste régionaliste',
  LGJ: 'Liste gilets jaunes',
  LREM: 'La République en marche',
  LMDM: 'Modem',
  LUDI: 'UDI',
  LUC: 'Liste union du centre',
  LDVC: 'Liste divers centre',
  LLR: 'Les Républicains',
  LUD: 'Liste union de la droite',
  LDVD: 'Liste divers droite',
  LDLF: 'Debout la France',
  LRN: 'Rassemblement National',
  LEXD: 'Liste d\'extrême droite',
  NC: ''
};

// GET /api/communes/maire
router.get('/maire', validateCOG, cacheMiddleware((req) => `communes:maire:${req.query.cog}`), (req, res, next) => {
  const { cog } = req.query;
  db.get(
    'SELECT cog, prenom, nom, date_mandat, famille_nuance, nuance_politique FROM maires WHERE cog = ?',
    [cog],
    (err, row) => {
      if (err) {
        logError(err, { route: '/api/communes/maire', cog });
        return next(new DatabaseError('Erreur lors de la récupération des informations du maire', err.message, { cog }));
      }
      if (!row) {
        return next(new NotFoundError('Maire non trouvé', { cog }));
      }

      // Map the nuance_politique code to its full description
      const response = {
        ...row,
        nuance_politique:
          nuanceMap[row.nuance_politique] || row.nuance_politique
      };

      res.json(response);
    }
  );
});

module.exports = router;