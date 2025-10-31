
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { createDbHandler, DatabaseError, NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { cacheMiddleware } = require('../middleware/cache');
const {
  validateDepartement,
  validateCOG
} = require('../middleware/validate');
const { HTTP_NOT_FOUND, HTTP_BAD_REQUEST, HTTP_INTERNAL_SERVER_ERROR } = require('../constants');

// Function to compute percentage fields from raw NAT1 data
const computePercentageFields = (row) => {
  if (!row) {
    return null;
  }

  const ensemble = parseFloat(row.Ensemble) || 0;
  if (ensemble === 0) {
    return null;
  } // Avoid division by zero

  const etrangers = parseFloat(row.Etrangers) || 0;
  const francais_de_naissance = parseFloat(row.Francais_de_naissance) || 0;
  const francais_par_acquisition = parseFloat(row.Francais_par_acquisition) || 0;

  // European nationalities
  const portugais = parseFloat(row.Portugais) || 0;
  const italiens = parseFloat(row.Italiens) || 0;
  const espagnols = parseFloat(row.Espagnols) || 0;
  const autres_ue = parseFloat(row.Autres_nationalites_de_l_UE) || 0;
  const autres_europe = parseFloat(row.Autres_nationalites_d_Europe) || 0;

  // Maghreb and Turkey
  const algeriens = parseFloat(row.Algeriens) || 0;
  const marocains = parseFloat(row.Marocains) || 0;
  const tunisiens = parseFloat(row.Tunisiens) || 0;
  const turcs = parseFloat(row.Turcs) || 0;

  // Other African nationalities
  const autres_afrique = parseFloat(row.Autres_nationalites_d_Afrique) || 0;

  // Other nationalities
  const autres_nationalites = parseFloat(row.Autres_nationalites) || 0;

  // Calculate percentages and multiply by 100, round to 2 decimal places
  const result = {
    Type: row.Type,
    country: row.Code, // Rename Code to country for consistency with other country data
    Ensemble: ensemble,
    etrangers_pct: parseFloat(((etrangers / ensemble) * 100).toFixed(2)),
    francais_de_naissance_pct: parseFloat(((francais_de_naissance / ensemble) * 100).toFixed(2)),
    naturalises_pct: parseFloat(((francais_par_acquisition / ensemble) * 100).toFixed(2)),
    europeens_pct: parseFloat((((portugais + italiens + espagnols + autres_ue + autres_europe) / ensemble) * 100).toFixed(2)),
    maghrebins_pct: parseFloat((((algeriens + marocains + tunisiens + turcs) / ensemble) * 100).toFixed(2)),
    africains_pct: parseFloat(((autres_afrique / ensemble) * 100).toFixed(2)),
    autres_nationalites_pct: parseFloat(((autres_nationalites / ensemble) * 100).toFixed(2)),
    non_europeens_pct: parseFloat((((algeriens + marocains + tunisiens + turcs + autres_afrique + autres_nationalites) / ensemble) * 100).toFixed(2))
  };

  return result;
};

// GET /api/nat1/country
router.get('/country', cacheMiddleware(() => 'nat1_country_all'), (req, res, next) => {
  const handleDbError = createDbHandler(res, next);
  db.all(
    'SELECT * FROM country_nat1 ORDER BY Code',
    [],
    (err, rows) => {
      if (err) {
        return handleDbError(err);
      }
      if (!rows || rows.length === 0) {
        return next(new NotFoundError('Données NAT1 non trouvées'));
      }

      const result = rows.map(row => computePercentageFields(row)).filter(Boolean);

      res.json(result);
    }
  );
});

// GET /api/nat1/departement
router.get('/departement', validateDepartement, cacheMiddleware((req) => `nat1_dept_${req.query.dept}`), (req, res, next) => {
  const { dept } = req.query;

  if (!dept) {
    return next(new ValidationError('Paramètre dept requis'));
  }

  // Normalize department code for consistency
  const normalizedDept = /^\d+$/.test(dept) && dept.length < 2 ? dept.padStart(2, '0') : dept;

  db.get(
    'SELECT * FROM department_nat1 WHERE Code = ?',
    [normalizedDept],
     (err, row) => {
       if (err) {
         return next(new DatabaseError('Erreur lors de la récupération des données NAT1', err.message, { dept: normalizedDept }));
       }
       if (!row) {
         return next(new NotFoundError('Données NAT1 non trouvées pour ce département', { dept: normalizedDept }));
       }

       const computedData = computePercentageFields(row);
       if (!computedData) {
         return next(new DatabaseError('Erreur lors du calcul des pourcentages'));
       }

      res.json(computedData);
    }
  );
});

// GET /api/nat1/commune
router.get('/commune', validateCOG, cacheMiddleware((req) => `nat1_commune_${req.query.cog}`), (req, res, next) => {
  const { cog } = req.query;

  db.get(
    'SELECT * FROM commune_nat1 WHERE Code = ?',
    [cog],
     (err, row) => {
       if (err) {
         return next(new DatabaseError('Erreur lors de la récupération des données NAT1', err.message, { cog }));
       }
       if (!row) {
         return next(new NotFoundError('Données NAT1 non trouvées pour cette commune', { cog }));
       }

       const computedData = computePercentageFields(row);
       if (!computedData) {
         return next(new DatabaseError('Erreur lors du calcul des pourcentages'));
       }

      res.json(computedData);
    }
  );
});

module.exports = router;
