// Test data factories for consistent test data generation
const testDataFactory = {
  // Generate mock commune data
  createCommune: (overrides = {}) => ({
    COG: '01001',
    commune: 'Test Commune',
    departement: '01',
    population: 1000,
    insecurite_score: 5.5,
    immigration_score: 3.2,
    islamisation_score: 2.1,
    defrancisation_score: 1.8,
    wokisme_score: 4.3,
    number_of_mosques: 2,
    mosque_p100k: 0.2,
    total_qpv: 1,
    pop_in_qpv_pct: 15.5,
    Total_places_migrants: 50,
    places_migrants_p1k: 50,
    total_score: 3.38,
    musulman_pct: 8.5,
    violences_physiques_p1k: 25.3,
    violences_sexuelles_p1k: 1.2,
    vols_p1k: 45.6,
    destructions_p1k: 12.8,
    stupefiants_p1k: 8.9,
    escroqueries_p1k: 3.4,
    extra_europeen_pct: 12.3,
    prenom_francais_pct: 75.2,
    total_subventions_parHab: 150.5,
    etrangers_pct: 8.2,
    francais_de_naissance_pct: 85.1,
    naturalises_pct: 2.3,
    europeens_pct: 4.5,
    maghrebins_pct: 6.8,
    africains_pct: 3.2,
    autres_nationalites_pct: 1.2,
    non_europeens_pct: 11.2,
    famille_nuance: 'Droite',
    ...overrides
  }),

  // Generate mock department data
  createDepartment: (overrides = {}) => ({
    departement: '01',
    population: 100000,
    logements_sociaux_pct: 12.5,
    insecurite_score: 5.5,
    immigration_score: 3.2,
    islamisation_score: 2.1,
    defrancisation_score: 1.8,
    wokisme_score: 4.3,
    number_of_mosques: 15,
    mosque_p100k: 0.15,
    total_qpv: 25,
    pop_in_qpv_pct: 18.5,
    Total_places_migrants: 500,
    places_migrants_p1k: 5,
    total_score: 3.38,
    musulman_pct: 8.5,
    violences_physiques_p1k: 25.3,
    violences_sexuelles_p1k: 1.2,
    vols_p1k: 45.6,
    destructions_p1k: 12.8,
    stupefiants_p1k: 8.9,
    escroqueries_p1k: 3.4,
    extra_europeen_pct: 12.3,
    prenom_francais_pct: 75.2,
    total_subventions_parHab: 150.5,
    etrangers_pct: 8.2,
    francais_de_naissance_pct: 85.1,
    naturalises_pct: 2.3,
    europeens_pct: 4.5,
    maghrebins_pct: 6.8,
    africains_pct: 3.2,
    autres_nationalites_pct: 1.2,
    non_europeens_pct: 11.2,
    ...overrides
  }),

  // Generate mock country data
  createCountry: (overrides = {}) => ({
    country: 'France',
    population: 67000000,
    logements_sociaux_pct: 17.2,
    insecurite_score: 4.8,
    immigration_score: 3.5,
    islamisation_score: 2.8,
    defrancisation_score: 2.2,
    wokisme_score: 4.1,
    number_of_mosques: 2500,
    mosque_p100k: 0.37,
    total_qpv: 1500,
    pop_in_qpv_pct: 12.8,
    total_places_migrants: 25000,
    places_migrants_p1k: 0.37,
    ...overrides
  }),

  // Generate mock mosque data
  createMosque: (overrides = {}) => ({
    id: 1,
    nom: 'Mosquée Test',
    adresse: '123 Rue de Test',
    code_postal: '75001',
    commune: 'Paris',
    departement: '75',
    region: 'Île-de-France',
    latitude: 48.8566,
    longitude: 2.3522,
    superficie: 500,
    capacite: 1000,
    association: 'Association Test',
    telephone: '01 23 45 67 89',
    email: 'contact@test.fr',
    site_web: 'https://test.fr',
    ...overrides
  }),

  // Generate mock QPV data
  createQPV: (overrides = {}) => ({
    code_qpv: 'QP001001',
    nom_qpv: 'QPV Test',
    commune_qpv: 'Test Commune',
    code_insee: '01001',
    nom_commune: 'Test',
    code_dept: '01',
    nom_dept: 'Ain',
    popMuniQPV: 1500,
    surfaceQPV: 25.5,
    ...overrides
  }),

  // Generate arrays of test data
  createCommunes: (count, baseOverrides = {}) =>
    Array.from({ length: count }, (_, i) =>
      testDataFactory.createCommune({
        ...baseOverrides,
        COG: `0100${i + 1}`,
        commune: `Test Commune ${i + 1}`,
      })
    ),

  createDepartments: (count, baseOverrides = {}) =>
    Array.from({ length: count }, (_, i) =>
      testDataFactory.createDepartment({
        ...baseOverrides,
        departement: String(i + 1).padStart(2, '0'),
      })
    ),

  createMosques: (count, baseOverrides = {}) =>
    Array.from({ length: count }, (_, i) =>
      testDataFactory.createMosque({
        ...baseOverrides,
        id: i + 1,
        nom: `Mosquée Test ${i + 1}`,
      })
    ),

  // Generate mock database responses
  createMockDbResponse: (data, error = null) => ({
    data,
    error,
    timestamp: Date.now(),
  }),

  // Generate mock cache responses
  createMockCacheResponse: (data, totalCount = null) => ({
    data: Array.isArray(data) ? data : [data],
    total_count: totalCount || (Array.isArray(data) ? data.length : 1),
  }),

  // Generate mock validation errors
  createValidationError: (field, message, value = 'test') => ({
    type: 'field',
    value,
    msg: message,
    path: field,
    location: 'query',
  }),

  // Generate mock request objects
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    url: '/api/test',
    headers: {
      'user-agent': 'test-agent',
      'x-correlation-id': 'test-correlation-id',
    },
    query: {},
    params: {},
    body: {},
    ip: '127.0.0.1',
    correlationId: 'test-correlation-id',
    ...overrides,
  }),

  // Generate mock response objects
  createMockResponse: (overrides = {}) => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    ...overrides,
  }),
};

module.exports = testDataFactory;