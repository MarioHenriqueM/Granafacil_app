const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://granafacil:granafacil_dev@localhost:5433/granafacil_test?schema=public';

process.env['DATABASE_URL'] = TEST_DATABASE_URL;
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';
