const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const config = require('./config');
const { importScores } = require('./setup/importScores');
const { importArticles } = require('./setup/importArticles');
const { importElus } = require('./setup/importElus');
const { importNames } = require('./setup/importNames');
const { importCrimeData } = require('./setup/importCrimeData');
const { importQPV } = require('./setup/importQPV');
const { importQpvGeoJson } = require('./setup/importQpvGeoJson.js');
const { importSubventions } = require('./setup/importSubventions');
const { importMigrants } = require('./setup/importMigrants');
const { importNat1 } = require('./setup/importNat1');
const { importMosques } = require('./setup/importMosques');

const dbFile = config.database.path;

// Initialize SQLite database
function initializeDatabase() {
  // Create .data directory if it doesn't exist
  const path = require('path');
  const dbDir = path.dirname(dbFile);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created directory: ${dbDir}`);
  }

  if (fs.existsSync(dbFile)) {
    try {
      fs.unlinkSync(dbFile);
      console.log('Existing .data/france.db deleted');
    } catch (err) {
      console.error('Error deleting existing .data/france.db:', err.message);
      process.exit(1);
    }
  }
  return new sqlite3.Database(dbFile);
}

function runImports() {
  const db = initializeDatabase();

  importScores(db, (scoresErr) => {
    if (scoresErr) {
      console.error('Échec importation scores:', scoresErr.message);
      process.exit(1);
    }
    console.log('✓ Importation scores terminée');

    importArticles(db, (articlesErr) => {
      if (articlesErr) {
        console.error('Échec importation articles:', articlesErr.message);
        process.exit(1);
      }
      console.log('✓ Importation articles terminée');

      importElus(db, (elusErr) => {
        if (elusErr) {
          console.error('Échec importation élus:', elusErr.message);
          process.exit(1);
        }
        console.log('✓ Importation élus terminée');

        importNames(db, (namesErr) => {
          if (namesErr) {
            console.error('Échec importation noms:', namesErr.message);
            process.exit(1);
          }
          console.log('✓ Importation noms terminée');

          importCrimeData(db, (crimeErr) => {
            if (crimeErr) {
              console.error('Échec importation données criminalité:', crimeErr.message);
              process.exit(1);
            }
            console.log('✓ Importation données criminalité terminée');

            importQPV(db, (qpvErr) => {
              if (qpvErr) {
                console.error('Échec importation données QPV:', qpvErr.message);
                process.exit(1);
              }
              console.log('✓ Importation données QPV terminée');

              importQpvGeoJson(db, (geoJsonErr) => {
                if (geoJsonErr) {
                  console.error('Échec importation QPV GeoJSON:', geoJsonErr.message);
                  process.exit(1);
                }
                console.log('✓ Importation QPV GeoJSON terminée');

                importSubventions(db, (subventionsErr) => {
                  if (subventionsErr) {
                    console.error('Échec importation données subventions:', subventionsErr.message);
                    process.exit(1);
                  }
                  console.log('✓ Importation données subventions terminée');

                  importMigrants(db, (migrantsErr) => {
                    if (migrantsErr) {
                      console.error('Échec importation données centres migrants:', migrantsErr.message);
                      process.exit(1);
                    }
                    console.log('✓ Importation données centres migrants terminée');

                    importMosques(db, (mosquesErr) => {
                      if (mosquesErr) {
                        console.error('Échec importation données mosquées:', mosquesErr.message);
                        process.exit(1);
                      }
                      console.log('✓ Importation données mosquées terminée');

                      importNat1(db, (nat1Err) => {
                        if (nat1Err) {
                          console.error('Échec importation données NAT1:', nat1Err.message);
                          process.exit(1);
                        }
                        console.log('✓ Importation données NAT1 terminée');

                        // Create search indexes for better performance
                        createSearchIndexes()
                          .then(() => {
                            console.log('✓ Index de recherche créés');
                            console.log('🎉 Configuration de la base de données terminée !');
                            db.close();
                            process.exit(0);
                          })
                          .catch((indexErr) => {
                            console.error('Échec création des index:', indexErr.message);
                            db.close();
                            process.exit(1);
                          });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

runImports();

// Create indexes for better search performance
async function createSearchIndexes() {
  return new Promise((resolve, reject) => {
    const sqlite = require('sqlite3').verbose();
    const indexDb = new sqlite.Database(config.database.path);

    console.log('Creating search indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_locations_commune ON locations(commune)',
      'CREATE INDEX IF NOT EXISTS idx_locations_dept_commune ON locations(departement, commune)',
      'CREATE INDEX IF NOT EXISTS idx_locations_search ON locations(commune COLLATE NOCASE)'
    ];

    let completed = 0;

    indexes.forEach(indexQuery => {
      indexDb.run(indexQuery, (err) => {
        if (err) {
          console.error('Error creating index:', err);
          reject(err);
          return;
        }
        completed++;
        if (completed === indexes.length) {
          console.log('Search indexes created successfully');
          indexDb.close();
          resolve();
        }
      });
    });
  });
}