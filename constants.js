// HTTP Status Codes
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_MOVED_PERMANENTLY = 301;

// Other constants
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 1000000;
const SERVER_PORT = 3000;
const MAX_PAGINATION_LIMIT = 2000;
const MAX_POPULATION_RANGE = 1000000; // Maximum population for range validation
const MAX_POPULATION = 10000000; // Maximum population for filtering
const MAX_LIEU_LENGTH = 100;
const MIN_SEARCH_QUERY_LENGTH = 2;
const DEPARTMENT_RANKINGS_LIMIT = 101; // Default limit for department rankings
const RATE_LIMIT_WINDOW_MINUTES = 60; // Rate limit window in minutes
const GLOBAL_SEARCH_LIMIT = 15; // Default limit for global commune search
const ESLINT_COMPLEXITY_LIMIT = 20; // ESLint complexity rule limit
const ESLINT_MAX_PARAMS = 6; // ESLint max-params rule limit
const DISTANCE_CONVERSION_FACTOR = 111.32; // Rough conversion factor for degrees to km

module.exports = {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_MOVED_PERMANENTLY,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SERVER_PORT,
  MAX_PAGINATION_LIMIT,
  MAX_POPULATION_RANGE,
  MAX_POPULATION,
  MAX_LIEU_LENGTH,
  MIN_SEARCH_QUERY_LENGTH,
  DEPARTMENT_RANKINGS_LIMIT,
  RATE_LIMIT_WINDOW_MINUTES,
  GLOBAL_SEARCH_LIMIT,
  ESLINT_COMPLEXITY_LIMIT,
  ESLINT_MAX_PARAMS,
  DISTANCE_CONVERSION_FACTOR
};